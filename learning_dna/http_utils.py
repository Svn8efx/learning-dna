"""Small helpers for reading request data safely (wrong types must give a clear 400, never a crash)."""
from __future__ import annotations

import math

from flask import request
from werkzeug.exceptions import BadRequest


def json_body() -> dict:
    """The JSON object sent by the browser. An empty or unreadable body counts as {}; a non-object is a 400."""
    data = request.get_json(silent=True)
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise BadRequest("Send the data as a JSON object.")
    return data


def clean_text(value, limit: int = 2000) -> str:
    """A stripped string no longer than `limit`. Anything that is not text becomes ''."""
    return value.strip()[:limit] if isinstance(value, str) else ""


def clean_number(value, low: float, high: float, default: float = 0.0) -> float:
    """A finite number inside [low, high]. Text, lists, NaN and infinity become `default`."""
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return default
    try:
        number = float(value)
    except ValueError:
        return default
    if not math.isfinite(number):
        return default
    return min(high, max(low, number))
