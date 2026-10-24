"""Module 1 - AI-driven student profiling.

The student answers a short, optional questionnaire. A TensorFlow classifier suggests a
presentation style, and rule-based logic turns the answers into concrete accessibility settings.
Answers are self-declared and can be changed at any time.
"""
from flask import Blueprint, jsonify, request

from learning_dna.accessibility import clean_preferences, preferences_from_intake
from learning_dna.ml.need_model import FEATURE_LABELS, classifier, encode_intake
from learning_dna.monitoring import record_event
from learning_dna.store import state

bp = Blueprint("profiling", __name__)

MODE_DESCRIPTIONS = {
    "audio_first": "Audio-first: lessons are easy to listen to, with large text and strong contrast.",
    "captioned_visual": "Captioned and visual: captions, transcripts and on-screen alerts.",
    "hands_free": "Hands-free: keyboard shortcuts, voice commands and large buttons.",
    "balanced": "Balanced: the standard layout with light adjustments.",
}
LEVELS = {"none", "some", "high"}


def _clean_intake(data: dict) -> dict:
    pick = lambda key: data.get(key) if data.get(key) in LEVELS else "none"  # noqa: E731
    return {
        "vision": pick("vision"), "hearing": pick("hearing"), "motor": pick("motor"),
        "prefers_audio": bool(data.get("prefers_audio")),
        "prefers_captions": bool(data.get("prefers_captions")),
        "prefers_visuals": bool(data.get("prefers_visuals")),
        "pace": "slow" if data.get("pace") == "slow" else "normal",
    }


@bp.route("/api/profile/intake", methods=["POST"])
def api_profile_intake():
    intake = _clean_intake(request.get_json(silent=True) or {})
    assessment = state.get("assessment") or []
    quiz_pct = (sum(r["score_pct"] for r in assessment) / len(assessment)) if assessment else None

    prediction = classifier.predict(encode_intake(intake, quiz_pct))
    if quiz_pct is None:    # no quiz taken yet, so the quiz input was only a neutral default: do not present it as a reason
        prediction["drivers"] = [d for d in prediction["drivers"] if d["feature"] != FEATURE_LABELS["recent_quiz_score"]]
    changes, reasons = preferences_from_intake(intake)
    prefs = clean_preferences(changes, state.get("a11y_preferences"))

    need_profile = {
        "intake": intake,
        "mode": prediction["mode"],
        "mode_description": MODE_DESCRIPTIONS[prediction["mode"]],
        "confidence": prediction["confidence"],
        "probabilities": prediction["probabilities"],
        "drivers": prediction["drivers"],
        "applied_settings": changes,
        "reasons": reasons,
        "model": {"backend": classifier.backend, **classifier.metrics},
    }
    state["need_profile"] = need_profile
    state["a11y_preferences"] = prefs
    record_event(state.student_id(), "intake_completed", meta={"mode": prediction["mode"]})
    return jsonify({"ok": True, "needProfile": need_profile, "preferences": prefs})


@bp.route("/api/profile/learning-dna")
def api_learning_dna():
    """The student's current profile: need profile, preferences, and quiz-based strengths."""
    assessment = state.get("assessment") or []
    return jsonify({
        "ok": True,
        "needProfile": state.get("need_profile"),
        "preferences": clean_preferences(None, state.get("a11y_preferences")),
        "strengths": [r["topic"] for r in assessment if r["score_pct"] >= 75],
        "weakTopics": [r["topic"] for r in assessment if r["score_pct"] < 45],
    })
