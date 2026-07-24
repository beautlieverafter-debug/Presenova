# 🚀 Complete Setup Guide

## Project Overview

This is a full-stack AI-powered Presentation & Document Analyzer with:
- **Backend**: Flask + Flask-CORS (Python) - Running on `http://localhost:5000`
- **Frontend**: React + TypeScript + Vite (Node.js) - Running on `http://localhost:3000`

## 📋 Folder Structure

```
d:\FYP FInal\
├── main.py              # Backend entry point
├── phase_two.py         # Document Analyzer API
├── phase_four.py        # Speech Analyzer API
├── phase_five.py        # AI Coach API
├── requirements.txt     # Python dependencies
├── README.md            # Backend documentation
│
└── frontend\            # React TypeScript app
    ├── src\
    │   ├── components\
    │   ├── pages\
    │   ├── services\
    │   ├── types\
    │   ├── App.tsx
    │   └── main.tsx
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── README.md
```

---

## ⚙️ Backend Setup (Flask)

### Step 1: Install Python Dependencies

```bash
# Navigate to backend directory
cd d:\FYP FInal

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate
# OR (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Run Flask Server

```bash
# Make sure venv is activated
python main.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

### Step 3: Test Backend Health Check

Open in browser or use curl:
```bash
curl http://localhost:5000/
# Response: {"status": "running"}
```

✅ **Backend is ready!**

---

## 🎨 Frontend Setup (React + TypeScript)

### Step 1: Install Node Dependencies

```bash
# Navigate to frontend directory
cd d:\FYP FInal\frontend

# Install dependencies
npm install
```

### Step 2: Run Development Server

```bash
# Start Vite dev server
npm run dev
```

You should see:
```
VITE v5.0.0  ready in 100 ms

➜  Local:   http://localhost:3000/
```

The browser will automatically open to `http://localhost:3000`

### Step 3: Verify Frontend Loads

- You should see the Dashboard with navbar
- The backend status should show "Connected" (green)
- All navigation links should work

✅ **Frontend is ready!**

---

## 🧪 Testing the Integration

### Test 1: Document Analyzer (Phase 2)

1. Go to `http://localhost:3000/analyzer`
2. Click "Choose File" and select any text/PDF file
3. Click "Analyze Document"
4. See mock AI analysis results

### Test 2: Speech Analyzer (Phase 4)

1. Go to `http://localhost:3000/speech`
2. Paste sample text (e.g., speech transcript)
3. Click "Analyze Speech"
4. See metrics: word count, filler words, WPM, sentiment

### Test 3: AI Coach (Phase 5)

1. Go to `http://localhost:3000/practice`
2. Type a message (e.g., "How can I improve my opening?")
3. Press Enter or click "Send Message"
4. See AI coaching response

---

## 📁 API Endpoints Quick Reference

### Health Check
```
GET http://localhost:5000/
```

### Document Analyzer
```
POST http://localhost:5000/api/analyze-document
Form Data: file (multipart)
```

### Speech Analyzer
```
POST http://localhost:5000/api/analyze-speech
JSON: { "text": "Your speech here..." }
```

### AI Coach
```
POST http://localhost:5000/api/practice-chat
JSON: { "message": "Your question", "history": [], "contextReport": {} }
```

---

## 🛠️ Useful Commands

### Backend (Python)

```bash
# Start server
python main.py

# Install new package
pip install package_name

# Freeze dependencies
pip freeze > requirements.txt

# Deactivate venv
deactivate
```

### Frontend (Node.js)

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install package_name
```

---

## 📊 Project Features

### Dashboard (`/`)
- Health check indicator
- Quick overview of features
- Navigation to all analyzers

### Document Analyzer (`/analyzer`) - Phase 2
- File upload interface
- AI document analysis
- Overall score (0-100)
- 7Cs evaluation (Clear, Concise, Correct, etc.)
- Category scores breakdown
- Actionable recommendations

### Speech Analyzer (`/speech`) - Phase 4
- Text area for speech input
- Real-time character/word count
- Analysis results showing:
  - Word count
  - Filler word percentage
  - Speech speed (WPM)
  - Sentiment analysis
  - Clarity score
  - Actionable feedback

### AI Coach (`/practice`) - Phase 5
- Chat interface with AI
- Message history
- Typing indicator
- Suggested prompt buttons
- Auto-scrolling chat

---

## 🎯 Architecture Highlights

### Backend (Flask Blueprints)
- ✅ Modular, scalable structure
- ✅ Each feature in separate file (Phase 2, 4, 5)
- ✅ CORS enabled for frontend integration
- ✅ Consistent error handling
- ✅ Clean separation of concerns

### Frontend (React + Router)
- ✅ TypeScript for type safety
- ✅ Component-based architecture
- ✅ React Router for navigation
- ✅ Service layer for API calls
- ✅ Centralized type definitions
- ✅ Responsive design

---

## 🔧 Configuration

### Backend (.env) - Optional
```
FLASK_ENV=development
FLASK_DEBUG=True
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Port 5000 already in use"
**Solution**: Change port in `main.py`
```python
app.run(host='0.0.0.0', port=5001, debug=True)
```

### Issue: "CORS error" or "Failed to connect backend"
**Solution**: 
1. Ensure Flask server is running on `http://localhost:5000`
2. Check CORS is enabled in `main.py`
3. Verify `.env` has correct `VITE_API_BASE_URL`

### Issue: Frontend shows "Disconnected" status
**Solution**: 
1. Check if backend server is running
2. Refresh the page (F5)
3. Check browser console for errors

### Issue: "Module not found" Python error
**Solution**: 
1. Ensure all `.py` files are in the same directory
2. Check imports are correct
3. Restart Flask server

### Issue: Node modules issues
**Solution**:
```bash
rm -r node_modules package-lock.json
npm install
```

---

## 📚 File Descriptions

### Backend Files

| File | Purpose |
|------|---------|
| `main.py` | Flask app initialization, CORS setup, blueprint registration |
| `phase_two.py` | Document upload & analysis endpoint |
| `phase_four.py` | Speech analysis endpoint |
| `phase_five.py` | AI coach chat endpoint |
| `requirements.txt` | Python package dependencies |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | React Router configuration |
| `src/main.tsx` | Vite entry point |
| `src/components/Layout.tsx` | Global layout with navbar |
| `src/pages/*.tsx` | Page components for each feature |
| `src/services/api.ts` | Backend API calls |
| `src/types/index.ts` | TypeScript interfaces |
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | TypeScript configuration |
| `package.json` | Node dependencies |

---

## 🚀 Next Steps

### For Development:
1. ✅ Backend running on port 5000
2. ✅ Frontend running on port 3000
3. Add real AI/ML models for analysis
4. Integrate actual speech-to-text API
5. Add database for data persistence
6. Implement user authentication

### For Production:
1. Use Gunicorn for Flask
2. Build frontend with `npm run build`
3. Deploy to cloud (AWS, Azure, Heroku)
4. Enable HTTPS
5. Add logging and monitoring
6. Implement caching

---

## 📞 Support

For issues or questions:
1. Check the relevant README (backend or frontend)
2. Review API endpoint documentation
3. Check browser console for errors
4. Verify both servers are running

---

## 📄 License

This project is part of a Final Year Project (FYP).

**Happy Coding! 🎉**
