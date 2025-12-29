from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'voiceclone_secret_key_2024')
JWT_ALGORITHM = "HS256"
ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'admin_super_secret_key')

# XTTS Server
XTTS_SERVER_URL = os.environ.get('XTTS_SERVER_URL', 'http://localhost:8001')
XTTS_ADMIN_KEY = os.environ.get('XTTS_ADMIN_KEY', '')

# HTTP Client for XTTS
http_client = httpx.AsyncClient(timeout=120.0)

# Create the main app
app = FastAPI(title="VoiceClone AI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    credits: int
    voice_clone_limit: int
    voice_clone_used: int
    plan_name: Optional[str] = None
    plan_expires_at: Optional[str] = None
    is_active: bool
    created_at: str

class AdminLogin(BaseModel):
    email: str
    password: str
    secret_key: str

class PlanCreate(BaseModel):
    name: str
    credits: int
    price: float
    voice_clone_limit: int
    expire_days: int
    is_active: bool = True

class PlanResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    credits: int
    price: float
    voice_clone_limit: int
    expire_days: int
    is_active: bool

class OrderCreate(BaseModel):
    plan_id: str
    payment_method: str
    transaction_id: str

class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_email: str
    user_name: str
    plan_id: str
    plan_name: str
    amount: float
    payment_method: str
    transaction_id: str
    status: str
    created_at: str

class VoiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    user_id: str
    is_public: bool
    created_at: str
    audio_url: Optional[str] = None

class GenerateVoiceRequest(BaseModel):
    voice_id: str
    voice_name: str
    text: str
    language: Optional[str] = "en"

class UserUpdateByAdmin(BaseModel):
    credits: Optional[int] = None
    plan_expires_at: Optional[str] = None
    is_blocked: Optional[bool] = None

class PaymentAccountCreate(BaseModel):
    method: str
    account_number: str
    account_name: str
    is_active: bool = True

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, is_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("is_blocked"):
            raise HTTPException(status_code=403, detail="Account blocked")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        admin = await db.admins.find_one({"id": payload.get("user_id")}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== USER AUTH ====================

@api_router.post("/auth/register")
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "name": user.name,
        "password": hash_password(user.password),
        "credits": 0,
        "voice_clone_limit": 0,
        "voice_clone_used": 0,
        "plan_name": None,
        "plan_expires_at": None,
        "is_active": True,
        "is_blocked": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_doc["id"])
    
    return {
        "token": token,
        "user": {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}
    }

@api_router.post("/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if db_user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Account blocked")
    
    token = create_token(db_user["id"])
    return {
        "token": token,
        "user": {k: v for k, v in db_user.items() if k not in ["password", "_id"]}
    }

@api_router.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k not in ["password"]}

# ==================== ADMIN AUTH ====================

@api_router.post("/admin/auth/login")
async def admin_login(data: AdminLogin):
    if data.secret_key != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid secret key")
    
    admin = await db.admins.find_one({"email": data.email})
    if not admin:
        # Create admin if not exists
        admin = {
            "id": str(uuid.uuid4()),
            "email": data.email,
            "password": hash_password(data.password),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admins.insert_one(admin)
    else:
        if not verify_password(data.password, admin["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin["id"], is_admin=True)
    return {"token": token, "admin": {"id": admin["id"], "email": admin["email"]}}

# ==================== PLANS ====================

@api_router.get("/plans", response_model=List[PlanResponse])
async def get_plans():
    plans = await db.plans.find({"is_active": True}, {"_id": 0}).to_list(100)
    return plans

@api_router.post("/admin/plans", response_model=PlanResponse)
async def create_plan(plan: PlanCreate, admin = Depends(get_admin_user)):
    plan_doc = {
        "id": str(uuid.uuid4()),
        **plan.model_dump()
    }
    await db.plans.insert_one(plan_doc)
    return {k: v for k, v in plan_doc.items() if k != "_id"}

@api_router.get("/admin/plans", response_model=List[PlanResponse])
async def get_all_plans(admin = Depends(get_admin_user)):
    plans = await db.plans.find({}, {"_id": 0}).to_list(100)
    return plans

@api_router.put("/admin/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(plan_id: str, plan: PlanCreate, admin = Depends(get_admin_user)):
    result = await db.plans.update_one(
        {"id": plan_id},
        {"$set": plan.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    updated = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/plans/{plan_id}")
async def delete_plan(plan_id: str, admin = Depends(get_admin_user)):
    result = await db.plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted"}

# ==================== ORDERS ====================

@api_router.post("/orders")
async def create_order(order: OrderCreate, user = Depends(get_current_user)):
    plan = await db.plans.find_one({"id": order.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    order_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user["name"],
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "amount": plan["price"],
        "credits": plan["credits"],
        "voice_clone_limit": plan["voice_clone_limit"],
        "expire_days": plan["expire_days"],
        "payment_method": order.payment_method,
        "transaction_id": order.transaction_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    return {k: v for k, v in order_doc.items() if k != "_id"}

@api_router.get("/orders")
async def get_user_orders(user = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/admin/orders")
async def get_all_orders(status: Optional[str] = None, admin = Depends(get_admin_user)):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.post("/admin/orders/{order_id}/approve")
async def approve_order(order_id: str, admin = Depends(get_admin_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail="Order already processed")
    
    # Update order status
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "approved"}})
    
    # Update user credits and plan
    expire_date = (datetime.now(timezone.utc) + timedelta(days=order["expire_days"])).isoformat()
    user = await db.users.find_one({"id": order["user_id"]})
    
    new_credits = user.get("credits", 0) + order["credits"]
    new_voice_limit = order["voice_clone_limit"]
    
    await db.users.update_one(
        {"id": order["user_id"]},
        {"$set": {
            "credits": new_credits,
            "voice_clone_limit": new_voice_limit,
            "plan_name": order["plan_name"],
            "plan_expires_at": expire_date
        }}
    )
    
    # Record credit transaction
    await db.credit_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["user_id"],
        "amount": order["credits"],
        "type": "purchase",
        "order_id": order_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Order approved", "order_id": order_id}

@api_router.post("/admin/orders/{order_id}/reject")
async def reject_order(order_id: str, admin = Depends(get_admin_user)):
    result = await db.orders.update_one(
        {"id": order_id, "status": "pending"},
        {"$set": {"status": "rejected"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found or already processed")
    return {"message": "Order rejected"}

# ==================== USER MANAGEMENT ====================

@api_router.get("/admin/users")
async def get_users(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    admin = Depends(get_admin_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, data: UserUpdateByAdmin, admin = Depends(get_admin_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin = Depends(get_admin_user)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Also delete user's voices
    await db.voices.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

@api_router.post("/admin/users/{user_id}/add-credits")
async def add_credits(user_id: str, credits: int, admin = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$inc": {"credits": credits}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Record transaction
    await db.credit_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount": credits,
        "type": "admin_add",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Added {credits} credits"}

# ==================== VOICES ====================

@api_router.get("/voices/my")
async def get_my_voices(user = Depends(get_current_user)):
    # Fetch from XTTS server
    try:
        response = await http_client.get(f"{XTTS_SERVER_URL}/voices/{user['id']}")
        if response.status_code == 200:
            xtts_voices = response.json()
            # Merge with our DB for additional metadata
            voices = []
            for v in xtts_voices:
                voice_doc = await db.voices.find_one(
                    {"user_id": user["id"], "voice_name": v.get("voice_name", v.get("name"))}, 
                    {"_id": 0}
                )
                voices.append({
                    "id": voice_doc["id"] if voice_doc else str(uuid.uuid4()),
                    "name": v.get("voice_name", v.get("name")),
                    "user_id": user["id"],
                    "is_public": v.get("public", False),
                    "created_at": voice_doc["created_at"] if voice_doc else datetime.now(timezone.utc).isoformat()
                })
            return voices
    except Exception as e:
        logger.error(f"XTTS server error: {e}")
    
    # Fallback to local DB
    voices = await db.voices.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return voices

@api_router.get("/voices/public")
async def get_public_voices():
    # Fetch public voices from XTTS admin endpoint
    try:
        headers = {"x-admin-key": XTTS_ADMIN_KEY} if XTTS_ADMIN_KEY else {}
        response = await http_client.get(f"{XTTS_SERVER_URL}/admin/voices", headers=headers)
        if response.status_code == 200:
            all_voices = response.json()
            # Filter public voices
            public_voices = [v for v in all_voices if v.get("public", False)]
            return [{
                "id": v.get("voice_id", str(uuid.uuid4())),
                "name": v.get("voice_name", "Unknown"),
                "user_id": v.get("user_id", "admin"),
                "is_public": True,
                "created_at": v.get("created_at", datetime.now(timezone.utc).isoformat())
            } for v in public_voices]
    except Exception as e:
        logger.error(f"XTTS server error: {e}")
    
    # Fallback to local DB
    voices = await db.voices.find({"is_public": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return voices

@api_router.post("/voices/clone")
async def clone_voice(
    name: str = Form(...),
    audio_file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    # Check voice clone limit
    if user["voice_clone_used"] >= user["voice_clone_limit"]:
        raise HTTPException(status_code=400, detail="Voice clone limit reached. Please upgrade your plan.")
    
    # Read audio file
    audio_data = await audio_file.read()
    
    # Call XTTS server /clone-voice endpoint
    try:
        files = {"audio": (audio_file.filename, audio_data, audio_file.content_type or "audio/wav")}
        data = {
            "user_id": user["id"],
            "voice_name": name
        }
        
        response = await http_client.post(
            f"{XTTS_SERVER_URL}/clone-voice",
            files=files,
            data=data
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("detail", "Voice cloning failed")
            raise HTTPException(status_code=response.status_code, detail=error_detail)
        
        result = response.json()
        voice_id = str(uuid.uuid4())
        
        # Store in our DB for tracking
        voice_doc = {
            "id": voice_id,
            "name": name,
            "voice_name": name,
            "user_id": user["id"],
            "is_public": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.voices.insert_one(voice_doc)
        
        # Update user voice count
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"voice_clone_used": 1}}
        )
        
        return {
            "id": voice_id, 
            "name": name, 
            "message": result.get("message", "Voice cloned successfully")
        }
        
    except httpx.RequestError as e:
        logger.error(f"XTTS server connection error: {e}")
        raise HTTPException(status_code=503, detail="Voice cloning service unavailable. Please try again later.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice cloning error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clone voice: {str(e)}")

@api_router.delete("/voices/{voice_id}")
async def delete_voice(voice_id: str, user = Depends(get_current_user)):
    voice = await db.voices.find_one({"id": voice_id, "user_id": user["id"]})
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    
    # Delete from XTTS server
    try:
        data = {
            "user_id": user["id"],
            "voice_name": voice.get("voice_name", voice.get("name"))
        }
        response = await http_client.post(f"{XTTS_SERVER_URL}/delete-voice", data=data)
        if response.status_code != 200:
            logger.warning(f"XTTS delete failed: {response.text}")
    except Exception as e:
        logger.error(f"XTTS delete error: {e}")
    
    # Delete from our DB
    await db.voices.delete_one({"id": voice_id})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"voice_clone_used": -1}})
    return {"message": "Voice deleted"}

@api_router.post("/voices/generate")
async def generate_voice(request: GenerateVoiceRequest, user = Depends(get_current_user)):
    # Check credits
    text_length = len(request.text)
    credits_needed = max(1, text_length // 10)  # 1 credit per 10 chars
    
    if user["credits"] < credits_needed:
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {credits_needed}, have {user['credits']}")
    
    voice = await db.voices.find_one({"id": request.voice_id})
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    
    # Check if user owns the voice or it's public
    if voice["user_id"] != user["id"] and not voice.get("is_public"):
        raise HTTPException(status_code=403, detail="Access denied to this voice")
    
    # Call XTTS server /tts endpoint
    try:
        # Determine user_id for XTTS (use voice owner's ID)
        xtts_user_id = voice["user_id"]
        voice_name = voice.get("voice_name", voice.get("name"))
        
        data = {
            "user_id": xtts_user_id,
            "voice_name": voice_name,
            "text": request.text,
            "language": request.language or "en"
        }
        
        response = await http_client.post(f"{XTTS_SERVER_URL}/tts", data=data)
        
        if response.status_code != 200:
            error_detail = response.json().get("detail", "TTS generation failed")
            raise HTTPException(status_code=response.status_code, detail=error_detail)
        
        result = response.json()
        audio_url = result.get("audio_url", "")
        
        # Prepend XTTS server URL if relative path
        if audio_url and not audio_url.startswith("http"):
            audio_url = f"{XTTS_SERVER_URL}{audio_url}"
        
        # Deduct credits
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"credits": -credits_needed}}
        )
        
        # Record usage
        generation_id = str(uuid.uuid4())
        await db.voice_generations.insert_one({
            "id": generation_id,
            "user_id": user["id"],
            "voice_id": request.voice_id,
            "voice_name": voice_name,
            "text": request.text,
            "text_length": text_length,
            "credits_used": credits_needed,
            "audio_url": audio_url,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Record credit transaction
        await db.credit_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "amount": -credits_needed,
            "type": "voice_generation",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "id": generation_id,
            "message": "Voice generated successfully",
            "credits_used": credits_needed,
            "audio_url": audio_url
        }
        
    except httpx.RequestError as e:
        logger.error(f"XTTS server connection error: {e}")
        raise HTTPException(status_code=503, detail="TTS service unavailable. Please try again later.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate voice: {str(e)}")

# ==================== ADMIN PUBLIC VOICES ====================

@api_router.post("/admin/voices/clone-public")
async def clone_public_voice(
    name: str = Form(...),
    audio_file: UploadFile = File(...),
    admin = Depends(get_admin_user)
):
    audio_data = await audio_file.read()
    
    # Clone voice via XTTS server with admin user_id
    try:
        files = {"audio": (audio_file.filename, audio_data, audio_file.content_type or "audio/wav")}
        data = {
            "user_id": "admin",
            "voice_name": name
        }
        
        response = await http_client.post(
            f"{XTTS_SERVER_URL}/clone-voice",
            files=files,
            data=data
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("detail", "Voice cloning failed")
            raise HTTPException(status_code=response.status_code, detail=error_detail)
        
        # Make it public via admin endpoint
        if XTTS_ADMIN_KEY:
            headers = {"x-admin-key": XTTS_ADMIN_KEY}
            public_data = {
                "user_id": "admin",
                "voice_name": name,
                "public": True
            }
            await http_client.post(f"{XTTS_SERVER_URL}/admin/voice-public", data=public_data, headers=headers)
        
        voice_id = str(uuid.uuid4())
        voice_doc = {
            "id": voice_id,
            "name": name,
            "voice_name": name,
            "user_id": "admin",
            "is_public": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.voices.insert_one(voice_doc)
        
        return {"id": voice_id, "name": name, "message": "Public voice created"}
        
    except httpx.RequestError as e:
        logger.error(f"XTTS server connection error: {e}")
        raise HTTPException(status_code=503, detail="Voice cloning service unavailable")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Public voice cloning error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create public voice: {str(e)}")

@api_router.delete("/admin/voices/{voice_id}")
async def delete_public_voice(voice_id: str, admin = Depends(get_admin_user)):
    voice = await db.voices.find_one({"id": voice_id, "is_public": True})
    if not voice:
        raise HTTPException(status_code=404, detail="Public voice not found")
    
    # Delete from XTTS server
    try:
        if XTTS_ADMIN_KEY:
            headers = {"x-admin-key": XTTS_ADMIN_KEY}
            data = {
                "user_id": voice.get("user_id", "admin"),
                "voice_id": voice_id
            }
            await http_client.post(f"{XTTS_SERVER_URL}/admin/delete-voice", data=data, headers=headers)
    except Exception as e:
        logger.error(f"XTTS admin delete error: {e}")
    
    await db.voices.delete_one({"id": voice_id})
    return {"message": "Voice deleted"}

# ==================== ADMIN STATS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(admin = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"plan_name": {"$ne": None}})
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Credits stats
    credit_pipeline = [
        {"$match": {"type": "purchase"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    sold_credits = await db.credit_transactions.aggregate(credit_pipeline).to_list(1)
    total_credits_sold = sold_credits[0]["total"] if sold_credits else 0
    
    usage_pipeline = [
        {"$match": {"type": "voice_generation"}},
        {"$group": {"_id": None, "total": {"$sum": {"$abs": "$amount"}}}}
    ]
    used_credits = await db.credit_transactions.aggregate(usage_pipeline).to_list(1)
    total_credits_used = used_credits[0]["total"] if used_credits else 0
    
    # Voice generations
    total_generations = await db.voice_generations.count_documents({})
    
    # Revenue
    revenue_pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue[0]["total"] if revenue else 0
    
    # GPU usage (simulated)
    gpu_usage = {
        "current": 45,
        "memory_used": 6.2,
        "memory_total": 16,
        "temperature": 62
    }
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_credits_sold": total_credits_sold,
        "total_credits_used": total_credits_used,
        "total_generations": total_generations,
        "total_revenue": total_revenue,
        "gpu_usage": gpu_usage
    }

# ==================== PAYMENT ACCOUNTS ====================

@api_router.get("/admin/payment-accounts")
async def get_payment_accounts(admin = Depends(get_admin_user)):
    accounts = await db.payment_accounts.find({}, {"_id": 0}).to_list(100)
    return accounts

@api_router.post("/admin/payment-accounts")
async def create_payment_account(account: PaymentAccountCreate, admin = Depends(get_admin_user)):
    account_doc = {
        "id": str(uuid.uuid4()),
        **account.model_dump()
    }
    await db.payment_accounts.insert_one(account_doc)
    return {k: v for k, v in account_doc.items() if k != "_id"}

@api_router.delete("/admin/payment-accounts/{account_id}")
async def delete_payment_account(account_id: str, admin = Depends(get_admin_user)):
    result = await db.payment_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted"}

@api_router.get("/payment-accounts")
async def get_active_payment_accounts():
    accounts = await db.payment_accounts.find({"is_active": True}, {"_id": 0}).to_list(100)
    return accounts

# ==================== SEED DEFAULT PLANS ====================

@api_router.post("/admin/seed-plans")
async def seed_default_plans(admin = Depends(get_admin_user)):
    existing = await db.plans.count_documents({})
    if existing > 0:
        return {"message": "Plans already exist"}
    
    default_plans = [
        {"id": str(uuid.uuid4()), "name": "Lite", "credits": 500000, "price": 15, "voice_clone_limit": 5, "expire_days": 30, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Advance", "credits": 1000000, "price": 25, "voice_clone_limit": 10, "expire_days": 30, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Ultra", "credits": 3000000, "price": 45, "voice_clone_limit": 15, "expire_days": 30, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Premium", "credits": 5000000, "price": 70, "voice_clone_limit": 20, "expire_days": 30, "is_active": True},
    ]
    await db.plans.insert_many(default_plans)
    return {"message": "Default plans created"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
