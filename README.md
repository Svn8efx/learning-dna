<div align="center">

# 🧬 Learning DNA

### AI-Powered Personalized Learning for Students with Disabilities

*Every learner has a unique DNA. Learning should adapt to it, not the other way around.*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-learning--dna.vercel.app-315CE8?style=for-the-badge)](https://learning-dna.vercel.app)
[![API](https://img.shields.io/badge/⚙️_API-Render-46E3B7?style=for-the-badge)](https://learning-dna-api.onrender.com/api/status)

![React](https://img.shields.io/badge/React-17-61DAFB?logo=react&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?logo=flask&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?logo=tensorflow&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)

</div>

---

## 🌍 Live Deployment

| Part | Link |
|---|---|
| 🖥️ **Web app (frontend)** | **https://learning-dna.vercel.app** |
| ⚙️ **API health check (backend)** | https://learning-dna-api.onrender.com/api/status |
| 📦 **Source code** | https://github.com/Svn8efx/learning-dna |

> ⏳ **Note:** the backend runs on a free Render plan and sleeps after ~15 minutes of inactivity. The **first load can take 30–60 seconds** while it wakes up. The app shows a loading message that explains this, and everything is fast afterwards.

---

## 💡 What is Learning DNA?

Most learning platforms assume every student sees, hears and clicks the same way. **Learning DNA** starts from the opposite idea: it builds a small profile of *how a student learns best and what they need*, then adapts the lessons, the interface and the learning path to match.

It is a community-service-oriented college project for students with **visual, motor and hearing needs**.

---

## ✨ Features

### 🧠 1. AI Student Profiling
- Short **"My DNA"** form (`/my-dna`) with save, edit and cancel
- A **TensorFlow neural network** suggests a learning style: `audio_first`, `captioned_visual`, `hands_free` or `balanced`
- A **plain-language explanation** of why that style was suggested
- The suggested settings (text size, contrast, voice and so on) are applied for you

### 🗺️ 2. Adaptive Learning Paths
- **Goals → Start → Quiz → Dashboard → Path** is the main journey
- Pick a goal and your topics (or paste a syllabus) and take a quiz
- A personalised path across **30 topics** with prerequisites
- **Unlock rule:** the first topic you have not completed is open; the next ones unlock as you finish the earlier ones. A topic where your quiz score was below 45% is opened early for review.
- Keyboard-accessible, ordered list with a text status for every topic

### ♿ 3. Accessible Multimedia
- 📖 **30 plain-language lessons** with a **Listen** button (text-to-speech), contents list and previous/next links
- 📝 Downloadable **transcripts**
- 🎬 Video modal with **captions** (when the video provides them) and `Esc` to close
- 🔠 Text size **100–200%**
- 🌓 **High contrast** mode and a **light / dark theme** toggle
- 🖱️ **Large click targets**
- ⌨️ **Keyboard shortcuts** (`Alt + Shift + letter`, listed in the Accessibility panel)
- 🎙️ **Voice commands** (Chrome / Edge). If the microphone is blocked or the browser does not support them, a message appears at the top of the page and the keyboard and mouse still work.
- 🐢 **Reduce motion** (the loading spinner stands still)
- Skip link, landmarks, screen-reader announcements and focus management
- Tables and charts are always paired with text, so they work without sight

### 📊 4. Progress and Monitoring
- Progress page that **updates about every 15 seconds** while open
- Chart **plus** a data table
- Compare results **with and without** personalisation
- Notifications open as a small floating panel under the bell

### 🤖 5. Guided Tutor
- Quick-question buttons, topic picker and typed questions
- **Pre-written answers** built from the lesson content (not a live AI)
- Plan-aware answers such as *"What should I learn next?"* and *"What is my weakest topic?"*

### 🔑 6. No password: a resume code
- **My code** (`/account menu → My code`) gives you a short code of three words and a number
- Type it on any phone or computer to bring back your plan, results, progress **and accessibility settings**
- Wrong guesses are rate-limited. Keep your code private: anyone who has it can open your progress.

---

## 🖼️ Design

The site was redesigned for clarity and low visual noise: a two-row header (brand, search, Accessibility, notifications, theme, Account; then the ten main pages), a calm blue accent, no gradients, and honest empty, loading and error states (the app never invents numbers, and a server problem is never shown as "you have no plan"). The footer sentence links to the source code. See `docs/REDESIGN.md`.

---

## 🏗️ Architecture

```
┌──────────────────────┐        /api/*  (rewrite)        ┌─────────────────────┐
│  React 17 Frontend   │ ──────────────────────────────▶ │   Flask Backend     │
│  (Vercel)            │ ◀────────────────────────────── │   (Render)          │
└──────────────────────┘                                  └──────────┬──────────┘
                                                                     │
                                          ┌──────────────────────────┼────────────────┐
                                          ▼                          ▼                ▼
                                  🍃 MongoDB Atlas          🧠 Need model       📚 Content
                                  students, quiz_results,   (TensorFlow /      30 lessons,
                                  events, content           scikit-learn)      topic catalog
```

- The browser only talks to the Vercel address, so cookies stay first-party.
- The cookie holds only an opaque `student_id`. All data lives in MongoDB.
- Storage falls back to in-memory automatically if no database is configured (data is then lost on restart).
- Requests must be JSON objects of at most 1 MB. Server errors return a generic message; details go to the server log only.

---

## 📁 Project Structure

```
learning-dna/
├── app.py                     # tiny entry point: app = create_app()
├── requirements.txt
├── learning_dna/
│   ├── config.py  store.py  runtime.py  learning.py  http_utils.py
│   ├── accessibility.py  content.py  content_data.py
│   ├── monitoring.py  resume_code.py  tutor_faq.py
│   ├── ml/            # need_model.py, train_need_model.py
│   ├── routes/        # core, path, profiling, accessibility, account, monitoring
│   └── services/      # AutoML, catalog, tutor, YouTube
├── frontend/          # React 17 app (pages, components, accessibility layer, tests)
├── tests/             # backend tests
├── _session-tools/    # browser scripts used for the audits
└── docs/              # ARCHITECTURE, API, ACCESSIBILITY, REDESIGN, CHANGE_REPORT, FINAL_AUDIT
```

---

## 🚀 Run It Locally (Windows, PowerShell)

**Backend**
```powershell
cd C:\Users\PC\Desktop\learning-dna
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend** (open a second terminal)
```powershell
cd C:\Users\PC\Desktop\learning-dna\frontend
npm install --legacy-peer-deps
npm start
```

**Optional: TensorFlow model locally**
```powershell
cd C:\Users\PC\Desktop\learning-dna
pip install tensorflow
python -m learning_dna.ml.train_need_model
```

**Environment variables (backend)**

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Flask session signing. **Set a long random value in production.** If it is missing, a public default is used and sessions can be forged. |
| `MONGO_URI` | MongoDB Atlas connection string |
| `MONGO_DB` | Database name (`learning_dna`) |
| `STORE_BACKEND` | `auto`, `mongo` or `memory` |
| `OPENAI_API_KEY` | *Optional.* Only used for typed tutor questions that match nothing (`OPENAI_MODEL` can change the model) |
| `YOUTUBE_API_KEY` | *Optional.* Live video search instead of the built-in catalog |

> 🔐 Never commit `.env` files or connection strings.

---

## 🧪 Tests

```powershell
cd C:\Users\PC\Desktop\learning-dna
pytest
cd frontend
npm test
```

Latest results (see `docs/FINAL_AUDIT.md` for exactly what each one proves):

| Check | Result |
|---|---|
| Backend tests (in-memory and an emulated MongoDB) | 140 passed |
| Frontend tests | 36 passed |
| Production build in strict CI mode | no warnings |
| axe-core accessibility scan, 13 pages, light / dark / high contrast, 320 / 390 / 1280 px | 0 violations |
| Browser tests with a *mocked* speech service | 45 of 45 |
| Browser journey tests | 46 of 46 |

`pip install mongomock` is needed to run the database-backed backend tests; without it they are skipped.

---

## ⚠️ Honest Limitations

We would rather be clear than overclaim:

- 🧪 The TensorFlow model is trained on **synthetic (rule-generated) data**. Its validation accuracy shows it learned those rules, **not** that it predicts real students. Retraining on consented pilot data is future work.
- 🌐 The live site uses the **scikit-learn fallback**; TensorFlow is demonstrated locally.
- 🎧 **JAWS / NVDA testing is not yet complete**, and no formal WCAG audit has been done. Automated scans (axe-core) and keyboard tests pass, but they do not replace testing with a screen reader. See `docs/ACCESSIBILITY.md`.
- 🎙️ **Voice commands and read-aloud have been tested only with a mocked speech service**, not with a real microphone or speaker. They work only in Chrome and Edge and need internet.
- 🗄️ The database tests used an emulated MongoDB, and nothing in `docs/FINAL_AUDIT.md` was verified on the live site.
- 🔑 The resume code is the only login. It is rate-limited, but anyone who has a code can open that progress.
- 💬 Captions appear only if the YouTube video provides them.
- 🚫 No audio description, sign language or cognitive-accessibility features yet.
- ♿ "Wheelchair accessibility" is interpreted as **motor accessibility of the software** (keyboard, voice, large targets).
- 🤖 The tutor uses pre-written answers and is **not a live AI**.
- 🌓 The light/dark theme is saved per browser; the accessibility settings follow your code.

---

## 🔮 Future Work

- 🎬 Real captions and audio description
- 🇮🇳 Hindi and other language support
- 🧩 Cognitive-accessibility features
- 📈 Retrain the model on consented pilot data from a community-service pilot
- ✅ Full NVDA / JAWS testing and a WCAG audit
- 🔒 Stronger resume-code protection and a `Secure` session cookie (see `docs/FINAL_AUDIT.md`, section 6)
- ⬆️ Upgrade to React Router 7 and move off `react-scripts`

---

## 👥 Team

**Learning DNA** is a second-year project at **K.R. Mangalam University** by a team of five.

🎓 **Faculty mentor:** Dr. Naman Gupta

---

<div align="center">

**Built with 💚 for every kind of learner.**

[🚀 Try the live demo](https://learning-dna.vercel.app)

</div>
