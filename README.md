<div align="center">

# 🧬 Learning DNA

### AI-Powered Personalized Learning for Students with Disabilities

*Every learner has a unique DNA. Learning should adapt to it, not the other way around.*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-learning--dna.vercel.app-14b8a6?style=for-the-badge)](https://learning-dna.vercel.app)
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

> ⏳ **Note:** the backend runs on a free Render plan and sleeps after ~15 minutes of inactivity. The **first load can take 30–60 seconds** while it wakes up. After that it is fast.

---

## 💡 What is Learning DNA?

Most learning platforms assume every student sees, hears and clicks the same way. **Learning DNA** starts from the opposite idea: it builds a small profile of *how a student learns best and what they need*, then adapts the lessons, the interface and the learning path to match.

It is a community-service-oriented college project for students with **visual, motor and hearing needs**.

---

## ✨ Features

### 🧠 1. AI Student Profiling
- Short **"My DNA"** intake form (`/my-dna`)
- A **TensorFlow neural network** suggests a learning style: `audio_first`, `captioned_visual`, `hands_free` or `balanced`
- Gives a **plain-language explanation** of why that style was suggested

### 🗺️ 2. Adaptive Learning Paths
- Pick your topics and take a quiz
- Get a personalised path across **30 topics** with prerequisites
- Keyboard-accessible path map

### ♿ 3. Accessible Multimedia
- 📖 **30 plain-language lessons** with a **Listen** button (text-to-speech)
- 📝 Downloadable **transcripts**
- 🎬 Video modal with **captions** (when the video provides them) and `Esc` to close
- 🔠 Text size **100–200%**
- 🌓 **High contrast** mode
- 🖱️ **Large click targets**
- ⌨️ **Keyboard shortcuts** (`Alt + Shift + letter`)
- 🎙️ **Voice commands** (Chrome / Edge)
- 🐢 **Reduce motion**
- Skip link, landmarks, screen-reader announcements and focus management

### 📊 4. Real-Time Monitoring
- Progress page that **auto-refreshes every 15 seconds**
- Chart **plus** a data table (so it works without sight)
- Compare results **with and without** personalisation

### 🤖 5. Guided Tutor
- Quick-question buttons, topic picker and typed questions
- **Pre-written answers** built from the lesson content (not a live AI)
- Plan-aware answers such as *"What should I learn next?"* and *"What is my weakest topic?"*

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
- Storage falls back to in-memory automatically if no database is configured.

---

## 📁 Project Structure

```
learning-dna/
├── app.py                     # tiny entry point: app = create_app()
├── requirements.txt
├── learning_dna/
│   ├── config.py  store.py  runtime.py  learning.py
│   ├── accessibility.py  content.py  content_data.py
│   ├── monitoring.py  tutor_faq.py
│   ├── ml/            # need_model.py, train_need_model.py
│   ├── routes/        # core, path, profiling, accessibility, monitoring
│   └── services/      # AutoML, catalog, tutor, YouTube
├── frontend/          # React 17 app (accessibility layer, pages, tests)
├── tests/             # backend tests
└── docs/              # ARCHITECTURE, API, ACCESSIBILITY, CHANGE_REPORT
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
| `SECRET_KEY` | Flask session signing |
| `MONGO_URI` | MongoDB Atlas connection string |
| `MONGO_DB` | Database name (`learning_dna`) |
| `STORE_BACKEND` | `auto`, `mongo` or `memory` |
| `OPENAI_API_KEY` | *Optional.* Only used for typed tutor questions that match nothing |

> 🔐 Never commit `.env` files or connection strings.

---

## 🧪 Tests

```powershell
cd C:\Users\PC\Desktop\learning-dna
pytest
cd frontend
npm test
```

---

## ⚠️ Honest Limitations

We would rather be clear than overclaim:

- 🧪 The TensorFlow model is trained on **synthetic (rule-generated) data**. Its validation accuracy shows it learned those rules, **not** that it predicts real students. Retraining on consented pilot data is future work.
- 🌐 The live site uses the **scikit-learn fallback**; TensorFlow is demonstrated locally.
- 🎧 **JAWS / NVDA testing is not yet complete**, and no formal WCAG audit has been done. See `docs/ACCESSIBILITY.md` for the test checklist.
- 🎙️ Voice commands work only in Chrome and Edge.
- 💬 Captions appear only if the YouTube video provides them.
- 🚫 No audio description, sign language or cognitive-accessibility features yet.
- ♿ "Wheelchair accessibility" is interpreted as **motor accessibility of the software** (keyboard, voice, large targets).
- 🤖 The tutor uses pre-written answers and is **not a live AI**.

---

## 🔮 Future Work

- 🎬 Real captions and audio description
- 🇮🇳 Hindi and other language support
- 🧩 Cognitive-accessibility features
- 📈 Retrain the model on consented pilot data from a community-service pilot
- ✅ Full NVDA / JAWS testing and a WCAG audit

---

## 👥 Team

**Learning DNA** is a second-year project at **K.R. Mangalam University** by a team of five.

🎓 **Faculty mentor:** Dr. Naman Gupta

---

<div align="center">

**Built with 💚 for every kind of learner.**

[🚀 Try the live demo](https://learning-dna.vercel.app)

</div>
