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
