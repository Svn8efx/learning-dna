"""Module 3 - accessible multimedia: saved preferences and text-first lessons (transcripts)."""
from flask import Blueprint, jsonify, request

from learning_dna.accessibility import DEFAULT_PREFS, clean_preferences
from learning_dna.content import get_lesson, list_lessons
from learning_dna.monitoring import record_event
from learning_dna.store import state

bp = Blueprint("accessibility", __name__)


@bp.route("/api/accessibility/preferences", methods=["GET", "PUT"])
def api_preferences():
    current = clean_preferences(None, state.get("a11y_preferences"))
    if request.method == "PUT":
        incoming = request.get_json(silent=True) or {}
        updated = clean_preferences(incoming, current)
        changed = [k for k in DEFAULT_PREFS if updated[k] != current[k]]
        state["a11y_preferences"] = updated
        for key in changed[:5]:
            record_event(state.student_id(), "a11y_change", meta={"setting": key})
        current = updated
    return jsonify({"ok": True, "preferences": current, "defaults": DEFAULT_PREFS})


@bp.route("/api/content")
def api_content_list():
    return jsonify({"ok": True, "lessons": list_lessons()})


@bp.route("/api/content/<path:topic>")
def api_content(topic):
    lesson = get_lesson(topic)
    if not lesson:
        return jsonify({"ok": False, "error": "No lesson text for that topic yet."}), 404
    record_event(state.student_id(), "lesson_view", topic=lesson["topic"])
    return jsonify({"ok": True, "lesson": lesson})
