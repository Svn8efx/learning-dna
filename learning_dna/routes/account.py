"""Resume codes: save progress without a password and continue on another device."""
from flask import Blueprint, jsonify, request, session

from learning_dna.resume_code import AttemptLimiter, generate_code, is_valid_format, normalize_code
from learning_dna.store import state, store

bp = Blueprint("account", __name__)
limiter = AttemptLimiter()


def _client_key() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded or request.remote_addr or "unknown"


@bp.route("/api/account/code")
def api_account_code():
    """Returns this student's resume code, creating one the first time."""
    code = state.get("resume_code")
    if not code:
        for _ in range(20):
            candidate = generate_code()
            if store.find_student_id_by_code(candidate) is None:
                code = candidate
                break
        else:
            return jsonify({"ok": False, "error": "Could not create a code. Please try again."}), 500
        state["resume_code"] = code
    return jsonify({"ok": True, "code": code})


@bp.route("/api/account/resume", methods=["POST"])
def api_account_resume():
    """Switches this browser to the profile that owns the code."""
    data = request.get_json(silent=True) or {}
    code = normalize_code(data.get("code"))
    if not is_valid_format(code):
        return jsonify({"ok": False, "error": "That does not look like a code. A code has three words and a two-digit number, like maple-river-tiger-42."}), 400
    key = _client_key()
    if limiter.blocked(key):
        return jsonify({"ok": False, "error": "Too many tries. Please wait a few minutes and try again."}), 429
    student_id = store.find_student_id_by_code(code)
    if not student_id:
        limiter.record_failure(key)
        return jsonify({"ok": False, "error": "We could not find that code. Check the words and the number, then try again."}), 404
    session["student_id"] = student_id
    session.permanent = True
    return jsonify({"ok": True, "message": "Welcome back. Your progress has been loaded."})


@bp.route("/api/account/logout", methods=["POST"])
def api_account_logout():
    """Makes this browser forget the student. The saved data stays under the resume code."""
    session.clear()
    return jsonify({"ok": True})
