"""Learning DNA - AI-powered personalised learning for students with disabilities."""
import logging
from datetime import timedelta

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from learning_dna import config

log = logging.getLogger("learning_dna")


def create_app(store_backend=None, mongo_uri=None, mongo_db=None) -> Flask:
    from learning_dna.routes import accessibility, account, core, monitoring, path, profiling
    from learning_dna.store import init_store

    app = Flask(__name__)
    app.secret_key = config.SECRET_KEY
    app.permanent_session_lifetime = timedelta(days=config.SESSION_DAYS)
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_BODY_BYTES
    app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=True)
    init_store(store_backend, mongo_uri, mongo_db)

    for module in (core, path, profiling, accessibility, monitoring, account):
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
            if isinstance(err, HTTPException):
                return jsonify({"ok": False, "error": err.description}), err.code or 500
            # Never send internal error text to the browser: it can reveal code paths or connection details.
            log.exception("Unhandled error on %s %s", request.method, request.path)
            return jsonify({"ok": False, "error": "Something went wrong on the server. Please try again."}), 500
        raise err

    return app
