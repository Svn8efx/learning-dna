"""Accessible lesson content (module 3). Text-first so it works with screen readers and text-to-speech."""
from __future__ import annotations

from learning_dna.content_data import LESSONS
from learning_dna.resources import TOPIC_CATALOG, normalize_topic
from learning_dna.store import store

WORDS_PER_MINUTE = 150  # comfortable listening speed


def _build_lesson(topic: str) -> dict:
    overview, points = LESSONS[topic]
    meta = TOPIC_CATALOG[topic]
    prereqs = meta.get("prerequisites", [])
    prereq_text = ("Before this topic, it helps to know: " + ", ".join(prereqs) + ".") if prereqs else \
        "You can start this topic without any earlier topic."
    practice = meta.get("project", "")
    sections = [
        {"heading": "Overview", "text": overview},
        {"heading": "Key points", "items": points},
        {"heading": "Before you start", "text": prereq_text},
    ]
    if practice:
        sections.append({"heading": "Practice idea", "text": practice})

    transcript_parts = [topic.title() + ".", overview, "Key points."]
    transcript_parts += [f"Point {i}. {p}" for i, p in enumerate(points, 1)]
    transcript_parts += [prereq_text] + (["Practice idea. " + practice] if practice else [])
    transcript = " ".join(transcript_parts)
    return {
        "topic": topic,
        "title": topic.title(),
        "sections": sections,
        "transcript": transcript,
        "reading_minutes": max(1, round(len(transcript.split()) / WORDS_PER_MINUTE)),
    }


def get_lesson(raw_topic: str) -> dict | None:
    topic = normalize_topic(raw_topic or "")
    if topic not in TOPIC_CATALOG or topic not in LESSONS:
        return None
    lesson = store.get_content(topic)
    if not lesson:
        lesson = _build_lesson(topic)
        store.upsert_content(topic, lesson)       # cache lessons in the `content` collection
    return lesson


def list_lessons() -> list[dict]:
    return [{"topic": t, "title": t.title()} for t in sorted(LESSONS)]
