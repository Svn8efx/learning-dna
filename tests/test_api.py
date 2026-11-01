"""API tests. They use the in-memory store, and a mongomock-backed store when mongomock is installed."""
import pytest

from learning_dna import create_app
from learning_dna import store as store_module


@pytest.fixture(params=["memory", "mongomock"])
def client(request):
    app = create_app(store_backend="memory")
    if request.param == "mongomock":
        mongomock = pytest.importorskip("mongomock")
        store = store_module.MongoStore.__new__(store_module.MongoStore)
        store.client = mongomock.MongoClient()
        store.db = store.client["test"]
        store_module.store.impl = store
    return app.test_client()


def start_plan(client):
    r = client.post("/api/start", json={"syllabus_text": "python, classification, neural networks", "target_goal": ""})
    assert r.status_code == 200
    return r.get_json()


def test_status_reports_storage(client):
    data = client.get("/api/status").get_json()
    assert data["ok"] and data["app"] == "Learning DNA" and data["storage"] in {"memory", "mongodb"}


def test_plan_quiz_and_persistence(client):
    start_plan(client)
    quiz = client.get("/api/quiz").get_json()
    assert quiz["ok"] and quiz["quizItems"]
    answers = {str(i): q["options"][0] for i, q in enumerate(quiz["quizItems"])}
    result = client.post("/api/quiz", json={"answers": answers}).get_json()
    assert result["ok"] and result["assessment"]
    ctx = client.get("/api/context").get_json()          # data must survive across requests
    assert ctx["profile"]["topics"] and ctx["assessment"]
    assert "accessibility" in ctx


def test_preferences_are_validated_and_saved(client):
    r = client.put("/api/accessibility/preferences", json={"font_scale": 999, "high_contrast": True, "evil": 1}).get_json()
    assert r["preferences"]["font_scale"] == 200 and r["preferences"]["high_contrast"] is True
    assert "evil" not in r["preferences"]
    assert client.get("/api/accessibility/preferences").get_json()["preferences"]["font_scale"] == 200


def test_intake_uses_classifier_and_applies_settings(client):
    r = client.post("/api/profile/intake", json={"vision": "high", "prefers_audio": True}).get_json()
    assert r["ok"] and r["needProfile"]["mode"] == "audio_first"
    assert r["preferences"]["text_to_speech"] and r["preferences"]["high_contrast"]
    assert r["needProfile"]["drivers"]
    assert all(d["feature"] != "recent quiz score" for d in r["needProfile"]["drivers"])
    r = client.post("/api/profile/intake", json={"motor": "high"}).get_json()
    assert r["needProfile"]["mode"] == "hands_free" and r["preferences"]["voice_commands"]


def test_lessons(client):
    lesson = client.get("/api/content/neural networks").get_json()["lesson"]
    assert lesson["transcript"] and lesson["sections"]
    assert client.get("/api/content/not-a-topic").status_code == 404


def test_monitoring(client):
    start_plan(client)
    client.get("/api/content/python")
    assert client.post("/api/monitor/event", json={"type": "tts_used"}).status_code == 200
    assert client.post("/api/monitor/event", json={"type": "bogus"}).status_code == 400
    quiz = client.get("/api/quiz").get_json()
    client.post("/api/quiz", json={"answers": {}})
    client.put("/api/accessibility/preferences", json={"high_contrast": True})
    client.post("/api/quiz", json={"answers": {}})
    s = client.get("/api/monitor/summary").get_json()["summary"]
    assert s["engagement"]["lessons_viewed"] == 1
    assert s["accessibility_usage"]["text_to_speech_uses"] == 1
    assert len(s["quiz_trend"]) == 2
    assert s["personalisation_effect"]["status"] == "available"


def test_reset_keeps_accessibility_settings(client):
    start_plan(client)
    client.put("/api/accessibility/preferences", json={"font_scale": 150})
    client.post("/api/reset")
    assert client.get("/api/context").get_json()["profile"] is None
    assert client.get("/api/accessibility/preferences").get_json()["preferences"]["font_scale"] == 150


def test_students_are_isolated(client):
    start_plan(client)
    other = client.application.test_client()
    assert other.get("/api/context").get_json()["profile"] is None


def test_tutor_answers_without_a_plan_and_does_not_create_one(client):
    r = client.post("/api/tutor", json={"question": "What is classification?"})
    assert r.status_code == 200 and r.get_json()["answer"]
    assert client.post("/api/tutor", json={"question": "hi"}).status_code == 200
    assert client.get("/api/context").get_json()["profile"] is None


# ---- guided tutor (pre-written answers) ----
def ask(client, **body):
    return client.post("/api/tutor", json=body)


def test_tutor_question_list(client):
    data = client.get("/api/tutor/questions").get_json()
    assert data["ok"] and len(data["general"]) >= 6 and "classification" in data["topics"]


def test_every_button_question_has_an_answer(client):
    start_plan(client)
    client.post("/api/quiz", json={"answers": {}})
    ids = [q["id"] for q in client.get("/api/tutor/questions").get_json()["general"]]
    ids += ["explain:neural networks", "before:neural networks", "practice:clustering", "compare:classification|clustering"]
    for qid in ids:
        r = ask(client, question_id=qid)
        assert r.status_code == 200 and len(r.get_json()["answer"]) > 40, qid


def test_different_questions_give_different_answers(client):
    answers = {ask(client, question=q).get_json()["answer"] for q in [
        "explain neural networks", "what is clustering", "what do I need before transformers",
        "give me a project for nlp", "classification vs clustering", "how do I change the text size"]}
    assert len(answers) == 6


def test_typed_matching_and_word_boundaries(client):
    assert "Neural Networks" in ask(client, question="Explain neural networks in simple words").get_json()["answer"]
    assert "Before" in ask(client, question="what should I know before transformers").get_json()["answer"]
    # 'explain' contains 'ai' and 'plain' contains 'lan': these must not be read as topics
    assert ask(client, question="please explain plainly").get_json()["suggestions"]


def test_greeting_and_unknown_questions_are_honest(client):
    hi = ask(client, question="hi").get_json()
    assert "Hello" in hi["answer"] and hi["suggestions"]
    odd = ask(client, question="who won the cricket match yesterday").get_json()
    assert "not a live AI" in odd["answer"] and odd["suggestions"] and odd["mode"] == "Pre-written answers"


def test_next_and_weakest_use_the_plan_and_quiz(client):
    assert "do not have a study plan" in ask(client, question_id="next").get_json()["answer"]
    assert "quiz results first" in ask(client, question_id="weakest").get_json()["answer"]
    start_plan(client)
    assert "Next up" in ask(client, question_id="next").get_json()["answer"]
    client.post("/api/quiz", json={"answers": {}})
    assert "weakest topic" in ask(client, question_id="weakest").get_json()["answer"]


def test_tutor_needs_a_question(client):
    assert ask(client).status_code == 400


# ---- resume codes -------------------------------------------------------------------------

import re  # noqa: E402

from learning_dna import resume_code  # noqa: E402
from learning_dna.routes import account as account_routes  # noqa: E402
from learning_dna.wordlist import WORDS  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_limiter():
    account_routes.limiter = resume_code.AttemptLimiter()


def test_code_format_and_stability(client):
    first = client.get("/api/account/code").get_json()
    assert first["ok"] and re.fullmatch(r"[a-z]+-[a-z]+-[a-z]+-\d{2}", first["code"])
    assert client.get("/api/account/code").get_json()["code"] == first["code"]


def test_resume_on_another_device_loads_the_same_progress(client):
    start_plan(client)
    code = client.get("/api/account/code").get_json()["code"]
    other = client.application.test_client()           # a different browser: no cookie yet
    assert not other.get("/api/context").get_json().get("profile")
    spoken = code.replace("-", " ").upper() + "."      # as typed or spoken
    r = other.post("/api/account/resume", json={"code": spoken})
    assert r.status_code == 200 and r.get_json()["ok"]
    ctx = other.get("/api/context").get_json()
    assert ctx["profile"]["topics"]
    assert other.get("/api/account/code").get_json()["code"] == code


def test_wrong_and_malformed_codes(client):
    assert client.post("/api/account/resume", json={"code": "hello"}).status_code == 400
    r = client.post("/api/account/resume", json={"code": "maple-river-tiger-42"})
    assert r.status_code == 404 and not r.get_json()["ok"]


def test_too_many_wrong_guesses_are_blocked(client):
    for _ in range(10):
        assert client.post("/api/account/resume", json={"code": "maple-river-tiger-42"}).status_code == 404
    assert client.post("/api/account/resume", json={"code": "maple-river-tiger-42"}).status_code == 429


def test_logout_forgets_the_browser_but_keeps_the_data(client):
    start_plan(client)
    code = client.get("/api/account/code").get_json()["code"]
    assert client.post("/api/account/logout").get_json()["ok"]
    assert not client.get("/api/context").get_json().get("profile")
    assert client.get("/api/account/code").get_json()["code"] != code          # a brand-new profile
    assert client.post("/api/account/resume", json={"code": code}).status_code == 200
    assert client.get("/api/context").get_json()["profile"]["topics"]


def test_code_helpers():
    assert len(WORDS) >= 250 and len(set(WORDS)) == len(WORDS)
    assert all(w.isalpha() and w.islower() for w in WORDS)
    codes = {resume_code.generate_code() for _ in range(200)}
    assert len(codes) > 190
    for c in codes:
        words = c.split("-")[:3]
        assert len(set(words)) == 3 and resume_code.is_valid_format(c)
    assert resume_code.normalize_code("Maple, River  Tiger 42!") == "maple-river-tiger-42"


def test_limiter_forgets_old_failures():
    now = [0.0]
    lim = resume_code.AttemptLimiter(per_key=2, per_key_window=10, total=100, clock=lambda: now[0])
    lim.record_failure("a"); lim.record_failure("a")
    assert lim.blocked("a") and not lim.blocked("b")
    now[0] = 11.0
    assert not lim.blocked("a")


# ---- Regression tests from the final audit (docs/FINAL_AUDIT.md) ----

FIVE_TOPICS = "python, data preprocessing, linear regression, classification, neural networks"


def start_five(client):
    assert client.post("/api/start", json={"syllabus_text": FIVE_TOPICS}).status_code == 200


def path_statuses(client):
    return [(s["topic"], s["status"]) for s in client.get("/api/context").get_json()["learningPath"]]


@pytest.mark.parametrize("path", [
    "/api/start", "/api/quiz", "/api/tutor", "/api/profile/intake", "/api/monitor/event", "/api/account/resume",
    "/api/path/step/update", "/api/path/update", "/api/path/video/track", "/api/path/course/track",
])
@pytest.mark.parametrize("body", [[1, 2], "text", 5])
def test_non_object_json_is_a_400_not_a_crash(client, path, body):
    start_plan(client)
    r = client.post(path, json=body)
    assert r.status_code == 400
    assert "attribute" not in r.get_json()["error"]          # no Python internals in the message


def test_preferences_reject_non_object_json(client):
    assert client.put("/api/accessibility/preferences", json=5).status_code == 400


def test_quiz_answers_must_be_an_object(client):
    start_plan(client)
    for bad in ([1], "x", 5):
        assert client.post("/api/quiz", json={"answers": bad}).status_code == 400


def test_intake_ignores_values_of_the_wrong_type(client):
    r = client.post("/api/profile/intake", json={"vision": ["high"], "hearing": {"a": 1}, "motor": 3})
    assert r.status_code == 200 and r.get_json()["needProfile"]["intake"]["vision"] == "none"


@pytest.mark.parametrize("bad", ["abc", "inf", "nan", 1e999, [1], {"a": 1}, None])
def test_video_tracking_survives_bad_numbers(client, bad):
    start_plan(client)
    topic = client.get("/api/context").get_json()["profile"]["topics"][0]
    r = client.post("/api/path/video/track", json={"topic": topic, "url": "https://example.test/v", "event": "start",
                                                    "watched_pct": bad, "watched_seconds": bad})
    assert r.status_code == 200
    assert client.get("/api/context").status_code == 200             # the profile must stay readable
    assert client.get("/api/monitor/summary").status_code == 200
    assert client.get("/api/path/progress").get_json()["videoActivity"][topic]["https://example.test/v"]["watched_pct"] <= 100


def test_video_tracking_clamps_percentages(client):
    start_plan(client)
    topic = client.get("/api/context").get_json()["profile"]["topics"][0]
    client.post("/api/path/video/track", json={"topic": topic, "url": "u", "watched_pct": 5000, "watched_seconds": 10**12})
    entry = client.get("/api/path/progress").get_json()["videoActivity"][topic]["u"]
    assert entry["watched_pct"] == 100 and entry["watched_seconds"] == 86400


def test_unexpected_errors_do_not_leak_details(client):
    def boom():
        raise RuntimeError("mongodb://user:secretpass@host/db failed")
    client.application.add_url_rule("/api/_boom", "boom", boom)
    r = client.get("/api/_boom")
    assert r.status_code == 500
    assert "secretpass" not in r.get_data(as_text=True) and "mongodb" not in r.get_data(as_text=True)
    assert r.get_json()["ok"] is False


def test_oversized_requests_are_refused(client):
    r = client.post("/api/start", data=b'{"syllabus_text": "' + b"a" * 1_200_000 + b'"}', content_type="application/json")
    assert r.status_code == 413 and r.get_json()["ok"] is False


def test_reading_the_path_does_not_unlock_topics(client):
    start_five(client)
    first = path_statuses(client)
    assert [s for _, s in first] == ["recommended", "locked", "locked", "locked", "locked"]
    for _ in range(4):                                     # every page load reads the path
        client.get("/api/notifications")
        client.get("/api/context")
    assert path_statuses(client) == first


def test_completing_a_topic_unlocks_only_the_next_one(client):
    start_five(client)
    assert client.post("/api/path/step/update", json={"topic": "python", "status": "completed"}).status_code == 200
    assert [s for _, s in path_statuses(client)] == ["completed", "recommended", "locked", "locked", "locked"]


@pytest.mark.parametrize("route", ["/api/path/step/update", "/api/path/update"])
def test_locked_topics_cannot_be_started_or_completed_by_request(client, route):
    start_five(client)
    for status in ("completed", "in-progress"):
        r = client.post(route, json={"topic": "neural networks", "status": status})
        assert r.status_code == 400 and "locked" in r.get_json()["error"]
    assert path_statuses(client)[-1] == ("neural networks", "locked")
    assert client.post(route, json={"topic": "python", "status": "in-progress"}).status_code == 200


def test_preferences_report_whether_anything_is_saved(client):
    first = client.get("/api/accessibility/preferences").get_json()
    assert first["saved"] is False and first["preferences"]["high_contrast"] is False   # defaults, nothing stored yet
    saved = client.put("/api/accessibility/preferences", json={"high_contrast": True}).get_json()
    assert saved["saved"] is True
    again = client.get("/api/accessibility/preferences").get_json()
    assert again["saved"] is True and again["preferences"]["high_contrast"] is True


# ---- Resume-code rate limit: who counts as "the same visitor" ----

def _key(client, forwarded=None, remote="10.9.9.9", hops=0):
    from learning_dna import config
    old = config.TRUSTED_PROXY_HOPS
    config.TRUSTED_PROXY_HOPS = hops
    try:
        headers = {"X-Forwarded-For": forwarded} if forwarded is not None else {}
        with client.application.test_request_context("/api/account/resume", headers=headers, environ_base={"REMOTE_ADDR": remote}):
            return account_routes._client_key()
    finally:
        config.TRUSTED_PROXY_HOPS = old


def test_default_key_is_the_first_forwarded_address(client):
    assert _key(client, "203.0.113.7, 10.1.1.1") == "203.0.113.7"
    assert _key(client) == "10.9.9.9"                                   # no header: the connecting address


def test_junk_in_the_forwarded_header_cannot_make_new_keys(client):
    assert _key(client, "not-an-ip") == "10.9.9.9"
    assert _key(client, "x" * 5000) == "10.9.9.9"
    assert _key(client, "<script>, 1.2.3.4") == "10.9.9.9"


def test_trusted_proxy_hops_ignore_what_the_visitor_wrote(client):
    # a visitor writes 6.6.6.6; the one trusted proxy then records the visitor's real address, 198.51.100.4
    assert _key(client, "6.6.6.6, 198.51.100.4", hops=1) == "198.51.100.4"
    assert _key(client, "1.1.1.1, 2.2.2.2, 6.6.6.6, 198.51.100.4", hops=1) == "198.51.100.4"
    # two trusted proxies: the address before the last one
    assert _key(client, "6.6.6.6, 198.51.100.4, 192.0.2.50", hops=2) == "198.51.100.4"
    # header shorter than the trusted chain (a direct request): do not trust it
    assert _key(client, "6.6.6.6", hops=2) == "10.9.9.9"
    assert _key(client, hops=1) == "10.9.9.9"


def test_rotating_fake_addresses_do_not_help_when_proxy_hops_are_set(client):
    from learning_dna import config
    config.TRUSTED_PROXY_HOPS = 1
    try:
        codes = [client.post("/api/account/resume", json={"code": "maple-river-tiger-42"},
                             headers={"X-Forwarded-For": f"10.0.0.{i}, 198.51.100.4"}).status_code for i in range(12)]
    finally:
        config.TRUSTED_PROXY_HOPS = 0
    assert codes[:10] == [404] * 10 and codes[10:] == [429, 429]


def test_limiter_drops_quiet_visitors():
    now = [0.0]
    lim = resume_code.AttemptLimiter(per_key=5, per_key_window=10, total=10_000, clock=lambda: now[0])
    for i in range(600):
        lim.record_failure(f"10.0.{i // 250}.{i % 250}")
    now[0] = 100.0
    lim.record_failure("10.1.1.1")
    assert len(lim._by_key) < 10


def test_notifications_have_stable_ids_and_a_page_to_open(client):
    start_five(client)
    first = client.get("/api/notifications").get_json()["notifications"]
    again = client.get("/api/notifications").get_json()["notifications"]
    assert first and [n["id"] for n in first] == [n["id"] for n in again]       # the browser remembers read/deleted by id
    assert len({n["id"] for n in first}) == len(first)
    assert all(n["href"].startswith("/") and not n["href"].startswith("//") for n in first)
    plan = next(n for n in first if n["title"] == "Plan ready")
    assert plan["href"] == "/path"
    client.post("/api/start", json={"syllabus_text": "python, classification"})  # a different plan is a new notification
    changed = next(n for n in client.get("/api/notifications").get_json()["notifications"] if n["title"] == "Plan ready")
    assert changed["id"] != plan["id"]
