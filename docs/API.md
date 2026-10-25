# API reference

All endpoints return JSON with `"ok": true|false`. The browser must send cookies (`credentials: "include"`);
the session cookie identifies the student. Errors look like `{"ok": false, "error": "message"}`.

## Core (inherited, adapted)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/status` | `{ok, app, storage: "mongodb"\|"memory", engine, rows, real_data_used}` |
| POST | `/api/start` | Body `{syllabus_text, target_goal}`; creates the study plan and quiz |
| GET / POST | `/api/quiz` | GET returns questions (`?refresh=1` for a new set); POST `{answers}` scores them |
| GET | `/api/context` | Everything the dashboard needs, plus `accessibility: {preferences, needProfile}` |
| POST | `/api/reset` | Start a new plan. Accessibility settings and history are kept |
| GET | `/api/search?q=` | Search courses/videos/datasets in the plan |
| GET | `/api/notifications`, `/api/features` | Notifications; feature list |
| GET | `/api/tutor/questions` | Questions the guided tutor offers: `general[]`, `topics[]`, `plan_topics[]` |
| POST | `/api/tutor` | Body `{question_id}` (button) or `{question}` (typed). Answers are pre-written (`tutor_faq.py`), built from lessons and the student's plan and quiz results. Unmatched typed questions get a polite "not understood" reply with suggestions; only if `OPENAI_API_KEY` is set are they sent to an AI model. Response: `{answer, topic, mode, suggestions[], related_resources}` |

## Resume codes (continue on another device, no password)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/account/code` | Returns this student's code, e.g. `maple-river-tiger-42`; creates one the first time. `{ok, code}` |
| POST | `/api/account/resume` | Body `{code}` (spaces, capitals and punctuation are tolerated). Switches this browser to the profile that owns the code. `404` if unknown, `400` if the format is wrong, `429` after too many wrong guesses (10 per 10 minutes per visitor, 60 per minute for the whole server) |
| POST | `/api/account/logout` | Clears the session cookie so the browser forgets the student. The data stays in MongoDB under the code |

A code is three different words from a 283-word list plus a two-digit number, about 31 bits. Anyone who knows it can open that profile,
so it is a password that cannot be reset. It suits a learning demo, not sensitive personal data.

## Learning path (inherited)
`POST /api/path/update`, `POST /api/path/step/update`, `GET /api/path/resources?topic=`,
`POST /api/path/video/track`, `POST /api/path/course/track`, `GET /api/path/progress`.

## Module 1 - profiling
**POST `/api/profile/intake`**
```json
{ "vision": "none|some|high", "hearing": "none|some|high", "motor": "none|some|high",
  "prefers_audio": true, "prefers_captions": false, "prefers_visuals": false, "pace": "slow|normal" }
```
Response: `needProfile` (`mode` = `audio_first | captioned_visual | hands_free | balanced`, `confidence`,
`probabilities`, `drivers`, `reasons`, `applied_settings`, `model`) and the saved `preferences`.

**GET `/api/profile/learning-dna`** - current need profile, preferences, strengths and weak topics.

## Module 3 - accessibility and content
**GET / PUT `/api/accessibility/preferences`** - body for PUT is any subset of:
`font_scale` (100-200), `high_contrast`, `reduce_motion`, `text_to_speech`, `speech_rate` (0.5-1.5), `captions`,
`visual_alerts`, `large_targets`, `keyboard_mode`, `voice_commands`. Values are validated and clamped; unknown keys are ignored.

**GET `/api/content`** - list of lessons. **GET `/api/content/<topic>`** - lesson `{title, sections[], transcript, reading_minutes}`; 404 if unknown.

## Module 4 - monitoring
**POST `/api/monitor/event`** - `{type, topic?, meta?}`. Allowed types: `page_view, lesson_view, a11y_change, tts_used,
voice_command, caption_toggle, keyboard_shortcut, video_start, intake_completed, quiz_submit`. Others return 400.

**GET `/api/monitor/summary`** - `engagement`, `accessibility_usage`, `quiz_trend`, `progress`,
`personalisation_effect` (compares the student's own quiz attempts with and without accessibility settings;
`status: "not_enough_data"` until both exist), and `insights`.

## Example
```bash
curl -c jar -b jar -X POST localhost:5000/api/profile/intake -H 'Content-Type: application/json' \
     -d '{"vision":"high","prefers_audio":true}'
curl -b jar localhost:5000/api/monitor/summary
```
