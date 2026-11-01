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
- A short **"My DNA"** form (`/my-dna`) with save, edit and cancel
- A **TensorFlow neural network** suggests a learning style: `audio_first`, `captioned_visual`, `hands_free` or `balanced`
- A **plain-language explanation** of why that style was suggested
- The suggested settings (text size, contrast, voice and so on) are applied for you

### 🗺️ 2. Adaptive Learning Paths
- **Goals → Start → Quiz → Dashboard → Path** is the main journey
- Pick a goal and your topics (or paste a syllabus), then take a quiz built from those topics only
- A personalised path across **30 topics** with prerequisites
- **Unlock rule:** the first topic you have not completed is open, and the next ones unlock as you finish the earlier ones. A topic where your quiz score was below 45% is opened early for review.
- A keyboard-accessible, ordered list with a text status for every topic (never colour alone)

### 📖 3. Lessons You Can Read, Hear and Download
- **30 plain-language lessons** with a contents list and previous / next links
- A **Listen** button (text-to-speech) with an adjustable speed
- **Transcripts** you can download
- A video player with **captions** (when the video provides them), closable with `Esc`
- Resources filtered by type: videos, courses and datasets

### ♿ 4. Accessibility Built In, Not Bolted On
- 🔠 Text size **100-200%**
- 🌓 **High contrast** mode and a **light / dark** theme toggle
- 🖱️ **Large click targets**
- ⌨️ **Keyboard shortcuts** (`Alt + Shift + letter`, listed in the Accessibility panel) and a skip link
- 🎙️ **Voice commands** (Chrome / Edge): go to a page, scroll, go back, click a button by name, change text size or contrast, read the page aloud, stop. If the microphone is blocked or the browser does not support voice, a clear message tells you and offers settings. You can close it with the X, and the keyboard and mouse always still work.
- 🐢 **Reduce motion**
- Landmarks, screen-reader announcements and focus management on every page change
- Charts always come with a table, so nothing depends on sight

### 🔔 5. Notifications You Control
- The bell shows how many notifications are new
- Open the panel to read them, **mark all as read**, or **delete** any one
- **Click a notification** to go straight to the right page (your learning path, a lesson to revise, or your progress)
- Your choices are remembered in this browser

### 📊 6. Progress and Monitoring
- A progress page that updates about every 15 seconds while it is open
- A chart **plus** a data table, and your quiz history
- Compare results **with and without** personalisation
- A dashboard that tells you the next step and never shows invented numbers

### 🤖 7. Guided Tutor
- Quick-question buttons, a topic picker and typed questions
- **Pre-written answers** built from the lesson content (not a live AI)
- Plan-aware answers such as *"What should I learn next?"* and *"What is my weakest topic?"*

### 🔑 8. No Password: a Resume Code
- **My code** (Account menu) gives you a short code of three words and a number
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
| `TRUSTED_PROXY_HOPS` | *Optional, default `0`.* How many proxies in front of the API add to `X-Forwarded-For` and can be trusted. Used only to count wrong resume codes per visitor. Leave at `0` until you have checked it on the live site (see `docs/FINAL_AUDIT.md`, section 6); a wrong number puts every visitor in one shared bucket. |

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
| Backend tests (in-memory and an emulated MongoDB) | 151 passed |
| Frontend tests | 43 passed |
| Production build in strict CI mode | no warnings |
| axe-core accessibility scan, 13 pages, light / dark / high contrast, 320 / 390 / 1280 px | 0 violations |
| Browser tests with a *mocked* speech service | 48 of 48 |
| Browser journey tests | 46 of 46 |

`pip install mongomock` is needed to run the database-backed backend tests; without it they are skipped.

---

## 🛠️ Recent Updates and Fixes

We are **actively improving Learning DNA and fixing glitches as we find them**. Every change below is in the [commit history](https://github.com/Svn8efx/learning-dna/commits/main).

**Latest**
- Notifications are now useful: the number on the bell clears when you look, you can mark all as read, delete one, and click a notification to open its page. They also refresh as you move around, instead of only when the site first loads.
- The voice-commands message was redesigned as a clear card with a title, a button and an X to close it.
- 🐛 **Fixed:** on very small screens with large text, the learning path made its cards too narrow and the page scrolled sideways.
- README reorganised.

**1 Nov: final audit** *(see [`docs/FINAL_AUDIT.md`](docs/FINAL_AUDIT.md))*
- 🐛 **Fixed:** learning-path topics unlocked on their own every time a page loaded, so the whole path opened after a few clicks. The unlock rule now holds.
- 🐛 **Fixed:** locked topics could be completed by sending a request directly. The server now refuses.
- 🐛 **Fixed:** badly formed requests could crash the server and show internal error text. They now get a clear message, and server errors no longer reveal details.
- 🐛 **Fixed:** impossible numbers in video tracking could break a learner's dashboard for good. They are now cleaned, and affected profiles recover.
- 🐛 **Fixed:** a server problem was shown as "You have not built a study plan yet". It now says it could not load and offers Try again, so nobody rebuilds a plan by mistake.
- 🐛 **Fixed:** voice problems (blocked microphone, unsupported browser) were hidden inside the settings window, and ordinary sentences containing words like "settings" triggered commands.
- 🐛 **Fixed:** accessibility settings saved in your browser were replaced by defaults when the server had nothing saved.
- 🐛 **Fixed:** the header and several pages scrolled sideways on phones with large text, and two tables could not be reached with the keyboard.
- 🔒 Requests are limited to 1 MB, the Account menu no longer covers page links, and the resume-code rate limit is safer.
- ✅ New automated checks for all of the above.

**31 Oct: redesign**
- A calm light theme, honest empty and loading states, and grouped navigation
- New blue favicon and notification style
- A wider header with evenly spaced links, and the source-code link moved to the footer

**26 Oct: sign-in without a password, and polish**
- 🔑 Resume codes and log out, with starting a new plan moved into My code
- A source-code link
- Dashboard first in the menu, compact stat cards, and the fake trend figure removed
- Honest empty states on the dashboard
- Wider navigation links with an active state
- A slower, calmer loading spinner and a centred loading screen
- A consistent palette, without symbols in the text

**25 Oct: voice and tutor**
- 🎙️ Voice commands can scroll and click buttons by name, with more forgiving matching
- 🐛 **Fixed:** voice command matching and retries
- Clear voice-command error messages
- The DNA logo favicon, a guided tutor, and a README with deployment links

**24 Oct: first release**
- The first version of the accessible, personalised learning platform
- The tutor answers questions even before you have a plan
- Deployment fixes: backend URL for Vercel, `gunicorn` and the API helper

---

## ⚠️ Known Limitations

We would rather be clear than overclaim.

- 🧪 The model learned from **synthetic, rule-made data**, so it shows the idea, not real-student accuracy yet. The live site uses the scikit-learn fallback; TensorFlow runs locally.
- 🎧 NVDA / JAWS testing and a formal accessibility audit are still to do. Automated scans and keyboard tests pass, but they do not replace real screen-reader testing.
- 🎙️ Voice commands and read-aloud work in Chrome and Edge with internet, and were tested with a mocked speech service.
- 🤖 The tutor uses pre-written answers, not a live AI.
- 🔑 The resume code is the only login, so keep it private.

---

## 🔮 Coming Next

- 🎬 Real captions and audio description for videos
- 🇮🇳 Hindi and other languages
- 🧩 Features for cognitive accessibility
- 📈 Retrain the model on consented pilot data from a community-service pilot
- ✅ Full NVDA / JAWS testing and a formal accessibility audit
- 🔔 Notifications that follow your resume code across devices
- 🔒 A stronger resume-code protection and a `Secure` session cookie
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
