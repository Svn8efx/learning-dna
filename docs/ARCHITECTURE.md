# Architecture

```
 Browser (React 17)                         Flask backend (learning_dna/)                    Storage
 ┌──────────────────────────┐   JSON/HTTP   ┌─────────────────────────────────────┐        ┌────────────────┐
 │ AccessibilityProvider     │ ───────────▶ │ routes/core        plan, quiz, tutor │        │ MongoDB        │
 │  (prefs, TTS, announcer)  │              │ routes/path        learning path     │ ─────▶ │  students      │
 │ Layout (skip link, nav,   │              │ routes/profiling   module 1          │        │  quiz_results  │
 │  shortcuts, voice)        │ ◀─────────── │ routes/accessibility  module 3       │        │  events        │
 │ Pages: Quiz, Path, Lessons│              │ routes/monitoring  module 4          │        │  content       │
 │  My DNA, Progress ...     │              │                                     │        └────────────────┘
 └──────────────────────────┘              │ ml/need_model  (TensorFlow)          │         (falls back to an
                                            │ services/  (scikit-learn AutoML,    │          in-memory store)
                                            │   catalog ranking, tutor)           │
                                            └─────────────────────────────────────┘
```

## Backend layout

```
app.py                      entry point (python app.py)
learning_dna/
  __init__.py               create_app(): registers blueprints, CORS, error handler
  config.py                 environment settings
  store.py                  MongoStore + MemoryStore, and `state` (per-student data, replaces the session cookie)
  runtime.py                datasets and models loaded once at startup
  learning.py               topic parsing, learning order, quiz generation, scoring, recommendations
  accessibility.py          default preferences, validation, intake-to-settings rules
  content.py / content_data.py   plain-language lesson text for all 30 topics
  tutor_faq.py              guided tutor: pre-written answers, keyword matching, plan-aware answers
  monitoring.py             event recording and progress summaries
  ml/need_model.py          TensorFlow learning-need classifier (+ scikit-learn fallback)
  routes/                   core, path, profiling, accessibility, monitoring blueprints
  services/                 AutoML baseline, catalog ranking, tutor, YouTube (inherited, adapted)
tests/test_api.py           backend tests
models/                     saved TensorFlow model and its metrics
```

## Data flow

1. The browser keeps only an opaque `student_id` in the Flask session cookie (30 days).
2. `state` (a dict-like object in `store.py`) loads that student's document from MongoDB on first use in a request
   and writes every change back immediately.
3. Quiz submissions also append a record to `quiz_results`; the monitoring module appends to `events`.
4. Lessons are generated from the catalog and lesson text, then cached in `content`.

## MongoDB collections

| Collection | Contents |
|---|---|
| `students` | study plan and progress, quiz state, `a11y_preferences`, `need_profile` (intake answers + model output) |
| `quiz_results` | one record per quiz submission: time, average score, topics, whether accessibility settings were on |
| `events` | engagement and accessibility-usage events (whitelisted types, small metadata) |
| `content` | accessible lesson documents (sections, transcript, reading time) |

MongoDB field names cannot safely contain dots, and some stored keys are URLs, so keys are encoded on write and
decoded on read (`store.py`).

## Machine learning

- **Learning-need classifier (TensorFlow):** 8 inputs (self-declared vision/hearing/motor needs, audio/caption/visual
  preference, pace, recent quiz score) → 3 dense layers → 4 presentation styles. Explanations use gradient × input
  on the raw scores. Trained on synthetic data (see `docs/CHANGE_REPORT.md`).
- **Baseline AutoML (scikit-learn, inherited):** predicts a learning score and level from a student-performance dataset.
