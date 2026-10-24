"""Real-time monitoring (module 4): engagement, accessibility usage, quiz trend, personalisation effect."""
from __future__ import annotations

import time
from collections import Counter
from datetime import datetime, timezone

from learning_dna.store import store

ALLOWED_EVENTS = {
    "page_view", "lesson_view", "a11y_change", "tts_used", "voice_command",
    "caption_toggle", "keyboard_shortcut", "video_start", "intake_completed", "quiz_submit",
}


def record_event(sid: str, event_type: str, topic: str = "", meta: dict | None = None) -> bool:
    if event_type not in ALLOWED_EVENTS:
        return False
    clean_meta = {str(k)[:40]: (v if isinstance(v, (int, float, bool)) else str(v)[:80])
                  for k, v in list((meta or {}).items())[:8]}
    store.add_event(sid, {"type": event_type, "topic": str(topic)[:60], "meta": clean_meta, "ts": time.time()})
    return True


def _day(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def build_summary(sid: str, prefs: dict, path_metrics: dict | None) -> dict:
    events = store.list_events(sid)
    results = store.list_quiz_results(sid)
    counts = Counter(e["type"] for e in events)
    active_days = sorted({_day(e["ts"]) for e in events})
    a11y_changes = Counter(e.get("meta", {}).get("setting", "unknown") for e in events if e["type"] == "a11y_change")

    attempts = [{
        "attempt": i + 1, "date": _day(r["ts"]), "avg_score": r["avg_score"],
        "personalised": bool(r.get("personalised")),
    } for i, r in enumerate(results)]

    with_p = [a["avg_score"] for a in attempts if a["personalised"]]
    without_p = [a["avg_score"] for a in attempts if not a["personalised"]]
    if with_p and without_p:
        diff = round(sum(with_p) / len(with_p) - sum(without_p) / len(without_p), 1)
        effect = {"status": "available", "with_personalisation": round(sum(with_p) / len(with_p), 1),
                  "without_personalisation": round(sum(without_p) / len(without_p), 1), "difference": diff,
                  "note": "This compares your own quiz attempts. It shows a link, not proof of cause."}
    else:
        effect = {"status": "not_enough_data",
                  "note": "Take at least one quiz with accessibility settings on and one with them off to compare."}

    insights = []
    if prefs.get("text_to_speech") and counts["tts_used"] == 0:
        insights.append("Listen controls are on, but you have not used them yet. Try the Listen button on a lesson.")
    if len(attempts) >= 2 and attempts[-1]["avg_score"] < attempts[-2]["avg_score"]:
        insights.append("Your latest quiz score dipped. Revisit the lesson text for your weakest topic before the next attempt.")
    if len(attempts) >= 2 and attempts[-1]["avg_score"] > attempts[-2]["avg_score"]:
        insights.append("Your quiz score improved on the last attempt. Keep going.")
    if not attempts:
        insights.append("Take the adaptive quiz to start tracking your progress.")

    return {
        "engagement": {
            "total_events": len(events), "active_days": len(active_days),
            "last_active": active_days[-1] if active_days else None,
            "lessons_viewed": counts["lesson_view"], "page_views": counts["page_view"],
        },
        "accessibility_usage": {
            "current_settings": prefs,
            "setting_changes": dict(a11y_changes),
            "text_to_speech_uses": counts["tts_used"],
            "voice_commands_used": counts["voice_command"],
            "keyboard_shortcuts_used": counts["keyboard_shortcut"],
            "caption_toggles": counts["caption_toggle"],
        },
        "quiz_trend": attempts,
        "progress": path_metrics or {},
        "personalisation_effect": effect,
        "insights": insights,
    }
