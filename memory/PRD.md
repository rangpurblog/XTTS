# VoiceClone AI - Product Requirements Document

## Original Problem Statement
Voice cloning platform with XTTS v2 integration featuring:
- User dashboard for voice upload, cloning, deletion, and voice generation
- Voice library with public voices (admin cloned)
- Admin dashboard with user management, plan management, order approval, GPU monitoring
- 4 subscription plans with credits, voice clone limits, and expiry
- Manual payment approval system (Bkash, Nagad, Binance)

## User Personas
1. **Content Creator**: Needs voice cloning for videos, podcasts, audiobooks
2. **Developer/Business**: Integrates voice cloning into their products
3. **Admin**: Manages platform, users, plans, and approves orders

## Core Requirements (Static)
- User registration and authentication (JWT)
- Admin authentication with secret key
- Voice cloning via XTTS v2 server
- Credit-based voice generation
- Subscription plan management
- Manual order approval workflow
- GPU usage monitoring

## What's Been Implemented (June 2025)

### Backend (FastAPI)
- ✅ User auth: register, login, JWT tokens
- ✅ Admin auth: email/password + secret key
- ✅ Plans CRUD: create, read, update, delete
- ✅ Orders: create, approve, reject
- ✅ User management: search, block, add credits, delete
- ✅ Voice management: clone, delete, generate
- ✅ Public voices: admin cloning for all users
- ✅ Payment accounts: CRUD for Bkash/Nagad/Binance
- ✅ Admin stats: users, orders, credits, GPU usage

### Frontend (React)
- ✅ Landing page with features and pricing
- ✅ User login/register pages
- ✅ User dashboard: Overview, My Voices, Voice Library, Generate, Plans, Orders
- ✅ Admin login page with secret key
- ✅ Admin dashboard: Overview, Users, Plans, Orders, Public Voices, Payment Accounts

### Design
- ✅ Light theme with Outfit + Inter fonts
- ✅ Indigo/Violet accent colors
- ✅ Responsive layout
- ✅ Card-based UI with hover effects

## Architecture
```
Frontend (React) -> Backend (FastAPI) -> MongoDB
                         |
                         v
                    XTTS v2 Server (localhost:8001/clone-voice)
```

## Default Plans
1. Lite: 500K credits, 5 voice clones, $15/30 days
2. Advance: 1M credits, 10 voice clones, $25/30 days
3. Ultra: 3M credits, 15 voice clones, $45/30 days
4. Premium: 5M credits, 20 voice clones, $70/30 days

## MOCKED Features
- ⚠️ Voice cloning simulated (actual XTTS server not connected)
- ⚠️ GPU usage values are static/simulated
- ⚠️ Audio playback not implemented

## Prioritized Backlog

### P0 (Critical)
- [ ] Connect actual XTTS v2 server at localhost:8001/clone-voice
- [ ] Implement real audio file storage and playback

### P1 (High)
- [ ] Real-time GPU monitoring from XTTS server
- [ ] Audio preview for cloned voices
- [ ] Email notifications for order status

### P2 (Medium)
- [ ] Voice quality settings
- [ ] Batch text-to-speech generation
- [ ] Usage analytics dashboard
- [ ] Multi-language support (Bengali/English)

### P3 (Low)
- [ ] API rate limiting
- [ ] Voice sharing between users
- [ ] Export/download generated audio

## Next Tasks
1. Connect XTTS v2 server for actual voice cloning
2. Add audio playback component
3. Implement real GPU monitoring endpoint
4. Add payment method logos/icons

## Admin Credentials
- Email: any email
- Password: any password (min 6 chars)
- Secret Key: `admin_super_secret_key`
