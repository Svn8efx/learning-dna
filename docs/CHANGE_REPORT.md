# Change report

## 1. Starting point
We started from the open-source repository *AI-ML-Adaptive-Learning-Platform* (React 18 + Flask, scikit-learn,
cookie-session storage, no database, no accessibility features: the frontend contained no ARIA attributes).
The repository had no license file; it is credited in the README and `NOTICE.md`.

Problems found in the original:
- The `data/` folder that the catalog code reads was missing, so course and video ranking crashed on first use.
- The homepage showed unsupported claims ("95% prediction accuracy", "1000+ resources", "70+ topics"; there are 30 topics).
- Unused legacy HTML templates; all state kept in a browser cookie; a single 900-line `app.py`.

## 2. What we changed

| Area | Change |
|---|---|
| Identity | New name, text, icon and teal colour theme; honest homepage statistics; unused templates and stale docs removed |
| Backend structure | `app.py` split into a `learning_dna` package: config, store, runtime, learning logic, five route blueprints, services, ML |
| Catalog | If `data/*.csv` is absent, course/video/project tables are built from the topic catalog. Unknown metrics (views, ratings) are not invented, they are simply not shown. Dataset links are Kaggle search links, not made-up dataset names |
| Storage | MongoDB persistence (students, quiz_results, events, content) with automatic fallback to memory; the cookie now holds only a student id |
| Frontend | React 18 → **React 17** (unused `framer-motion` dependency removed); new context, panel, hooks and pages (below) |

## 3. What we added

**Module 1 - student profiling.** Intake questionnaire → TensorFlow classifier → suggested style, explanation of which answers mattered, and automatic accessibility settings.
**Module 2 - adaptive paths.** Existing adaptive quiz and path kept; added a text lesson for each of the 30 topics, linked from the path.
**Module 3 - accessible multimedia.** Lessons with text-to-speech and transcripts, captions in the video player, preference storage, full accessibility panel.
**Module 4 - monitoring.** Event tracking, engagement and accessibility-usage summary, quiz trend with table, and a with/without-personalisation comparison.
**Accessibility layer.** Skip link, landmarks, live announcements, focus management, high contrast, text scaling, large targets, keyboard shortcuts, voice commands, reduced motion.
**Tests.** 16 backend tests (run against the in-memory store and a MongoDB-compatible mock) and 5 frontend render tests.

## 4. The TensorFlow model - read before presenting
- 8 inputs → Dense(16) → Dense(8) → Softmax(4). Output: a suggested *presentation style*, not a diagnosis.
- **Training data is synthetic**: labels come from transparent scoring rules plus noise. The 88.9% validation accuracy
  therefore shows the network learned those rules; it does not show it predicts real students. Say this when presenting.
- Next step for real validation: collect consented pilot data and retrain.
- Ethical notes: answers are self-declared and optional; every setting can be changed; no medical claims.

## 5. Verification status

| Item | Status |
|---|---|
| Backend tests | 16 pass |
| Frontend build and render tests | Build succeeds; 5 tests pass |
| React 17 | Installed version 17.0.2 |
| TensorFlow | 2.21 tested; scikit-learn fallback also tested |
| MongoDB | Tested with a MongoDB-compatible mock (mongomock) and the memory store. **Not tested against a live MongoDB server** in our build environment. Do this once: start MongoDB, run the app, confirm `/api/status` shows `"storage": "mongodb"` and `db.students.find()` has a document |
| Screen readers (JAWS/NVDA), real browsers | **Not tested** here. See the checklist in `docs/ACCESSIBILITY.md` |

## 6. Suggested community-service pilot
1. Visit a local special school or NGO; get permission from teachers and guardians.
2. Let 5-10 students try the site for 20 minutes with a teacher present.
3. Record: tasks completed, settings used, problems, and a short satisfaction rating (see the Progress page for usage data).
4. Report what changed because of the feedback. Do not store names; keep any real data anonymous.

## 7. Future work
Real captions/audio description authoring, Hindi and other languages, cognitive-accessibility features, sign-language content,
teacher dashboard, retraining the classifier on pilot data, production deployment (HTTPS, WSGI server, hosted MongoDB).
