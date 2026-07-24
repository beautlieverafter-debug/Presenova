"""
Main Flask Application Hub
Role: Initialize Flask app, configure database and authentication, register blueprints, and expose health-check endpoint.

Key Features:
- SQLAlchemy ORM for database management
- JWT-Extended for secure token-based authentication
- CORS enabled for frontend integration
- Blueprint-based modular architecture
- Comprehensive error handling
"""

import sys

# Force stdout/stderr to use UTF-8 encoding to prevent UnicodeEncodeError on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from datetime import timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Global SocketIO instance
socketio = SocketIO()

# Import blueprints
from auth import auth_bp, register_jwt_error_handlers
from phase_two import phase_two_bp
from phase_four import phase_four_bp
from phase_five import phase_five_bp
from phase_live import phase_live_bp, init_socketio_events
from routes.presentation_rewriter import presentation_rewriter_bp
from services.download_service import MAX_UPLOAD_BYTES


def create_app():
    """
    Factory function to create and configure the Flask application.
    
    Initializes:
    - JWT authentication
    - CORS
    - Error handlers
    - Blueprints
    - MongoDB connection check
    """
    
    # ===== CREATE FLASK APP =====
    app = Flask(__name__)

    # ===== JWT CONFIGURATION =====
    # CRITICAL: In production, use a strong secret key from environment variables
    jwt_secret_key = os.getenv('JWT_SECRET_KEY', '').strip()
    if not jwt_secret_key:
        if os.getenv('FLASK_ENV', 'development').lower() == 'production':
            raise RuntimeError('JWT_SECRET_KEY must be configured in production.')
        jwt_secret_key = 'development-only-change-me'
    
    app.config['JWT_SECRET_KEY'] = jwt_secret_key
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    
    # Initialize JWT with the app
    jwt = JWTManager(app)

    # ===== CORS CONFIGURATION =====
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
    parsed_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
    if not parsed_origins:
        parsed_origins = ['*']

    CORS(
        app,
        resources={r"/api/*": {
            "origins": parsed_origins,
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }},
    )

    # Flask enforces this before request handlers read multipart bodies. This
    # prevents oversized uploads from being copied to disk first.
    app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_BYTES

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify({
            'success': False,
            'message': f'File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.',
        }), 413

    # ===== SOCKET.IO CONFIGURATION =====
    socketio.init_app(app, cors_allowed_origins=parsed_origins)

    # ===== MONGO CONFIGURATION & VERIFICATION =====
    with app.app_context():
        try:
            from models import db
            if db is not None:
                print("[INIT OK] Database layer initialized successfully")
        except Exception as e:
            print(f"[INIT FAIL] Database initialization failed: {str(e)}")

    # ===== REGISTER JWT ERROR HANDLERS =====
    # Handles expired, invalid, and missing JWT tokens
    register_jwt_error_handlers(app)

    # ===== REGISTER BLUEPRINTS =====
    # Phase 1: Authentication
    app.register_blueprint(auth_bp)
    
    # Phase 2: Document Analysis
    app.register_blueprint(phase_two_bp)
    
    # Phase 4: Speech Analysis
    app.register_blueprint(phase_four_bp)
    
    # Phase 5: AI Coach / Practice Mode
    app.register_blueprint(phase_five_bp)

    # Phase Live: Presentation Coach & Live Analyzer
    app.register_blueprint(phase_live_bp)
    init_socketio_events(socketio)

    # New Feature: AI Presentation Rewriter
    app.register_blueprint(presentation_rewriter_bp)

    # ===== HEALTH-CHECK ENDPOINT =====
    @app.route('/', methods=['GET'])
    def health_check():
        """
        Health check endpoint to verify the service is running.
        """
        return jsonify({
            "status": "running",
            "service": "FYP Final Project Backend",
            "version": "1.0.0"
        }), 200

    return app


if __name__ == '__main__':
    app = create_app()

    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '5000'))

    # Run the Flask development server wrapped with Socket.IO
    debug = os.getenv('FLASK_DEBUG', '0').strip().lower() in {'1', 'true', 'yes', 'on'}
    socketio.run(app, host=host, port=port, debug=debug, allow_unsafe_werkzeug=debug)
