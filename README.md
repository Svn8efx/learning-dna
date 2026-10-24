# Learning DNA

**AI-powered personalized learning for students with disabilities.**

Learning DNA is a web platform (React 17 frontend, Flask backend, MongoDB storage, TensorFlow model) that adapts
study plans, quizzes and lesson formats to each learner, and adapts the *interface itself* to visual, hearing and
motor accessibility needs. It was built as a community-service project at K.R. Mangalam University.

## The four modules

| Module | What it does | Where |
|---|---|---|
| 1. Student profiling | Short self-declared questionnaire; a TensorFlow classifier suggests a learning style and rules turn answers into settings | `routes/profiling.py`, `ml/need_model.py`, page **My DNA** |
| 2. Adaptive learning paths | Adaptive quiz, weak-area detection, prerequisite-aware path with progress tracking (inherited from the base project, extended with text lessons) | `learning.py`, `routes/path.py`, pages **Quiz**, **Path** |
| 3. Accessible multimedia | Text lessons with Listen (text-to-speech), downloadable transcripts, video captions, high contrast, text size up to 200%, screen-reader support | `content.py`, `routes/accessibility.py`, pages **Lessons**, panel **Accessibility** |
| 4. Real-time monitoring | Engagement, accessibility-feature usage, quiz trend, and a with/without-personalisation comparison, refreshed every 15 s | `monitoring.py`, `routes/monitoring.py`, page **Progress** |

## Accessibility features

- **Visual:** screen-reader friendly markup (landmarks, labelled forms, live announcements), skip link, high-contrast mode,
  text size 100-200%, text-to-speech, charts always paired with a data table.
- **Hearing:** caption request for embedded videos, text lessons and downloadable transcripts, on-screen alerts.
- **Motor (including wheelchair users who cannot use a mouse comfortably):** full keyboard operation, keyboard shortcuts,
  large click targets, voice commands (Chrome/Edge), no time limits.

See `docs/ACCESSIBILITY.md` for details and the testing checklist.

## Quick start

Requirements: Python 3.10+, Node 18+, (optional) MongoDB.

```bash
# 1. Backend
pip install -r requirements.txt
cp .env.example .env            # optional; defaults work
python -m learning_dna.ml.train_need_model   # optional: pre-train the TensorFlow model (otherwise trained on first use)
python app.py                   # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm start                       # http://localhost:3000
```

**Database.** With MongoDB running locally, the app uses it automatically (database `learning_dna`).
For MongoDB Atlas, set `MONGO_URI=mongodb+srv://...` in `.env`. If MongoDB is not reachable the backend
falls back to an in-memory store so a demo still works (data is lost on restart; `GET /api/status` shows
`"storage": "mongodb"` or `"memory"`).

**Tests.**

```bash
python -m pytest tests -q                    # backend: 16 tests
cd frontend && CI=true npm test -- --watchAll=false   # frontend: 5 tests
```

## Documentation

- `docs/ARCHITECTURE.md` - structure, data flow, database collections
- `docs/API.md` - every endpoint with examples
- `docs/ACCESSIBILITY.md` - features, standards, how to test with a screen reader
- `docs/CHANGE_REPORT.md` - what we started from, what we changed and added, limitations, future work

## Credits

Started from the open-source project [AI-ML-Adaptive-Learning-Platform](https://github.com/Sanjayt215/AI-ML-Adaptive-Learning-Platform)
by Sanjayt215 (quiz engine, learning-path logic and page structure). See `NOTICE.md`.
