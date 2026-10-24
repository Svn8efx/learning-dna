"""Module 4 - real-time monitoring of engagement, accessibility usage and learning progress."""
from flask import Blueprint, jsonify, request

from learning_dna.accessibility import clean_preferences
from learning_dna.learning import _activity_metrics
from learning_dna.monitoring import build_summary, record_event
from learning_dna.store import state

bp = Blueprint("monitoring", __name__)


@bp.route("/api/monitor/event", methods=["POST"])
def api_monitor_event():
    data = request.get_json(silent=True) or {}
    ok = record_event(state.student_id(), str(data.get("type", "")), str(data.get("topic", "")), data.get("meta"))
    return jsonify({"ok": ok}), (200 if ok else 400)


@bp.route("/api/monitor/summary")
def api_monitor_summary():
    prefs = clean_preferences(None, state.get("a11y_preferences"))
    profile = state.get("profile")
    metrics = _activity_metrics(profile, state.get("assessment") or []) if profile else {}
    return jsonify({"ok": True, "summary": build_summary(state.student_id(), prefs, metrics)})
