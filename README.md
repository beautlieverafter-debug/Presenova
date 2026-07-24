# AI Presentation & Document Analyzer - Backend

A production-ready Flask backend using Blueprints for a microservices-style architecture. Provides AI-powered analysis for documents, speeches, and practice coaching.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Installation

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask app
python main.py
```

The backend will start on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── main.py              # Flask app initialization & health check
├── phase_two.py         # Document Analyzer (Phase 2)
├── phase_four.py        # Speech Analyzer (Phase 4)
├── phase_five.py        # AI Coach (Phase 5)
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## 🔌 API Endpoints

### Health Check
```
GET /
Response: {"status": "running"}
```

### Phase 2: Document Analyzer
```
POST /api/analyze-document
Content-Type: multipart/form-data
Body: file (binary file upload)

Response:
{
  "status": "success",
  "overall_score": 85,
  "document_name": "example.pdf",
  "category_scores": {
    "Structure": 88,
    "Clarity": 82,
    ...
  },
  "seven_cs_evaluation": {
    "Clear": "Well-organized with clear headers...",
    ...
  },
  "recommendations": [...]
}
```

### Phase 4: Speech Analyzer
```
POST /api/analyze-speech
Content-Type: application/json
Body: {
  "text": "Your speech transcript here..."
}

Response:
{
  "status": "success",
  "word_count": 250,
  "filler_words_count": 5,
  "filler_words_percentage": 2.0,
  "speech_speed_wpm": 150,
  "sentiment": "positive",
  "sentiment_score": 0.75,
  "actionable_feedback": [...],
  "summary": {...}
}
```

### Phase 5: AI Coach
```
POST /api/practice-chat
Content-Type: application/json
Body: {
  "message": "How can I improve my opening?",
  "history": [...],
  "contextReport": {...}
}

Response:
{
  "status": "success",
  "ai_response": "Here are some tips for a great opening...",
  "context_used": true,
  "message_id": "msg_1234567890",
  "timestamp": "2024-01-15T10:30:00"
}
```

## 📊 Architecture

### Modular Design with Flask Blueprints

Each feature is implemented as a separate Blueprint:

1. **phase_two.py**: Document analysis with file uploads
2. **phase_four.py**: Speech analysis with text input
3. **phase_five.py**: AI coaching with chat interface

Benefits:
- Scalable microservices-style architecture
- Easy to extend with new features
- Clean separation of concerns
- Independent testing per module

### CORS Configuration

CORS is enabled for all `/api/*` routes to allow frontend integration:

```python
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Flask | 3.0.0 | Web framework |
| Flask-CORS | 4.0.0 | CORS handling |
| Werkzeug | 3.0.1 | WSGI utility library |

## 🛠️ Development

### Running the Server

```bash
python main.py
```

Server runs on:
- **Host**: 0.0.0.0 (accessible from any IP)
- **Port**: 5000
- **Debug Mode**: Enabled (auto-reload on file changes)

### Adding a New Blueprint

```python
from flask import Blueprint, request, jsonify

new_phase_bp = Blueprint('new_phase', __name__, url_prefix='/api')

@new_phase_bp.route('/endpoint', methods=['POST'])
def endpoint():
    # Your implementation
    return jsonify({"status": "success"}), 200
```

Register in `main.py`:
```python
from new_phase import new_phase_bp
app.register_blueprint(new_phase_bp)
```

## 🔒 Error Handling

All endpoints return appropriate HTTP status codes:

- **200**: Success
- **400**: Bad Request (missing/invalid parameters)
- **500**: Internal Server Error

Error responses include:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## 📝 Example Requests

### Document Analysis
```bash
curl -X POST http://localhost:5000/api/analyze-document \
  -F "file=@document.pdf"
```

### Speech Analysis
```bash
curl -X POST http://localhost:5000/api/analyze-speech \
  -H "Content-Type: application/json" \
  -d '{"text": "Your speech here..."}'
```

### Practice Chat
```bash
curl -X POST http://localhost:5000/api/practice-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How to improve?",
    "history": [],
    "contextReport": {}
  }'
```

## 🚀 Production Deployment

For production, use a WSGI server like Gunicorn:

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

## 🔧 Environment Variables

Create a `.env` file (optional):
```
FLASK_ENV=production
FLASK_DEBUG=False
CORS_ORIGINS=http://localhost:3000
```

## 📋 Implementation Notes

### Phase 2 (Document Analyzer)
- Accepts file uploads via multipart/form-data
- Returns dummy AI analysis scores
- Implements 7Cs evaluation
- Provides actionable recommendations

### Phase 4 (Speech Analyzer)
- Analyzes transcribed speech text
- Calculates word count and filler words
- Estimates speech speed (WPM)
- Performs sentiment analysis
- Generates feedback

### Phase 5 (AI Coach)
- Provides interactive coaching via chat
- Responds to practice questions
- Generates contextual advice
- Maintains conversation history

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in main.py
app.run(host='0.0.0.0', port=5001, debug=True)
```

### CORS Issues
Ensure CORS is enabled in `main.py`:
```python
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

### Module Import Errors
Ensure all files (main.py, phase_two.py, etc.) are in the same directory.

## 📄 License

This project is part of a Final Year Project (FYP).

## 👥 Author

AI Presentation & Document Analyzer Team
