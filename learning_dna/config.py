"""Settings read from environment variables (see .env.example)."""
import os

SECRET_KEY = os.environ.get("SECRET_KEY", "learning-dna-dev-secret")
# auto = try MongoDB, fall back to memory | mongo = require MongoDB | memory = never use MongoDB
STORE_BACKEND = os.environ.get("STORE_BACKEND", "auto").lower()
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.environ.get("MONGO_DB", "learning_dna")
ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}
SESSION_DAYS = 30
def _whole_number(name: str, default: int = 0) -> int:
    try:
        return max(0, int(os.environ.get(name, default)))
    except ValueError:
        return default


# How many proxies in front of the app add to X-Forwarded-For and can be trusted (see docs/FINAL_AUDIT.md).
# 0 keeps the old behaviour: use the first address in the header.
TRUSTED_PROXY_HOPS = _whole_number("TRUSTED_PROXY_HOPS")
MAX_BODY_BYTES = 1_000_000   # requests are small JSON; refuse anything bigger than 1 MB
