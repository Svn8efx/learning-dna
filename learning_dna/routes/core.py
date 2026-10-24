"""Core routes: status, plan creation, adaptive quiz, dashboard context, search, tutor."""
import os
import time

from flask import Blueprint, jsonify, request

from learning_dna.accessibility import clean_preferences, is_personalised
from learning_dna.learning import *  # noqa: F401,F403
from learning_dna.learning import _dashboard_payload, _default_path_progress
from learning_dna.monitoring import record_event
from learning_dna.services.llm_tutor_service import generate_tutor_reply
from learning_dna.store import state, store

bp = Blueprint("core", __name__)


@bp.route("/")
def index():
    return jsonify({
        "message": "Backend API is running. Start the React frontend with npm start and open http://localhost:3000",
        "frontend": "http://localhost:3000",
        "api_status": "/api/status",
    })


@bp.route('/api/status')
def api_status():
    return jsonify({
        "ok": True, "app": "Learning DNA", "real_data_used": DATA_INFO["real_data_used"],
        "rows": DATA_INFO["rows"], "engine": MODEL_BUNDLE.engine, "storage": store.name,
    })


@bp.route('/api/start', methods=['POST'])
def api_start():
    data = request.get_json(silent=True) or {}
    syllabus_text = (data.get('syllabus_text') or '').strip()
    target_goal = (data.get('target_goal') or '').strip()
    topics = find_learning_order(parse_topics(syllabus_text, target_goal))
    quiz_seed = int(time.time() * 1000)
    quiz_items = get_topic_quiz(topics, quiz_seed=quiz_seed)
    profile = {
        'syllabus_text': syllabus_text,
        'target_goal': target_goal,
        'topics': topics,
        'quiz_seed': quiz_seed,
        'path_progress': _default_path_progress(topics),
        'activity': {
            'quiz_attempts': 0,
            'completed_actions': 0,
            'tutor_questions': 0,
        },
        'video_activity': {},
        'course_activity': {},
    }
    state['profile'] = profile
    state['quiz_items'] = quiz_items
    state.pop('assessment', None)
    state.pop('answers', None)
    return jsonify({
        'ok': True,
        'profile': profile,
        'quizItems': quiz_items,
        'availableTopics': topics,
    })


@bp.route('/api/quiz', methods=['GET', 'POST'])
def api_quiz():
    profile = state.get('profile')
    if not profile:
        return jsonify({'ok': False, 'error': 'Start your plan first.'}), 400

    if request.method == 'GET':
        force_new = request.args.get('refresh') == '1'
        if force_new or not state.get('quiz_items'):
            quiz_seed = int(time.time() * 1000)
            profile['quiz_seed'] = quiz_seed
            profile.setdefault("activity", {"quiz_attempts": 0, "completed_actions": 0})
            state['profile'] = profile
            state['quiz_items'] = get_topic_quiz(profile['topics'], quiz_seed=quiz_seed)
        return jsonify({'ok': True, 'quizItems': state.get('quiz_items', []), 'topics': profile['topics']})

    data = request.get_json(silent=True) or {}
    answers = data.get('answers') or {}
    quiz_items = state.get('quiz_items') or get_topic_quiz(profile['topics'], quiz_seed=profile.get('quiz_seed'))
    results = build_topic_results(profile['topics'], answers, quiz_items)
    profile.setdefault('activity', {'quiz_attempts': 0, 'completed_actions': 0})
    profile['activity']['quiz_attempts'] = int(profile['activity'].get('quiz_attempts', 0)) + 1
    state['profile'] = profile
    state['assessment'] = results
    state['answers'] = answers
    avg_score = round(sum(r['score_pct'] for r in results) / max(len(results), 1), 1)
    prefs = clean_preferences(None, state.get('a11y_preferences'))
    sid = state.student_id()
    store.add_quiz_result(sid, {
        'ts': time.time(), 'avg_score': avg_score, 'topics': list(profile['topics']),
        'personalised': is_personalised(prefs),
    })
    record_event(sid, 'quiz_submit', meta={'avg_score': avg_score})
    payload = _dashboard_payload()
    return jsonify({'ok': True, **payload})


@bp.route('/api/context')
def api_context():
    return jsonify(_dashboard_payload())


@bp.route('/api/reset', methods=['POST'])
def api_reset():
    state.clear_plan()
    return jsonify({'ok': True})


@bp.route('/api/search')
def api_search():
    query = (request.args.get('q') or '').strip().lower()
    payload = _dashboard_payload()
    pool = []
    for card in payload.get('resources', []):
        for course in card.get('courses', []):
            pool.append({'kind': 'course', 'topic': card['topic'], 'title': course.get('title', ''), 'url': course.get('url', ''), 'provider': course.get('provider', '')})
        for video in card.get('videos', []):
            pool.append({'kind': 'video', 'topic': card['topic'], 'title': video.get('title', ''), 'url': video.get('url', ''), 'provider': video.get('channel', '')})
        for ds in card.get('datasets', []):
            pool.append({'kind': 'dataset', 'topic': card['topic'], 'title': ds.get('title', ''), 'url': ds.get('url', ''), 'provider': ds.get('source', '')})
    if not query:
        return jsonify({'ok': True, 'results': pool[:10]})
    results = [item for item in pool if query in item['title'].lower() or query in item['topic'].lower() or query in item.get('provider', '').lower()]
    return jsonify({'ok': True, 'results': results[:12]})


@bp.route('/api/notifications')
def api_notifications():
    payload = _dashboard_payload()
    return jsonify({'ok': True, 'notifications': payload.get('notifications', [])})


@bp.route('/api/tutor', methods=['POST'])
def api_tutor():
    data = request.get_json(silent=True) or {}
    raw_question = (data.get('question') or '').strip()
    profile = state.get('profile') or {}
    assessment = state.get('assessment') or []
    if not raw_question:
        return jsonify({'ok': False, 'error': 'Ask a question first.'}), 400
    if profile.get('topics'):
        profile.setdefault('activity', {'quiz_attempts': 0, 'completed_actions': 0, 'tutor_questions': 0})
        profile['activity']['tutor_questions'] = int(profile['activity'].get('tutor_questions', 0)) + 1
        state['profile'] = profile
    else:
        # No study plan yet: answer from a few general topics, and do not save a plan
        profile = {'topics': ['python', 'classification', 'neural networks'], 'level': 'beginner'}
    reply = generate_tutor_reply(raw_question, profile, assessment)
    return jsonify({
        'ok': True,
        'answer': reply.answer,
        'topic': reply.detected_topic,
        'mode': reply.mode,
        'retrieved': reply.retrieved_chunks,
        'related_resources': reply.related_resources,
    })


@bp.route('/api/features')
def api_features():
    return jsonify({
        'ok': True,
        'aiFeatures': AI_FEATURES,
        'mlFeatures': ML_FEATURES,
        'datasets': DATASET_REGISTRY_DF.to_dict(orient='records'),
        'dataInfo': DATA_INFO,
        'llmMode': 'openai' if os.environ.get('OPENAI_API_KEY') else 'local_rag_fallback',
    })
