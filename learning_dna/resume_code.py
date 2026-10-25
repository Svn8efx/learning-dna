"""Resume codes: a password-free way to continue on another device.

A code is three easy words plus a two-digit number, e.g. ``maple-river-tiger-42``.
Anyone who knows the code can open that profile, so it behaves like a password that cannot be reset.
Wrong guesses are rate limited so codes cannot be guessed quickly.
"""
from __future__ import annotations

import re
import secrets
import threading
import time
from collections import deque

from learning_dna.wordlist import WORDS

_FORMAT = re.compile(r"^[a-z]+-[a-z]+-[a-z]+-\d{2}$")


def generate_code() -> str:
    """Three different random words and a number from 10 to 99, joined with hyphens."""
    words = []
    while len(words) < 3:
        word = secrets.choice(WORDS)
        if word not in words:
            words.append(word)
    return "-".join(words) + f"-{secrets.randbelow(90) + 10}"


def normalize_code(raw) -> str:
    """Accepts 'Maple River Tiger 42', 'maple-river-tiger-42.' and similar spoken or typed forms."""
    return "-".join(re.findall(r"[a-z]+|\d+", str(raw or "").lower()))


def is_valid_format(code: str) -> bool:
    return bool(_FORMAT.match(code or ""))


class AttemptLimiter:
    """Counts failed code guesses: a few per visitor, and a cap for the whole server."""

    def __init__(self, per_key=10, per_key_window=600, total=60, total_window=60, clock=time.time):
        self.per_key, self.per_key_window = per_key, per_key_window
        self.total, self.total_window = total, total_window
        self._clock = clock
        self._lock = threading.Lock()
        self._by_key: dict[str, deque] = {}
        self._all: deque = deque()

    @staticmethod
    def _trim(queue: deque, now: float, window: float) -> None:
        while queue and now - queue[0] > window:
            queue.popleft()

    def blocked(self, key: str) -> bool:
        now = self._clock()
        with self._lock:
            self._trim(self._all, now, self.total_window)
            mine = self._by_key.get(key)
            if mine is not None:
                self._trim(mine, now, self.per_key_window)
            return len(self._all) >= self.total or (mine is not None and len(mine) >= self.per_key)

    def record_failure(self, key: str) -> None:
        now = self._clock()
        with self._lock:
            self._all.append(now)
            self._by_key.setdefault(key, deque()).append(now)
