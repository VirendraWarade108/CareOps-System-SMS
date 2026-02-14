# 🚀 QUICK START GUIDE

## You Now Have a WORKING CareOps Project!

This folder contains actual, runnable code for the CareOps platform.

## What's Included:

✅ **Backend (FastAPI)**
- Complete REST API with 15+ endpoints
- SQLAlchemy models for all database tables
- JWT authentication
- User, Workspace, Contact, Booking management
- Dashboard statistics API
- Public booking endpoints

✅ **Frontend (Next.js)**
- Landing page
- API integration utilities
- Tailwind CSS setup
- TypeScript configuration

## 🏃 Get Running in 5 Minutes:

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file (copy from .env.example)
echo "DATABASE_URL=postgresql://user:pass@localhost/careops" > .env
echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" >> .env
echo "SMTP_USER=your-email@gmail.com" >> .env
echo "SMTP_PASSWORD=your-app-password" >> .env

# Run it!
cd app
python main.py
```

API runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 2. Frontend Setup
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Frontend runs at: http://localhost:3000

## 🎯 What Works Right Now:

1. ✅ User Registration & Login
2. ✅ Workspace Creation
3. ✅ Contact Management
4. ✅ Booking System
5. ✅ Dashboard Statistics API
6. ✅ Public Booking Pages (API ready)

## ⚡ To Complete for Hackathon:

You need to build the frontend pages:

1. **Onboarding Wizard** (`/app/onboarding/page.tsx`)
2. **Dashboard Page** (`/app/dashboard/page.tsx`)
3. **Inbox Page** (`/app/inbox/page.tsx`)
4. **Bookings Page** (`/app/bookings/page.tsx`)
5. **Forms Page** (`/app/forms/page.tsx`)
6. **Public Booking Page** (`/app/book/[slug]/page.tsx`)

## 🤖 Use Cursor AI to Build Pages Fast:

```bash
# Install Cursor: https://cursor.sh
# Open this project in Cursor
# Use prompts like:

"Create a complete onboarding wizard in /app/onboarding/page.tsx 
with 8 steps using the API from lib/api.ts"

"Create a dashboard page at /app/dashboard/page.tsx that calls 
workspaces.getDashboardStats() and displays the stats beautifully"
```

## 🗄️ Database Options:

**Option 1: Neon (Easiest)**
1. Go to https://neon.tech
2. Create free account
3. Create project
4. Copy connection string to .env

**Option 2: Local PostgreSQL**
```bash
createdb careops
# Update DATABASE_URL in .env
```

## 📱 Test the API:

```bash
# Register user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Get workspace stats (use token from registration)
curl -X GET http://localhost:8000/api/workspaces/{id}/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚀 Deployment:

**Backend → Railway**
1. Push code to GitHub
2. Connect Railway to repo
3. Add environment variables
4. Deploy!

**Frontend → Vercel**
```bash
npm i -g vercel
cd frontend
vercel
```

## ⏱️ Time Estimate:

With Cursor AI helping:
- Backend is DONE (ready to use)
- Frontend pages: 4-6 hours
- Testing & polish: 2-3 hours
- Deployment: 1 hour
- Demo video: 1 hour

**Total: ~10 hours** to complete submission

## 🏆 You're Ready!

You have:
✅ Working backend API
✅ Database models
✅ Authentication
✅ Core business logic
✅ API client utilities

Just need to:
🔨 Build the frontend pages
🎨 Make it look good
📹 Record demo
✅ Submit!

**Good luck! 🎉**
