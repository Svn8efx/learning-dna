"""Learning DNA - AI-powered personalised learning for students with disabilities."""
from datetime import timedelta

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from learning_dna import config


def create_app(store_backend=None, mongo_uri=None, mongo_db=None) -> Flask:
    from learning_dna.routes import accessibility, core, monitoring, path, profiling
    from learning_dna.store import init_store

    app = Flask(__name__)
    app.secret_key = config.SECRET_KEY
    app.permanent_session_lifetime = timedelta(days=config.SESSION_DAYS)
    app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=True)
    init_store(store_backend, mongo_uri, mongo_db)

    for module in (core, path, profiling, accessibility, monitoring):
        app.register_blueprint(module.bp)

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "")
        if origin in config.ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,OPTIONS"
            response.headers["Vary"] = "Origin"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.errorhandler(Exception)
    def handle_api_error(err):
        if request.path.startswith("/api/"):
            code = (err.code or 500) if isinstance(err, HTTPException) else 500
            message = err.description if isinstance(err, HTTPException) else (str(err) or "Internal server error")
            return jsonify({"ok": False, "error": message}), code
        raise err

    return app
