"""Learning-path routes: step status, resources, and resource tracking."""
import time

from flask import Blueprint, jsonify, request

from learning_dna.learning import *  # noqa: F401,F403
from learning_dna.learning import _build_learning_path, _dashboard_payload, _default_path_progress
from learning_dna.learning import _coerce_path_progress, _normalize_step_status, _status_label
from learning_dna.learning import _activity_metrics, _compute_learning_score, _resolve_topic_for_resources, _topic_resource_payload
from learning_dna.store import state

bp = Blueprint("path", __name__)


@bp.route('/api/path/update', methods=['POST'])
def api_path_update():
    profile = state.get('profile')
    if not profile:
        return jsonify({'ok': False, 'error': 'Start your plan first.'}), 400
    data = request.get_json(silent=True) or {}
    topic = normalize_topic(data.get('topic') or '')
    status = (data.get('status') or '').strip().lower()
    if topic not in profile.get('topics', []):
        return jsonify({'ok': False, 'error': 'Unknown topic for this plan.'}), 400
    if status not in {'recommended', 'in-progress', 'completed', 'locked'}:
        return jsonify({'ok': False, 'error': 'Invalid path status.'}), 400
    progress = _coerce_path_progress(profile.get('topics', []), profile.get('path_progress', {}))
    progress[topic] = status
    topics = profile.get('topics', [])
    if status == 'completed':
        idx = topics.index(topic)
        if idx + 1 < len(topics) and progress[topics[idx + 1]] == 'locked':
            progress[topics[idx + 1]] = 'recommended'
    elif status == 'in-progress':
        for prereq in TOPIC_CATALOG.get(topic, {}).get('prerequisites', []):
            if prereq in topics and progress.get(prereq) == 'locked':
                progress[prereq] = 'recommended'
    profile['path_progress'] = progress
    profile.setdefault("activity", {"quiz_attempts": 0, "completed_actions": 0, "tutor_questions": 0})
    if status in {'completed', 'in-progress'}:
        profile['activity']['completed_actions'] = int(profile['activity'].get('completed_actions', 0)) + 1
    state['profile'] = profile
    return jsonify({'ok': True, **_dashboard_payload()})


@bp.route('/api/path/step/update', methods=['POST'])
def api_path_step_update():
    profile = state.get('profile')
    if not profile:
        return jsonify({'ok': False, 'error': 'Start your plan first.'}), 400
    data = request.get_json(silent=True) or {}
    topic = normalize_topic(data.get('topic') or '')
    status = _normalize_step_status(data.get('status') or '')
    if topic not in profile.get('topics', []):
        return jsonify({'ok': False, 'error': 'Unknown topic for this plan.'}), 400
    progress = _coerce_path_progress(profile.get('topics', []), profile.get('path_progress', {}))
    progress[topic] = status
    topics = profile.get('topics', [])
    if status == 'completed':
        idx = topics.index(topic)
        if idx + 1 < len(topics) and progress[topics[idx + 1]] == 'locked':
            progress[topics[idx + 1]] = 'recommended'
    elif status == 'in-progress':
        for prereq in TOPIC_CATALOG.get(topic, {}).get('prerequisites', []):
            if prereq in topics and progress.get(prereq) == 'locked':
                progress[prereq] = 'recommended'
    profile['path_progress'] = progress
    profile.setdefault('activity', {'quiz_attempts': 0, 'completed_actions': 0, 'tutor_questions': 0})
    profile['activity']['completed_actions'] = int(profile['activity'].get('completed_actions', 0)) + 1
    state['profile'] = profile
    return jsonify({'ok': True, **_dashboard_payload()})


@bp.route('/api/path/resources')
def api_path_resources():
    profile = state.get('profile')
    if not profile or not profile.get('topics'):
        return jsonify({'ok': False, 'error': 'No learning plan exists yet.'}), 400
    topic_query = request.args.get('topic', '')
    topic = _resolve_topic_for_resources(topic_query, profile)
    if not topic:
        return jsonify({'ok': False, 'error': 'Topic not found in your current syllabus.'}), 400
    assessment = state.get('assessment') or []
    level = next((r['predicted_level'] for r in assessment if r['topic'] == topic), 'beginner')
    resources = _topic_resource_payload(topic, level)
    return jsonify({'ok': True, 'topic': topic, 'resources': resources})


@bp.route('/api/path/video/track', methods=['POST'])
def api_path_video_track():
    profile = state.get('profile')
    if not profile or not profile.get('topics'):
        return jsonify({'ok': False, 'error': 'Start your plan first.'}), 400
    data = request.get_json(silent=True) or {}
    topic = _resolve_topic_for_resources(data.get('topic', ''), profile)
    if not topic:
        return jsonify({'ok': False, 'error': 'Invalid topic.'}), 400
    url = (data.get('url') or '').strip()
    watched_seconds = int(data.get('watched_seconds') or 0)
    watched_pct = float(data.get('watched_pct') or 0)
    event = (data.get('event') or '').strip().lower()
    video_activity = profile.setdefault('video_activity', {}).setdefault(topic, {})
    entry = video_activity.setdefault(url, {'clicks': 0, 'watched_seconds': 0, 'watched_pct': 0.0, 'events': []})
    if event == 'start':
        entry['events'].append({'event': 'start', 'at': time.time()})
    if watched_seconds:
        entry['watched_seconds'] = max(entry['watched_seconds'], watched_seconds)
    if watched_pct:
        entry['watched_pct'] = max(entry['watched_pct'], watched_pct)
    if event == 'click':
        entry['clicks'] = int(entry.get('clicks', 0)) + 1
    if watched_pct >= 40 and profile.get('path_progress', {}).get(topic) not in {'in-progress', 'completed'}:
        profile['path_progress'] = _coerce_path_progress(profile.get('topics', []), profile.get('path_progress', {}))
        profile['path_progress'][topic] = 'in-progress'
    if watched_pct >= 80:
        profile.setdefault('activity', {'quiz_attempts': 0, 'completed_actions': 0, 'tutor_questions': 0})
        profile['activity']['completed_actions'] = int(profile['activity'].get('completed_actions', 0)) + 1
    state['profile'] = profile
    return jsonify({'ok': True, **_dashboard_payload()})


@bp.route('/api/path/course/track', methods=['POST'])
def api_path_course_track():
    profile = state.get('profile')
    if not profile or not profile.get('topics'):
        return jsonify({'ok': False, 'error': 'Start your plan first.'}), 400
    data = request.get_json(silent=True) or {}
    topic = _resolve_topic_for_resources(data.get('topic', ''), profile)
    if not topic:
        return jsonify({'ok': False, 'error': 'Invalid topic.'}), 400
    url = (data.get('url') or '').strip()
    action = (data.get('action') or '').strip().lower()
    if not url or action not in {'click', 'completed'}:
        return jsonify({'ok': False, 'error': 'Invalid course track payload.'}), 400
    course_activity = profile.setdefault('course_activity', {}).setdefault(topic, {})
    entry = course_activity.setdefault(url, {'clicks': 0, 'revisits': 0, 'completed': False, 'last_action': None})
    if action == 'click':
        entry['clicks'] = int(entry.get('clicks', 0)) + 1
        entry['revisits'] = int(entry.get('revisits', 0)) + 1
        entry['last_action'] = 'click'
    elif action == 'completed':
        entry['completed'] = True
        entry['last_action'] = 'completed'
    profile.setdefault('activity', {'quiz_attempts': 0, 'completed_actions': 0, 'tutor_questions': 0})
    profile['activity']['completed_actions'] = int(profile['activity'].get('completed_actions', 0)) + 1
    if action == 'completed' and profile.get('path_progress', {}).get(topic) == 'locked':
        profile['path_progress'] = _coerce_path_progress(profile.get('topics', []), profile.get('path_progress', {}))
        profile['path_progress'][topic] = 'recommended'
    state['profile'] = profile
    return jsonify({'ok': True, **_dashboard_payload()})


@bp.route('/api/path/progress')
def api_path_progress():
    profile = state.get('profile')
    if not profile:
        return jsonify({'ok': False, 'error': 'Start your plan first.'}), 400
    assessment = state.get('assessment') or []
    metrics = _activity_metrics(profile, assessment)
    return jsonify({
        'ok': True,
        'pathProgress': profile.get('path_progress', {}),
        'learningScore': metrics['learning_score'],
        'pathMetrics': metrics,
        'videoActivity': profile.get('video_activity', {}),
        'courseActivity': profile.get('course_activity', {}),
    })
