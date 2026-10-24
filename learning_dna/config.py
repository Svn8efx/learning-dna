"""Settings read from environment variables (see .env.example)."""
import os

SECRET_KEY = os.environ.get("SECRET_KEY", "learning-dna-dev-secret")
# auto = try MongoDB, fall back to memory | mongo = require MongoDB | memory = never use MongoDB
STORE_BACKEND = os.environ.get("STORE_BACKEND", "auto").lower()
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.environ.get("MONGO_DB", "learning_dna")
ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}
SESSION_DAYS = 30
