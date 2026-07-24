# Phase 1: Quick Reference Guide

## Files Created/Updated

### Backend Files

1. **models.py** (NEW)
   - User, Upload, Report models
   - UUID primary keys
   - Proper relationships and cascades
   - SQLAlchemy ORM configuration

2. **auth.py** (NEW)
   - POST /api/auth/signup
   - POST /api/auth/login
   - GET /api/auth/me (@jwt_required)
   - JWT error handlers

3. **main.py** (UPDATED)
   - SQLAlchemy initialization
   - JWT configuration
   - Database table creation
   - Blueprint registration

4. **requirements.txt** (UPDATED)
   - Added Flask-SQLAlchemy==3.0.5
   - Added Flask-JWT-Extended==4.4.4
   - Added uuid==1.30

5. **.env.example** (NEW)
   - Environment variable template
   - Database configuration
   - JWT secret key
   - API keys

### Frontend Files

1. **src/context/AuthContext.tsx** (NEW)
   - React Context for auth state
   - useAuth() hook
   - localStorage token persistence
   - Automatic token recovery

2. **src/services/api.ts** (UPDATED)
   - fetchWithAuth() JWT interceptor
   - signup() function
   - login() function
   - getCurrentUser() function
   - 401 error handling

3. **src/types/index.ts** (UPDATED)
   - User interface
   - LoginRequest interface
   - SignupRequest interface

4. **src/App.tsx** (UPDATED)
   - Wrapped with AuthProvider
   - Global auth state available

5. **src/pages/Login.tsx** (NEW)
   - Login form
   - Signup form
   - Tab switching
   - Form validation
   - Error handling

6. **src/pages/Login.css** (NEW)
   - Professional styling
   - Responsive design
   - Dark mode ready

### Documentation

7. **PHASE_ONE_AUTH.md** (NEW)
   - Complete implementation guide
   - API documentation
   - Database schema
   - Security best practices
   - Testing instructions

---

## Setup Instructions

### 1. Backend Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env

# Update .env with your values
# - Change JWT_SECRET_KEY
# - Add GEMINI_API_KEY if needed

# Run the Flask app
python main.py
```

The app will:
- Create SQLite database at `app.db`
- Initialize SQLAlchemy models
- Start server on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Make sure AuthProvider is in App.tsx
# Make sure context directory exists
mkdir -p src/context

# Install dependencies (if needed)
npm install

# Run Vite dev server
npm run dev
```

The frontend will be at `http://localhost:5173`

### 3. Create First User

**Option A: Via Frontend**
1. Go to `http://localhost:5173/login`
2. Click "Sign Up" tab
3. Fill in form and submit
4. Auto-redirects to dashboard

**Option B: Via cURL**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123456"
  }'
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│          React Frontend                 │
│  ┌──────────────────────────────────┐   │
│  │   AuthProvider (Context)         │   │
│  │   - Manages user state           │   │
│  │   - Stores token in localStorage │   │
│  │   - Auto-recovery on load        │   │
│  └──────────────────────────────────┘   │
│               ↓                          │
│  ┌──────────────────────────────────┐   │
│  │   fetchWithAuth() Interceptor    │   │
│  │   - Injects JWT in headers       │   │
│  │   - Handles 401 errors           │   │
│  │   - Auto-logout on expiry        │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ HTTPS ↑
      (JWT Token in Bearer)
┌─────────────────────────────────────────┐
│       Flask Backend API                 │
│  ┌──────────────────────────────────┐   │
│  │    auth_bp Blueprint             │   │
│  │  - /api/auth/signup   (POST)     │   │
│  │  - /api/auth/login    (POST)     │   │
│  │  - /api/auth/me       (GET)      │   │
│  └──────────────────────────────────┘   │
│               ↓                          │
│  ┌──────────────────────────────────┐   │
│  │    JWT Validation                │   │
│  │  - Token signature check         │   │
│  │  - Expiration check              │   │
│  │  - User extraction               │   │
│  └──────────────────────────────────┘   │
│               ↓                          │
│  ┌──────────────────────────────────┐   │
│  │    SQLAlchemy ORM                │   │
│  │  - User model                    │   │
│  │  - Upload model                  │   │
│  │  - Report model                  │   │
│  └──────────────────────────────────┘   │
│               ↓                          │
│  ┌──────────────────────────────────┐   │
│  │    SQLite Database               │   │
│  │  (PostgreSQL in production)      │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Key Security Features

✅ Password hashing with bcrypt (werkzeug)
✅ JWT token-based authentication
✅ Automatic token expiry (24 hours)
✅ 401 error handling with auto-logout
✅ UUID primary keys (not sequential)
✅ SQLAlchemy ORM (SQL injection prevention)
✅ CORS validation
✅ Input validation on signup/login
✅ Secure password requirements
✅ HTTP-only token storage (localStorage)

---

## Token Flow Example

### Signup
```
User → Frontend → Flask signup → Hash password → Save user
                                    ↓
                            Generate JWT token → Frontend
                                    ↓
                        Save token to localStorage
                                    ↓
                            Redirect to dashboard
```

### Login
```
User → Frontend → Flask login → Verify password → Generate JWT
                                    ↓
                            Return token → Frontend
                                    ↓
                        Save token to localStorage
                                    ↓
                            Auto-fetch user profile (verify token works)
                                    ↓
                            Redirect to dashboard
```

### Authenticated Request
```
Frontend needs to make API call
    ↓
fetchWithAuth() interceptor:
    ├─ Get token from localStorage
    ├─ Add: Authorization: Bearer <token>
    └─ Send request
    ↓
Backend receives request
    ├─ Extract token from header
    ├─ Validate signature (using JWT_SECRET_KEY)
    ├─ Check expiration time
    ├─ Extract user_id from token
    └─ Process normally
    ↓
Response sent back
    ├─ 200 OK: Success
    ├─ 401: Token invalid/expired → Force logout
    └─ 500: Server error
```

---

## Important Environment Variables

```bash
# Critical - Change in production
JWT_SECRET_KEY=your-super-secret-key-here

# Database
DATABASE_URL=sqlite:///app.db  # For development
DATABASE_URL=postgresql://user:pass@localhost/db  # For production

# API
GEMINI_API_KEY=your-gemini-api-key

# Server
FLASK_ENV=development
FLASK_DEBUG=1
HOST=0.0.0.0
PORT=5000
```

---

## Common Issues & Solutions

### Issue: "Invalid JSON" on signup
**Solution**: Check request Content-Type is `application/json`

### Issue: "Email already registered"
**Solution**: Use a different email or delete user from database

### Issue: Token expired after page refresh
**Solution**: AuthContext auto-recovers token from localStorage on app load

### Issue: CORS errors
**Solution**: Ensure `CORS(app)` is called in main.py before registering blueprints

### Issue: Database not initialized
**Solution**: Run `python main.py` once to create tables, or manually call `db.create_all()`

---

## Next Phase Integration

All data in subsequent phases should be associated with authenticated users:

```python
# Phase 2: Document Analysis
report = Report(
    user_id=current_user_id,  # From JWT token
    upload_id=upload.id,
    report_json={...}
)

# Phase 4: Speech Analysis
speech_report = Report(
    user_id=current_user_id,  # From JWT token
    report_type='speech_analysis',
    report_json={...}
)

# Phase 5: Practice Sessions
practice_report = Report(
    user_id=current_user_id,  # From JWT token
    report_type='practice_session',
    report_json={...}
)
```

---

## Deployment Checklist

Before going to production:

- [ ] Change JWT_SECRET_KEY to secure random string
- [ ] Switch from SQLite to PostgreSQL
- [ ] Enable HTTPS
- [ ] Set FLASK_ENV=production
- [ ] Disable FLASK_DEBUG=True
- [ ] Configure CORS to specific domains
- [ ] Add rate limiting to auth endpoints
- [ ] Implement password reset via email
- [ ] Add email verification on signup
- [ ] Set up monitoring and error tracking
- [ ] Configure database backups
- [ ] Enable CORS credentials handling
- [ ] Test with production HTTPS certificates

---

## Support & Documentation

- Full guide: `PHASE_ONE_AUTH.md`
- API endpoints: See auth.py
- Frontend setup: See AuthContext.tsx and api.ts
- Database schema: See models.py
