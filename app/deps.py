from fastapi import Header, HTTPException
import os
ADMIN_KEY = os.getenv("ADMIN_KEY")
# ADMIN_KEY = "supersecretadmin"
def admin_auth(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )