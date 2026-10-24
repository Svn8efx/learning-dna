"""Accessibility preferences: defaults, validation, and rules that turn intake answers into settings."""
from __future__ import annotations

DEFAULT_PREFS = {
    "font_scale": 100,         # percent, 100-200
    "high_contrast": False,
    "reduce_motion": False,
    "text_to_speech": False,   # show 'listen' controls and offer to read pages aloud
    "speech_rate": 1.0,        # 0.5-1.5
    "captions": False,         # turn on YouTube captions in the video player
    "visual_alerts": True,     # show messages on screen instead of relying on sound
    "large_targets": False,    # bigger buttons and links for motor accessibility
    "keyboard_mode": False,    # stronger focus outline and keyboard shortcuts
    "voice_commands": False,   # spoken navigation (browser support required)
}
BOOL_KEYS = [k for k, v in DEFAULT_PREFS.items() if isinstance(v, bool)]


def clean_preferences(raw: dict | None, base: dict | None = None) -> dict:
    """Return a complete, valid preference dict. Unknown keys are dropped, values are clamped."""
    prefs = dict(DEFAULT_PREFS)
    prefs.update(base or {})
    raw = raw or {}
    for key in BOOL_KEYS:
        if key in raw:
            prefs[key] = bool(raw[key])
    if "font_scale" in raw:
        try:
            prefs["font_scale"] = int(max(100, min(200, round(float(raw["font_scale"]) / 10) * 10)))
        except (TypeError, ValueError):
            pass
    if "speech_rate" in raw:
        try:
            prefs["speech_rate"] = round(max(0.5, min(1.5, float(raw["speech_rate"]))), 2)
        except (TypeError, ValueError):
            pass
    return prefs


def preferences_from_intake(intake: dict) -> tuple[dict, list[str]]:
    """Rule-based settings for the answers a student gave, plus a plain-language reason for each."""
    changes: dict = {}
    reasons: list[str] = []
    vision, hearing, motor = intake.get("vision", "none"), intake.get("hearing", "none"), intake.get("motor", "none")

    if vision == "some":
        changes.update(font_scale=140, high_contrast=True)
        reasons.append("Larger text and high contrast, because you told us you have some difficulty seeing.")
    elif vision == "high":
        changes.update(font_scale=160, high_contrast=True, text_to_speech=True, keyboard_mode=True)
        reasons.append("Large text, high contrast, listen controls and keyboard shortcuts, because screen-reader or audio use is likely.")
    if hearing in {"some", "high"}:
        changes.update(captions=True, visual_alerts=True)
        reasons.append("Captions on videos and on-screen alerts, because sound may be hard to rely on.")
    if motor == "some":
        changes.update(large_targets=True, keyboard_mode=True)
        reasons.append("Larger buttons and keyboard shortcuts, to reduce precise mouse movement.")
    elif motor == "high":
        changes.update(large_targets=True, keyboard_mode=True, voice_commands=True)
        reasons.append("Larger buttons, keyboard shortcuts and voice commands, so you can use the site hands-free.")
    if intake.get("prefers_audio"):
        changes["text_to_speech"] = True
        reasons.append("Listen controls, because you prefer audio.")
    if intake.get("prefers_captions"):
        changes["captions"] = True
    if intake.get("pace") == "slow":
        changes["speech_rate"] = 0.85
        reasons.append("A slower speaking speed.")
    return changes, reasons


def is_personalised(prefs: dict | None) -> bool:
    """True when any setting differs from the defaults."""
    prefs = prefs or {}
    return any(prefs.get(k, v) != v for k, v in DEFAULT_PREFS.items())
