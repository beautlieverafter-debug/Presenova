"""
Phase One: Database Models (MongoDB Migration)
Role: Define helper classes and MongoDB connections for User, Upload, and Report entities.
"""

import os
import json
from datetime import datetime
import uuid
from pymongo import MongoClient  # type: ignore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/fyp_db')
IS_MOCK = False
try:
    # Set a 2-second timeout to avoid blocking startup if MongoDB is not running
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    client.admin.command('ping')
    db = client.get_default_database()
    print("[DB OK] Connected to MongoDB database")
except Exception as e:
    print(f"[DB WARN] MongoDB connection failed, falling back to in-memory mongomock: {str(e)}")
    import mongomock  # type: ignore
    client = mongomock.MongoClient()
    db = client['fyp_db']
    IS_MOCK = True

# ===== PERSISTENT MOCK DATABASE HELPERS =====
MOCK_DB_FILE = os.path.join('instance', 'mock_db.json')

def save_mock_db(database):
    try:
        os.makedirs('instance', exist_ok=True)
        data = {}
        for coll_name in ['users', 'uploads', 'reports', 'presentation_sessions', 'historical_reports']:
            coll = database[coll_name]
            docs = list(coll.find({}))
            serialized_docs = []
            for doc in docs:
                new_doc = {}
                for k, v in doc.items():
                    if k == '_id':
                        new_doc[k] = str(v)
                    elif isinstance(v, datetime):
                        new_doc[k] = v.isoformat()
                    else:
                        new_doc[k] = v
                serialized_docs.append(new_doc)
            data[coll_name] = serialized_docs
        with open(MOCK_DB_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as err:
        print(f"[DB MOCK SAVE FAIL]: {str(err)}")

def load_mock_db(database):
    if not os.path.exists(MOCK_DB_FILE):
        return
    try:
        with open(MOCK_DB_FILE, 'r') as f:
            data = json.load(f)
        for coll_name, docs in data.items():
            coll = database[coll_name]
            for doc in docs:
                for k, v in doc.items():
                    if k == '_id':
                        continue
                    if isinstance(v, str):
                        if len(v) >= 19 and '-' in v and ':' in v:
                            try:
                                doc[k] = datetime.fromisoformat(v)
                            except ValueError:
                                pass
                if not coll.find_one({"id": doc.get("id")}):
                    coll.insert_one(doc)
        print(f"[DB OK] Loaded persistent mongomock state from {MOCK_DB_FILE}")
    except Exception as err:
        print(f"[DB MOCK LOAD FAIL]: {str(err)}")

if IS_MOCK:
    load_mock_db(db)


class User:
    """
    User class representing a user document in MongoDB 'users' collection.
    """
    def __init__(self, id, name, email, password_hash, created_at=None, updated_at=None):
        self.id = id
        self.name = name
        self.email = email
        self.password_hash = password_hash
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @staticmethod
    def get_by_email(email):
        doc = db.users.find_one({"email": email.lower().strip()})
        if doc:
            return User(
                id=doc.get("id"),
                name=doc.get("name"),
                email=doc.get("email"),
                password_hash=doc.get("password_hash"),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at")
            )
        return None

    @staticmethod
    def get_by_id(user_id):
        doc = db.users.find_one({"id": user_id})
        if doc:
            return User(
                id=doc.get("id"),
                name=doc.get("name"),
                email=doc.get("email"),
                password_hash=doc.get("password_hash"),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at")
            )
        return None

    @staticmethod
    def create(name, email, password_hash):
        user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = {
            "id": user_id,
            "name": name.strip(),
            "email": email.lower().strip(),
            "password_hash": password_hash,
            "created_at": now,
            "updated_at": now
        }
        db.users.insert_one(doc)
        if IS_MOCK:
            save_mock_db(db)
        return User(
            id=user_id,
            name=name,
            email=email,
            password_hash=password_hash,
            created_at=now,
            updated_at=now
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }

class Upload:
    """
    Upload class representing a file upload in MongoDB 'uploads' collection.
    """
    def __init__(self, id, filename, mime_type, file_path, user_id, created_at=None):
        self.id = id
        self.filename = filename
        self.mime_type = mime_type
        self.file_path = file_path
        self.user_id = user_id
        self.created_at = created_at or datetime.utcnow()

    @staticmethod
    def create(filename, mime_type, file_path, user_id):
        upload_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = {
            "id": upload_id,
            "filename": filename,
            "mime_type": mime_type,
            "file_path": file_path,
            "user_id": user_id,
            "created_at": now
        }
        db.uploads.insert_one(doc)
        if IS_MOCK:
            save_mock_db(db)
        return Upload(
            id=upload_id,
            filename=filename,
            mime_type=mime_type,
            file_path=file_path,
            user_id=user_id,
            created_at=now
        )

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'mime_type': self.mime_type,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }

class Report:
    """
    Report class representing analysis results in MongoDB 'reports' collection.
    """
    def __init__(self, id, report_json, report_type, user_id, upload_id=None, created_at=None, updated_at=None):
        self.id = id
        self.report_json = report_json
        self.report_type = report_type
        self.user_id = user_id
        self.upload_id = upload_id
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @staticmethod
    def create(report_json, report_type, user_id, upload_id=None):
        report_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = {
            "id": report_id,
            "report_json": report_json,
            "report_type": report_type,
            "user_id": user_id,
            "upload_id": upload_id,
            "created_at": now,
            "updated_at": now
        }
        db.reports.insert_one(doc)
        if IS_MOCK:
            save_mock_db(db)
        return Report(
            id=report_id,
            report_json=report_json,
            report_type=report_type,
            user_id=user_id,
            upload_id=upload_id,
            created_at=now,
            updated_at=now
        )

    @staticmethod
    def get_by_user(user_id):
        cursor = db.reports.find({"user_id": user_id}).sort("created_at", -1)
        reports = []
        for doc in cursor:
            reports.append(Report(
                id=doc.get("id"),
                report_json=doc.get("report_json"),
                report_type=doc.get("report_type"),
                user_id=doc.get("user_id"),
                upload_id=doc.get("upload_id"),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at")
            ))
        return reports

    def to_dict(self):
        return {
            'id': self.id,
            'report_type': self.report_type,
            'report_json': self.report_json,
            'user_id': self.user_id,
            'upload_id': self.upload_id,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }

class PresentationSession:
    """
    PresentationSession tracks streaming states, status, and accumulated metrics for a live session.
    """
    def __init__(self, id, user_id, topic, status, started_at=None, ended_at=None, metrics=None):
        self.id = id
        self.user_id = user_id
        self.topic = topic
        self.status = status  # 'STREAMING', 'INTERRUPTED_Q&A', 'FINISHED'
        self.started_at = started_at or datetime.utcnow()
        self.ended_at = ended_at or datetime.utcnow()
        self.metrics = metrics or {
            "eye_contact_scores": [],
            "posture_scores": [],
            "wpm_history": [],
            "fillers_detected": 0,
            "transcripts": [],
            "interruptions": [],
            "confidence_scores": [],
            "vocal_sentiment_scores": []
        }

    @staticmethod
    def create(user_id, topic):
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = {
            "id": session_id,
            "user_id": user_id,
            "topic": topic,
            "status": "STREAMING",
            "started_at": now,
            "ended_at": now,
            "metrics": {
                "eye_contact_scores": [],
                "posture_scores": [],
                "wpm_history": [],
                "fillers_detected": 0,
                "transcripts": [],
                "interruptions": [],
                "confidence_scores": [],
                "vocal_sentiment_scores": []
            }
        }
        db.presentation_sessions.insert_one(doc)
        if IS_MOCK:
            save_mock_db(db)
        return PresentationSession(
            id=session_id,
            user_id=user_id,
            topic=topic,
            status="STREAMING",
            started_at=now,
            ended_at=now,
            metrics=doc["metrics"]
        )

    @staticmethod
    def get_by_id(session_id):
        doc = db.presentation_sessions.find_one({"id": session_id})
        if doc:
            return PresentationSession(
                id=doc.get("id"),
                user_id=doc.get("user_id"),
                topic=doc.get("topic"),
                status=doc.get("status"),
                started_at=doc.get("started_at"),
                ended_at=doc.get("ended_at"),
                metrics=doc.get("metrics")
            )
        return None

    def update_metrics(self, key, value):
        db.presentation_sessions.update_one(
            {"id": self.id},
            {"$push": {f"metrics.{key}": value}}
        )
        if self.metrics and key in self.metrics:
            if isinstance(self.metrics[key], list):
                self.metrics[key].append(value)
        if IS_MOCK:
            save_mock_db(db)

    def increment_metric(self, key, val=1):
        db.presentation_sessions.update_one(
            {"id": self.id},
            {"$inc": {f"metrics.{key}": val}}
        )
        if self.metrics and key in self.metrics:
            self.metrics[key] = self.metrics.get(key, 0) + val
        if IS_MOCK:
            save_mock_db(db)

    def update_status(self, new_status):
        self.status = new_status
        db.presentation_sessions.update_one(
            {"id": self.id},
            {"$set": {"status": new_status, "ended_at": datetime.utcnow()}}
        )
        if IS_MOCK:
            save_mock_db(db)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'topic': self.topic,
            'status': self.status,
            'started_at': self.started_at.isoformat() if isinstance(self.started_at, datetime) else str(self.started_at),
            'ended_at': self.ended_at.isoformat() if isinstance(self.ended_at, datetime) else str(self.ended_at),
            'metrics': self.metrics
        }

class HistoricalReport:
    """
    HistoricalReport for storing final compiled presentation reports for comparison.
    """
    def __init__(self, id, session_id, user_id, topic, report_json, created_at=None):
        self.id = id
        self.session_id = session_id
        self.user_id = user_id
        self.topic = topic
        self.report_json = report_json
        self.created_at = created_at or datetime.utcnow()

    @staticmethod
    def create(session_id, user_id, topic, report_json):
        report_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = {
            "id": report_id,
            "session_id": session_id,
            "user_id": user_id,
            "topic": topic.strip().lower(),
            "report_json": report_json,
            "created_at": now
        }
        db.historical_reports.insert_one(doc)
        if IS_MOCK:
            save_mock_db(db)
        return HistoricalReport(
            id=report_id,
            session_id=session_id,
            user_id=user_id,
            topic=topic,
            report_json=report_json,
            created_at=now
        )

    @staticmethod
    def get_by_user_and_topic(user_id, topic):
        cursor = db.historical_reports.find({
            "user_id": user_id,
            "topic": topic.strip().lower()
        }).sort("created_at", -1)
        reports = []
        for doc in cursor:
            reports.append(HistoricalReport(
                id=doc.get("id"),
                session_id=doc.get("session_id"),
                user_id=doc.get("user_id"),
                topic=doc.get("topic"),
                report_json=doc.get("report_json"),
                created_at=doc.get("created_at")
            ))
        return reports

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'topic': self.topic,
            'report_json': self.report_json,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }
