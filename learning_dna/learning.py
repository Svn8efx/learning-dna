"""Core learning logic: topic parsing, path progress, quiz generation, scoring, recommendations.

Moved out of the original single-file app.py. Behaviour is unchanged except that per-student data
now lives behind `state` (see store.py) instead of the Flask session cookie.
"""
from __future__ import annotations

from collections import deque
import os
import random
import re
import time

from learning_dna.resources import QUIZ_QUESTIONS, TOPIC_CATALOG, match_topics_from_text, normalize_topic
from learning_dna.runtime import DATA_INFO, DATASET_REGISTRY_DF, MODEL_BUNDLE
from learning_dna.services.automl_service import predict_level_with_models, predict_score_with_models
from learning_dna.services.catalog_service import (
    project_for_topic,
    rank_courses,
    rank_kaggle_datasets,
    rank_live_and_dataset_videos,
    rank_catalog_videos,
)
from learning_dna.services.youtube_service import search_youtube_videos, youtube_api_available
from learning_dna.accessibility import clean_preferences
from learning_dna.store import state

AI_FEATURES = [
    'LLM-ready tutor with doubt solving and local RAG fallback',
    'Embeddings-style retrieval over topic notes, datasets, and prerequisites',
    'Topic-aware adaptive quiz generation',
    'Weak-topic detection and learning score tracking',
    'Personalized path tracking with unlock logic',
    'Course, video, dataset, and mini-project recommendations',
    'AI/ML topic graph with prerequisite ordering',
]
ML_FEATURES = [
    'Performance prediction with classification and regression models',
    'Real-dataset ingestion for OULAD, UCI, and optional Kaggle score datasets',
    'Recommendation ranking for courses and videos',
    'Difficulty-aware quiz sequencing',
    'Path-based mastery scoring',
]


def level_from_score(score_pct: float) -> str:
    if score_pct < 45:
        return "beginner"
    if score_pct < 75:
        return "intermediate"
    return "advanced"


def _dedupe(items: list[str]) -> list[str]:
    return list(dict.fromkeys(items))


def parse_topics(syllabus_text: str, target_goal: str = "") -> list[str]:
    raw_tokens = []
    for token in re.split(r"[,\n;/|]+", f"{syllabus_text},{target_goal}"):
        token = token.strip()
        if token:
            raw_tokens.append(token)
    normalized = [normalize_topic(t) for t in raw_tokens]
    matched = match_topics_from_text(f"{syllabus_text}, {target_goal}")
    combined = []
    for topic in normalized + matched:
        if topic in TOPIC_CATALOG:
            combined.append(topic)
    return _dedupe(combined) or ["python"]


def find_learning_order(topics: list[str]) -> list[str]:
    known = [t for t in topics if t in TOPIC_CATALOG]
    unknown = [t for t in topics if t not in TOPIC_CATALOG]
    graph = {k: v.get("prerequisites", []) for k, v in TOPIC_CATALOG.items()}
    indegree = {t: 0 for t in known}
    dependents = {t: [] for t in known}
    for t in known:
        for pre in graph.get(t, []):
            if pre in indegree:
                indegree[t] += 1
                dependents[pre].append(t)
    queue = deque(sorted([t for t, d in indegree.items() if d == 0]))
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in dependents.get(node, []):
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return _dedupe(order + known + unknown)


def recommend_recent_algorithms(avg_score: float) -> list[dict]:
    items = [
        {"name": "Gradient Boosting", "why": "Strong on structured student data and excellent for ranking learning readiness."},
        {"name": "Extra Trees", "why": "Fast ensemble baseline that handles mixed numeric and categorical learning signals well."},
        {"name": "AutoML", "why": "Tries multiple models and selects the best one automatically for your dataset."},
        {"name": "Hybrid Recommendation", "why": "Combines live YouTube API results with curated video and course datasets."},
        {"name": "Adaptive Quiz Engine", "why": "Generates topic-aware question variants from syllabus keywords, prerequisites, and project goals."},
        {"name": "Learning Path Tracker", "why": "Detects started, in-progress, and completed topics and updates progress in real time."},
        {"name": "Topic-Aware Tutor", "why": "Answers doubts using the selected syllabus topic, its prerequisites, resources, and the learner profile."},
    ]
    if avg_score >= 70:
        items.extend([
            {"name": "XGBoost / LightGBM", "why": "Common industry boosters for tabular prediction and ranking tasks."},
            {"name": "Semantic Resource Matching", "why": "Improves topic-to-resource matching beyond plain keyword search."},
            {"name": "Transformer and LLM Paths", "why": "Adds advanced AI learning tracks after fundamentals are strong."},
        ])
    else:
        items.append({"name": "Rule Engine + Prerequisite Graph", "why": "Stops learners from skipping fundamentals and preserves the right order."})
    return items


def _default_path_progress(topics: list[str]) -> dict[str, str]:
    progress = {}
    for i, topic in enumerate(topics):
        progress[topic] = "recommended" if i == 0 else "locked"
    return progress


def _coerce_path_progress(topics: list[str], stored: dict | None) -> dict[str, str]:
    progress = _default_path_progress(topics)
    if isinstance(stored, dict):
        for topic, status in stored.items():
            if topic in progress and status in {"completed", "in-progress", "recommended", "locked"}:
                progress[topic] = status
    unlocked_seen = False
    for topic in topics:
        if progress[topic] == "completed":
            unlocked_seen = True
            continue
        if not unlocked_seen and progress[topic] == "locked":
            progress[topic] = "recommended"
            unlocked_seen = True
        elif unlocked_seen and progress[topic] == "locked":
            break
    completed_count = sum(1 for s in progress.values() if s == "completed")
    if completed_count < len(topics):
        next_idx = min(completed_count, len(topics) - 1)
        next_topic = topics[next_idx]
        if progress[next_topic] == "locked":
            progress[next_topic] = "recommended"
    return progress


def _compute_learning_score(assessment: list[dict], progress: dict[str, str], activity: dict | None = None) -> float:
    if not assessment and not progress:
        return 0.0
    activity = activity or {}
    quiz_component = sum(item.get("score_pct", 0) for item in assessment) / max(len(assessment), 1) if assessment else 0.0
    weights = {"locked": 0.0, "recommended": 0.45, "in-progress": 0.7, "completed": 1.0}
    path_component = (sum(weights.get(status, 0.0) for status in progress.values()) / max(len(progress), 1)) * 100 if progress else 0.0
    streak = min(int(activity.get("completed_actions", 0)) * 6, 18)
    recency = min(int(activity.get("quiz_attempts", 0)) * 4, 12)
    score = (quiz_component * 0.6) + (path_component * 0.3) + streak + recency
    return round(min(score, 100.0), 1)


def _normalize_step_status(status: str) -> str:
    normalized = (status or '').strip().lower()
    if normalized in {'not started', 'not_started', 'start', 'recommended'}:
        return 'recommended'
    if normalized in {'in progress', 'in-progress', 'progress'}:
        return 'in-progress'
    if normalized in {'completed', 'done'}:
        return 'completed'
    return 'locked'


def _status_label(status: str) -> str:
    return {
        'completed': 'Completed',
        'in-progress': 'In Progress',
        'recommended': 'Not Started',
        'locked': 'Locked',
    }.get(status, str(status).title())


def _topic_resource_payload(topic: str, level: str) -> dict:
    topic = normalize_topic(topic)
    if topic not in TOPIC_CATALOG:
        topic = next((t for t in TOPIC_CATALOG if topic in TOPIC_CATALOG[t].get('aliases', [])), topic)
    rec = get_recommendations(topic, level, provider='all', video_mode='hybrid')
    return {
        'topic': topic,
        'level': level,
        'videos': rec['videos'][:4],
        'courses': rec['courses'][:4],
        'datasets': rec['datasets'][:3],
        'project': rec['project'],
    }


def _resolve_topic_for_resources(requested_topic: str, profile: dict) -> str | None:
    if not profile or not profile.get('topics'):
        return None
    requested = normalize_topic(requested_topic or '')
    if requested in profile['topics']:
        return requested
    for topic in profile['topics']:
        if requested in TOPIC_CATALOG.get(topic, {}).get('aliases', []):
            return topic
        if requested in TOPIC_CATALOG.get(topic, {}).get('prerequisites', []):
            return topic
    return next((t for t, status in _coerce_path_progress(profile['topics'], profile.get('path_progress', {})).items() if status != 'locked'), profile['topics'][0])


def _activity_metrics(profile: dict, assessment: list[dict]) -> dict:
    topics = profile.get('topics', [])
    completed_topics = sum(1 for status in profile.get('path_progress', {}).values() if status == 'completed')
    topic_completion_pct = round((completed_topics / max(len(topics), 1)) * 100, 1) if topics else 0.0

    quiz_pct = round(sum(r['score_pct'] for r in assessment) / max(len(assessment), 1), 1) if assessment else 0.0

    video_values = []
    for topic, topic_data in profile.get('video_activity', {}).items():
        for rec in topic_data.values():
            if rec.get('watched_pct') is not None:
                video_values.append(rec['watched_pct'])
    video_pct = round(sum(video_values) / max(len(video_values), 1), 1) if video_values else 0.0

    course_clicks = 0
    course_completions = 0
    for topic_data in profile.get('course_activity', {}).values():
        for rec in topic_data.values():
            course_clicks += int(rec.get('clicks', 0))
            if rec.get('completed'):
                course_completions += 1
    course_pct = min(100.0, course_clicks * 10 + course_completions * 25)

    tutor_pct = min(100.0, int(profile.get('activity', {}).get('tutor_questions', 0)) * 25)

    learning_score = round(
        quiz_pct * 0.25 + topic_completion_pct * 0.4 + video_pct * 0.2 + course_pct * 0.1 + tutor_pct * 0.05,
        1,
    )
    return {
        'topic_completion_pct': topic_completion_pct,
        'quiz_pct': quiz_pct,
        'video_pct': video_pct,
        'course_pct': course_pct,
        'tutor_pct': tutor_pct,
        'learning_score': min(100.0, learning_score),
    }


def _shuffle_options(question: dict, rng: random.Random) -> dict:
    options = list(question.get("options", []))
    rng.shuffle(options)
    result = dict(question)
    result["options"] = options
    return result


def _question_variants(topic: str, idx: int, question: dict, rng: random.Random) -> list[dict]:
    stems = [
        question["q"],
        f"Topic check: {question['q']}",
        f"Choose the best answer for {topic.title()}: {question['q']}",
        f"Quick revision: {question['q']}",
        f"Selected syllabus topic: {topic.title()}. {question['q']}",
    ]
    variants = []
    for n, stem in enumerate(stems):
        item = _shuffle_options(question, rng)
        item.update({
            "topic": topic,
            "base_index": idx,
            "index": f"{idx}_{n}_{rng.randint(1000,9999)}",
            "q": stem,
            "difficulty": question.get("difficulty") or ("beginner" if idx == 0 else "intermediate"),
        })
        variants.append(item)
    return variants


def _sample_distractors(topic: str, answer: str, rng: random.Random, pool: list[str], max_count: int = 3) -> list[str]:
    candidates = [p for p in pool if p and p != answer]
    rng.shuffle(candidates)
    return candidates[:max_count]


def _generated_questions_for_topic(topic: str, rng: random.Random) -> list[dict]:
    meta = TOPIC_CATALOG.get(topic, {})
    aliases = meta.get("aliases", [])
    prereqs = meta.get("prerequisites", [])
    all_topics = list(TOPIC_CATALOG.keys())
    difficulty = "advanced" if len(prereqs) >= 3 else "intermediate" if prereqs else "beginner"
    generated = []

    if prereqs:
        answer = prereqs[0]
        options = [answer] + _sample_distractors(topic, answer, rng, all_topics)
        if len(options) >= 2:
            generated.append({
                "q": f"Which topic should usually be learned before {topic.title()}?",
                "options": options,
                "answer": answer,
                "difficulty": difficulty,
            })

    if aliases:
        answer = aliases[0]
        options = [answer] + _sample_distractors(topic, answer, rng, sum([TOPIC_CATALOG[t].get("aliases", []) for t in all_topics], []))
        if len(options) >= 2:
            generated.append({
                "q": f"Which term is most closely related to the syllabus topic {topic.title()}?",
                "options": options,
                "answer": answer,
                "difficulty": "beginner",
            })

    project = meta.get("project", "")
    if project:
        verbs = ["Build", "Predict", "Cluster", "Reduce", "Compare", "Clean", "Analyze"]
        answer = next((v for v in verbs if project.lower().startswith(v.lower())), "Build")
        options = [answer] + _sample_distractors(topic, answer, rng, verbs)
        generated.append({
            "q": f"The recommended mini-project for {topic.title()} mainly asks you to do what?",
            "options": options,
            "answer": answer,
            "difficulty": "intermediate",
        })

    level_keys = [k.title() for k in meta.get("videos", {}).keys()]
    if level_keys:
        answer = "Beginner"
        options = [answer] + _sample_distractors(topic, answer, rng, ["Intermediate", "Advanced", "Expert", "Deployment"])
        generated.append({
            "q": f"If you are starting {topic.title()} from scratch, which learning level should you begin with?",
            "options": options,
            "answer": answer,
            "difficulty": "beginner",
        })

    for item in generated:
        item["options"] = _dedupe(item["options"])
        if item["answer"] not in item["options"]:
            item["options"] = [item["answer"]] + item["options"]
        rng.shuffle(item["options"])
    return generated


def get_topic_quiz(topics: list[str], quiz_seed: int | None = None) -> list[dict]:
    seed = quiz_seed if quiz_seed is not None else time.time_ns()
    rng = random.Random(seed)
    selected_topics = [normalize_topic(t) for t in topics if normalize_topic(t) in QUIZ_QUESTIONS or normalize_topic(t) in TOPIC_CATALOG]
    if not selected_topics:
        selected_topics = ["python"]

    quiz = []
    topic_count = min(max(len(selected_topics), 1), 6)
    per_topic = 3 if topic_count <= 4 else 2
    for topic in selected_topics[:topic_count]:
        bank = list(QUIZ_QUESTIONS.get(topic, [])) + _generated_questions_for_topic(topic, rng)
        variants = []
        for idx, q in enumerate(bank):
            variants.extend(_question_variants(topic, idx, q, rng))
        rng.shuffle(variants)
        seen = set()
        picked = []
        for item in variants:
            sig = (item["q"], tuple(item["options"]))
            if sig in seen:
                continue
            seen.add(sig)
            picked.append(item)
            if len(picked) >= min(per_topic, len(bank)):
                break
        quiz.extend(picked)

    rng.shuffle(quiz)
    return quiz[: min(12, len(quiz))]


def build_topic_results(chosen_topics: list[str], answers: dict, quiz_items: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = {}
    for item in quiz_items:
        grouped.setdefault(normalize_topic(item["topic"]), []).append(item)

    results = []
    scored_topics = [t for t in chosen_topics if normalize_topic(t) in grouped]
    for topic in _dedupe(scored_topics):
        t = normalize_topic(topic)
        items = grouped.get(t, [])
        if not items:
            continue
        correct = 0
        for q in items:
            key = f"{q['topic']}_{q['index']}"
            if answers.get(key) == q["answer"]:
                correct += 1
        score_pct = round((correct / max(len(items), 1)) * 100, 1)
        predicted_level = predict_level_with_models(MODEL_BUNDLE, t, score_pct)
        predicted_exam_score = predict_score_with_models(MODEL_BUNDLE, t, score_pct)
        results.append({
            "topic": t,
            "score_pct": score_pct,
            "predicted_level": predicted_level,
            "predicted_exam_score": predicted_exam_score,
            "next_topics": TOPIC_CATALOG.get(t, {}).get("prerequisites", []),
        })

    if not results:
        score_pct = 0.0
        predicted_level = predict_level_with_models(MODEL_BUNDLE, "python", score_pct)
        results.append({
            "topic": "python",
            "score_pct": score_pct,
            "predicted_level": predicted_level,
            "predicted_exam_score": predict_score_with_models(MODEL_BUNDLE, "python", score_pct),
            "next_topics": TOPIC_CATALOG.get("python", {}).get("prerequisites", []),
        })
    return results


def get_recommendations(topic: str, level: str, provider: str = "all", video_mode: str = "hybrid") -> dict:
    topic = normalize_topic(topic)
    live_videos = search_youtube_videos(topic, max_results=6, level=level) if video_mode in {"hybrid", "live"} else []
    dataset_videos = rank_catalog_videos(topic, level, max_results=6) if video_mode in {"hybrid", "dataset"} else []

    if video_mode == "live":
        videos = live_videos or dataset_videos
        video_source = "live_youtube_api" if live_videos else "youtube_dataset_csv_fallback"
    elif video_mode == "dataset":
        videos = dataset_videos
        video_source = "youtube_dataset_csv"
    else:
        videos = rank_live_and_dataset_videos(topic, level, live_videos, max_results=8)
        if live_videos and dataset_videos:
            video_source = "hybrid_live_plus_dataset"
        elif live_videos:
            video_source = "live_youtube_api"
        else:
            video_source = "youtube_dataset_csv"

    courses = rank_courses(topic, level, provider=provider, max_results=6)
    kaggle_sets = rank_kaggle_datasets(topic, level, max_results=4)
    project = project_for_topic(topic, level)
    if topic in TOPIC_CATALOG:
        if not courses:
            courses = TOPIC_CATALOG[topic]["courses"]
        project = project or TOPIC_CATALOG[topic].get("project", "Practice a small project on this topic.")
    return {
        "videos": videos,
        "courses": courses,
        "project": project,
        "datasets": kaggle_sets,
        "video_source": video_source,
    }


def _build_learning_path(profile: dict, assessment: list[dict]) -> list[dict]:
    topic_levels = {r["topic"]: r["predicted_level"] for r in assessment}
    weak_topics = {r["topic"] for r in assessment if r["score_pct"] < 45}
    completed_topics = {r["topic"] for r in assessment if r["score_pct"] >= 75}
    stored_progress = _coerce_path_progress(profile.get("topics", []), profile.get("path_progress", {}))
    learning_path = []
    for idx, topic in enumerate(profile.get("topics", []), start=1):
        level = topic_levels.get(topic, "beginner")
        rec = _topic_resource_payload(topic, level)
        status = stored_progress.get(topic, "locked")
        if topic in completed_topics:
            status = "completed"
        elif topic in weak_topics and status == "locked":
            status = "recommended"
        video_activity = profile.get('video_activity', {}).get(topic, {})
        course_activity = profile.get('course_activity', {}).get(topic, {})
        video_progress = 0
        if video_activity:
            video_progress = int(max((item.get('watched_pct') or 0) for item in video_activity.values()))
        course_progress = 0
        if course_activity:
            course_completions = sum(1 for item in course_activity.values() if item.get('completed'))
            course_clicks = sum(int(item.get('clicks', 0)) for item in course_activity.values())
            course_progress = min(100, course_completions * 40 + course_clicks * 10)
        learning_path.append({
            "topic": topic,
            "level": level,
            "videos": rec["videos"],
            "courses": rec["courses"],
            "project": rec["project"],
            "datasets": rec["datasets"],
            "prerequisites": TOPIC_CATALOG.get(topic, {}).get("prerequisites", []),
            "order": idx,
            "status": status,
            "mastery": next((r["score_pct"] for r in assessment if r["topic"] == topic), 0.0),
            "video_progress": video_progress,
            "course_progress": course_progress,
            "resource_items": len(rec["videos"]) + len(rec["courses"]) + len(rec["datasets"]),
            "status_label": _status_label(status),
        })
    profile["path_progress"] = {item["topic"]: item["status"] for item in learning_path}
    state["profile"] = profile
    return learning_path


def _build_resources(profile: dict, assessment: list[dict]) -> list[dict]:
    if not profile or not profile.get('topics'):
        return []
    topic_levels = {r["topic"]: r["predicted_level"] for r in assessment} if assessment else {}
    resources = []
    for topic in profile['topics']:
        level = topic_levels.get(topic, "beginner")
        rec = _topic_resource_payload(topic, level)
        resources.append({"topic": topic, "level": level, **rec})
    return resources


def _dashboard_core():
    profile = state.get("profile")
    assessment = state.get("assessment")
    if not profile:
        return {
            "profile": None,
            "assessment": [],
            "avgScore": 0,
            "strengths": [],
            "weakTopics": [],
            "modelScores": MODEL_BUNDLE.leaderboard,
            "modelName": MODEL_BUNDLE.best_model_name,
            "automlEngine": MODEL_BUNDLE.engine,
            "dataInfo": DATA_INFO,
            "modernFeatures": recommend_recent_algorithms(0),
            "youtubeLive": youtube_api_available(),
            "learningPath": [],
            "resources": [],
            "quizItems": state.get("quiz_items", []),
            "notifications": [],
            "availableTopics": sorted(TOPIC_CATALOG.keys()),
            "learningScore": 0,
            "pathProgress": {},
            "aiFeatures": AI_FEATURES,
            "mlFeatures": ML_FEATURES,
            "datasetRegistry": DATASET_REGISTRY_DF.to_dict(orient="records"),
            "datasetSources": DATA_INFO.get("sources", []),
            "llmMode": "openai" if os.environ.get("OPENAI_API_KEY") else "local_rag_fallback",
        }
    assessment = assessment or []
    avg_score = round(sum(r["score_pct"] for r in assessment) / max(len(assessment), 1), 1) if assessment else 0
    strengths = [r["topic"] for r in assessment if r["score_pct"] >= 75]
    weak = [r["topic"] for r in assessment if r["score_pct"] < 45]
    learning_path = _build_learning_path(profile, assessment) if profile.get("topics") else []
    resources = _build_resources(profile, assessment) if profile.get("topics") else []
    notifications = []
    if weak:
        notifications.append({"type": "warning", "title": "Focus next", "message": f"Revise {weak[0].title()} first before moving to harder topics."})
    if strengths:
        notifications.append({"type": "success", "title": "Strong area", "message": f"You are doing well in {strengths[0].title()}."})
    if profile.get("topics"):
        notifications.append({"type": "info", "title": "Plan ready", "message": f"{len(profile['topics'])} syllabus topics were mapped into your study plan."})
    activity = profile.get("activity", {})
    path_metrics = _activity_metrics(profile, assessment)
    learning_score = path_metrics["learning_score"]
    if learning_score >= 80:
        notifications.append({"type": "success", "title": "Learning score rising", "message": f"Your adaptive learning score is now {learning_score}%."})
    return {
        "profile": profile,
        "assessment": assessment,
        "avgScore": avg_score,
        "strengths": strengths,
        "weakTopics": weak,
        "modelScores": MODEL_BUNDLE.leaderboard,
        "modelName": MODEL_BUNDLE.best_model_name,
        "automlEngine": MODEL_BUNDLE.engine,
        "dataInfo": DATA_INFO,
        "modernFeatures": recommend_recent_algorithms(avg_score),
        "youtubeLive": youtube_api_available(),
        "learningPath": learning_path,
        "resources": resources,
        "quizItems": state.get("quiz_items", []),
        "notifications": notifications,
        "availableTopics": sorted(TOPIC_CATALOG.keys()),
        "learningScore": learning_score,
        "pathMetrics": path_metrics,
        "pathProgress": profile.get("path_progress", {}),
        "videoActivity": profile.get("video_activity", {}),
        "courseActivity": profile.get("course_activity", {}),
        "aiFeatures": AI_FEATURES,
        "mlFeatures": ML_FEATURES,
        "datasetRegistry": DATASET_REGISTRY_DF.to_dict(orient="records"),
        "datasetSources": DATA_INFO.get("sources", []),
        "llmMode": "openai" if os.environ.get("OPENAI_API_KEY") else "local_rag_fallback",
    }


def _dashboard_payload():
    """Dashboard data plus the student's accessibility settings and need profile."""
    payload = _dashboard_core()
    payload["accessibility"] = {
        "preferences": clean_preferences(None, state.get("a11y_preferences")),
        "needProfile": state.get("need_profile"),
    }
    return payload
