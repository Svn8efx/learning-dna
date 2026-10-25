"""Guided tutor: pre-written answers built from the lesson text, the topic catalog and the student's own plan.

No AI model is used here. Every answer is written in advance (content_data.py and the texts below) or
assembled from the student's saved plan and quiz results, so the tutor is predictable and works offline.
Typed questions are matched to these answers with simple keyword rules; if nothing matches, the tutor
says so and offers the questions it can answer.
"""
from __future__ import annotations

import re

from learning_dna.content_data import LESSONS
from learning_dna.resources import TOPIC_CATALOG
from learning_dna.services.catalog_service import project_for_topic, rank_catalog_videos, rank_courses, rank_kaggle_datasets
from learning_dna.services.llm_tutor_service import COMPARISON_HINTS

GENERAL_QUESTIONS = [
    ("next", "What should I learn next?"),
    ("weakest", "What is my weakest topic and how do I improve it?"),
    ("what_ml", "What is machine learning?"),
    ("ai_vs_ml", "What is the difference between AI and machine learning?"),
    ("quiz_help", "How does the adaptive quiz work?"),
    ("dna", "How does Learning DNA personalise my learning?"),
    ("access", "How do I change text size, contrast, or listen to lessons?"),
    ("shortcuts", "Which keyboard shortcuts and voice commands can I use?"),
]
GENERAL_IDS = {qid for qid, _ in GENERAL_QUESTIONS}
GENERAL_TEXT = dict(GENERAL_QUESTIONS)

STATIC_ANSWERS = {
    "what_ml": (
        "Machine learning is a way of teaching computers to find patterns in examples instead of giving them step-by-step rules.\n"
        "You show the computer many examples, it learns from them, and then it makes predictions about new cases.\n"
        "A good first path is: Python, then data preprocessing, then classification, then model evaluation."
    ),
    "ai_vs_ml": (
        "Artificial intelligence is the big idea of making computers do things that seem intelligent.\n"
        "Machine learning is one way of doing that: the computer learns from data.\n"
        "Deep learning is a part of machine learning that uses neural networks with many layers."
    ),
    "quiz_help": (
        "The quiz asks a few questions on each topic in your plan.\n"
        "Your score for each topic shows your level: beginner, intermediate or advanced.\n"
        "Topics with low scores are marked as weak, and your learning path puts them first.\n"
        "There is no time limit, so take as long as you need. You can retake the quiz at any time."
    ),
    "dna": (
        "Learning DNA adjusts two things to you.\n"
        "First, what you study: your quiz scores decide your level and the order of your path.\n"
        "Second, how it is shown: the My DNA page asks how you like to learn, and a small model suggests a style "
        "such as audio-first, captioned, or hands-free. It then turns on matching settings like large text, high contrast, "
        "captions, or keyboard shortcuts.\n"
        "Everything is your choice, and you can change any setting in Accessibility."
    ),
    "access": (
        "Open the Accessibility button at the top of any page.\n"
        "There you can make text bigger, turn on high contrast, turn on Listen buttons, ask for video captions, "
        "make buttons larger, and reduce motion.\n"
        "To hear a lesson, open Lessons, choose a topic, and press Listen to this lesson.\n"
        "Your settings are saved for your next visit."
    ),
    "shortcuts": (
        "Turn on Keyboard shortcuts in Accessibility settings first. Then press Alt, Shift and a letter together:\n"
        "H for Home, G for Goals, S for Start, Q for Quiz, D for Dashboard, P for Path, L for Lessons, M for My DNA, "
        "O for Progress, A for Accessibility settings, and R to read the page aloud.\n"
        "Voice commands work in Chrome and Edge. Turn them on in Accessibility settings, allow the microphone, "
        "and say things like go to quiz, read page, stop, bigger text, or high contrast on."
    ),
}

GREETING = re.compile(r"^\s*(hi+|hello+|hey+|hlo+|hola|namaste|good (morning|afternoon|evening)|help)\W*$", re.I)


def _word_in(text: str, phrase: str) -> bool:
    return re.search(r"(?<![a-z0-9])" + re.escape(phrase.lower()) + r"(?![a-z0-9])", text) is not None


def topics_in_text(text: str) -> list[str]:
    """Catalog topics mentioned in the text, matched as whole words (so 'explain' never matches 'ai')."""
    lowered = text.lower()
    found = []
    for topic, meta in TOPIC_CATALOG.items():
        if any(_word_in(lowered, key) for key in [topic] + list(meta.get("aliases", []))):
            found.append(topic)
    return found


def _related(topic: str) -> dict:
    return {
        "videos": rank_catalog_videos(topic, "beginner", max_results=2),
        "courses": rank_courses(topic, "beginner", max_results=2),
        "datasets": rank_kaggle_datasets(topic, "beginner", max_results=2),
        "project": project_for_topic(topic, "beginner"),
    }


def _points(topic: str) -> str:
    return "\n".join(f"{i}. {p}" for i, p in enumerate(LESSONS[topic][1], 1))


def explain(topic: str) -> str:
    overview, _ = LESSONS[topic]
    return (f"{topic.title()}: {overview}\nKey points:\n{_points(topic)}\n"
            "For the full lesson, open Lessons and choose this topic. You can also listen to it there.")


def before(topic: str) -> str:
    prereqs = TOPIC_CATALOG[topic].get("prerequisites", [])
    if not prereqs:
        return f"You can start {topic.title()} without any earlier topic."
    return (f"Before {topic.title()}, it helps to know: {', '.join(p.title() for p in prereqs)}.\n"
            "If one of these feels new, do it first. Your learning path already puts them in a good order.")


def practice(topic: str) -> str:
    idea = TOPIC_CATALOG[topic].get("project", "")
    return f"A practice idea for {topic.title()}: {idea}" if idea else f"Try explaining {topic.title()} in your own words, then take the quiz on it."


def compare(a: str, b: str) -> str | None:
    hint = COMPARISON_HINTS.get((a, b)) or COMPARISON_HINTS.get((b, a))
    if hint:
        return hint
    return None


def next_topic_answer(profile: dict) -> tuple[str, str | None]:
    from learning_dna.learning import _coerce_path_progress, find_learning_order
    topics = profile.get("topics") or []
    if not topics:
        return ("You do not have a study plan yet. Open Start, type the topics you want to learn, and I can suggest what comes next.\n"
                "If you are new, a good first topic is Python.", "python")
    order = find_learning_order(topics)
    progress = _coerce_path_progress(order, profile.get("path_progress"))
    current = next((t for t in order if progress[t] == "in-progress"), None) or next((t for t in order if progress[t] == "recommended"), None)
    if not current:
        return ("You have completed every topic in your plan. Well done. Open Start to add new topics.", None)
    reason = "you have already started it" if progress[current] == "in-progress" else "it is the next unlocked step in your path"
    return (f"Next up: {current.title()}, because {reason}.\n{explain(current)}", current)


def weakest_answer(assessment: list[dict]) -> tuple[str, str | None]:
    scored = [a for a in assessment if "score_pct" in a and a.get("topic") in LESSONS]
    if not scored:
        return ("I need your quiz results first. Open Quiz, answer the questions, and then ask me again.", None)
    worst = min(scored, key=lambda a: a["score_pct"])
    topic = worst["topic"]
    return (f"Your weakest topic is {topic.title()}, with a score of {round(worst['score_pct'])} percent.\n"
            f"{LESSONS[topic][0]}\nTo improve:\n1. Read or listen to the {topic.title()} lesson in Lessons.\n"
            f"2. Watch one video from the related resources on this page.\n3. Try the practice idea: {TOPIC_CATALOG[topic].get('project', 'explain it in your own words')}\n"
            "4. Retake the quiz to see your progress.", topic)


def suggestions(profile: dict | None = None, limit: int = 4) -> list[dict]:
    items = [{"id": qid, "text": text} for qid, text in GENERAL_QUESTIONS[:3]]
    topics = (profile or {}).get("topics") or ["python"]
    items.append({"id": f"explain:{topics[0]}", "text": f"Explain {topics[0]} in simple words"})
    return items[:limit]


def answer_by_id(qid: str, profile: dict, assessment: list[dict]) -> dict | None:
    topic = None
    if qid == "next":
        text, topic = next_topic_answer(profile)
    elif qid == "weakest":
        text, topic = weakest_answer(assessment)
    elif qid in STATIC_ANSWERS:
        text = STATIC_ANSWERS[qid]
    elif ":" in qid:
        kind, _, value = qid.partition(":")
        if kind in {"explain", "before", "practice"} and value in LESSONS:
            topic = value
            text = {"explain": explain, "before": before, "practice": practice}[kind](value)
        elif kind == "compare" and "|" in value:
            a, b = value.split("|", 1)
            text = compare(a, b)
            if not text:
                return None
            topic = a
        else:
            return None
    else:
        return None
    return {"answer": text, "topic": topic}


def answer_typed(text: str, profile: dict, assessment: list[dict]) -> dict | None:
    """Match typed words to a pre-written answer. Returns None if nothing fits."""
    q = text.lower().strip()
    mentioned = topics_in_text(q)

    if GREETING.match(q):
        return {"answer": "Hello! I can answer set questions about your learning. Choose one below, or type a topic like neural networks.", "topic": None, "greeting": True}
    if len(mentioned) >= 2 and re.search(r"\b(vs|versus|compare|comparison|difference|differ)\b", q):
        for a in mentioned:
            for b in mentioned:
                if a != b and compare(a, b):
                    return {"answer": compare(a, b), "topic": a}
        return {"answer": f"{explain(mentioned[0])}\n\n{explain(mentioned[1])}", "topic": mentioned[0]}
    if mentioned:
        topic = mentioned[0]
        if re.search(r"\b(before|prerequisite|prerequisites|need to know|start with|first)\b", q):
            return {"answer": before(topic), "topic": topic}
        if re.search(r"\b(practice|project|mini project|exercise|idea|try)\b", q):
            return {"answer": practice(topic), "topic": topic}
        return {"answer": explain(topic), "topic": topic}
    if re.search(r"\b(learn next|study next|what next|next topic|what should i (learn|study))\b", q):
        text_, topic = next_topic_answer(profile)
        return {"answer": text_, "topic": topic}
    if re.search(r"\b(weak|weakest|improve|struggling|low score)\b", q):
        text_, topic = weakest_answer(assessment)
        return {"answer": text_, "topic": topic}
    if re.search(r"\b(shortcut|shortcuts|voice command|voice commands)\b", q):
        return {"answer": STATIC_ANSWERS["shortcuts"], "topic": None}
    if re.search(r"\b(text size|font|contrast|listen|read aloud|caption|captions|accessibility|accessible|settings)\b", q):
        return {"answer": STATIC_ANSWERS["access"], "topic": None}
    if re.search(r"\b(personalis|personaliz|learning dna|my dna)\w*", q):
        return {"answer": STATIC_ANSWERS["dna"], "topic": None}
    if re.search(r"\bquiz\b", q):
        return {"answer": STATIC_ANSWERS["quiz_help"], "topic": None}
    if re.search(r"\b(difference|different|vs|versus)\b.*\b(ai|artificial intelligence)\b", q) or re.search(r"\b(ai)\b.*\b(vs|versus|difference)\b", q):
        return {"answer": STATIC_ANSWERS["ai_vs_ml"], "topic": None}
    if re.search(r"\b(what is|what's|define|explain)\b.*\b(machine learning|ml)\b", q) or q in {"machine learning", "ml"}:
        return {"answer": STATIC_ANSWERS["what_ml"], "topic": None}
    return None


def not_understood(profile: dict) -> dict:
    return {
        "answer": ("I am not sure I understood that. I am a guided tutor with set answers, not a live AI, so I can only help with the questions below.\n"
                   "You can also type a topic name, such as classification or neural networks."),
        "topic": None,
        "suggestions": suggestions(profile),
    }


def quick_questions(profile: dict) -> dict:
    plan_topics = [t for t in (profile or {}).get("topics", []) if t in LESSONS]
    return {
        "general": [{"id": qid, "text": text} for qid, text in GENERAL_QUESTIONS],
        "topics": sorted(LESSONS),
        "plan_topics": plan_topics,
    }
