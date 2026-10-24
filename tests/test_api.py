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
