# Redesign: audit, decisions and verification

This records what was wrong with the previous interface, what replaced it, and what was actually checked.
Everything described here was built on the repository as it was on GitHub (`main`, commit `a0a2156`).
No backend behaviour was changed; every API route and the data model are untouched.

## 1. Audit of the previous interface

| Area | Finding | Resolution |
|---|---|---|
| Truthfulness | The Dashboard "Accuracy Trend" chart plotted **invented daily values** (`mockAccuracyTrend`) labelled as real quiz accuracy. | Removed. Replaced with the real quiz history (`/api/monitor/summary`), shown only with two or more attempts, always with a table. The mock module was deleted. |
| Truthfulness | "Exam Score 87%" and "Predicted level" were shown as results. They come from a model trained on a **generated 420-row sample dataset**. | Removed from the student view. Model details now sit in a collapsed "How these numbers are made" section that says the data is generated example data. |
| Truthfulness | The model tab explained predictions with reasons ("topic count, performance distribution") the code does not use. Marketing lists claimed "LLM-ready tutor" and "embeddings-style retrieval". | Removed. The tutor is described as pre-written answers. |
| Truthfulness | Courses were headed "Verified" although every course has `verified: false`; quiz time was an invented "~1.5 min per question"; goal cards listed durations and topics that are not in the catalog; the video player invented "seconds watched" from a percentage. | Labels corrected, estimates removed, goal topics replaced by real catalog topics, invented seconds no longer sent. |
| Truthfulness | A hard-coded "+12%" trend and always-cheerful empty-state messages ("Great job!") appeared with no data behind them. | Removed (earlier) and replaced by explicit empty states. |
| Accessibility | Quiz radio inputs used `display: none`, so the quiz could not be answered with a keyboard. | Visually hidden but focusable inputs with a visible focus ring. |
| Accessibility | Dark-on-dark faint text, colour-only status, text links not underlined. | Token palette with computed contrast, status always has a text label and icon, text links underlined. |
| Navigation | Ten undifferentiated links, three of them hidden behind utility buttons, with no grouping. | Two-row header: brand and utilities on top, navigation grouped as Overview, Set up, Learn, Track below. Small screens get a Menu disclosure. |
| Layout | Cards of equal weight everywhere, tabs that hid half the dashboard, a graph for a path whose unlock rule is strictly sequential. | One primary action per page, sections instead of tabs, a timeline for the path. |
| Process | Loading flashed "empty" states before data arrived. | `loaded` flag in the shared hook; pages show a loading screen until the first response. |

## 2. Design system

* **Direction:** calm, editorial and technical. Light theme by default, dark theme and high-contrast mode as options.
* **Tokens** live in `frontend/src/index.css` as CSS variables and are exposed to Tailwind in `tailwind.config.js` (`bg`, `surface`, `ink`, `muted`, `line`, `accent`, `success`, `warning`, `danger`). Components use these names only.
* **Colour:** the spec's palette (`#F7F6F2`, `#FFFFFF`, `#191E2B`, `#606675`, `#315CE8`, `#E5EAFB`, `#E4E3DE`). Success, warning and danger were darkened slightly because the spec values measured 4.3:1 on the page background and 4.2:1 on their own tint, below the 4.5:1 AA minimum.
* **Type:** Inter for the interface, JetBrains Mono for codes and code blocks. Body 16 px, lesson text 17 px at 2rem line height, one h1 per page.
* **Shape:** 8 px controls, 12 px panels, 16 px for the single feature panel. No glass, glow, gradients, floating motion or pill buttons.
* **Components:** `PageHeader`, `Notice`, `EmptyState`, `Meter`, `StatusBadge`, `ScoreBadge` (`components/ui.jsx`); `.btn` variants, `.input`, `.panel`, `.badge`, `.table`, `.choice` (`index.css`).
* **High contrast** is a token swap (black, white, yellow) rather than a pile of `!important` overrides, so it applies to every component automatically.

## 3. Pages

| Page | What changed |
|---|---|
| Home | Plain headline, one primary action, a four-step "How it works", a feature list that says what is limited, and a "Good to know" section about the prototype's limits. |
| Dashboard | One next step chosen from real state; progress in three plain figures; results table with a text result per topic; real score history; plan list; technical detail collapsed and labelled. |
| Goals | Radio group with persisted selection, current goal pre-selected, honest starter topics. |
| Start | Shows an existing plan and pre-fills it for editing, supported topics as toggle chips, loading and error states, explains that unknown topics are ignored. |
| Quiz | One question at a time, progress as text and a bar, jump list with answered state, keyboard-operable answers, confirmation before replacing a quiz. |
| Path | Timeline in the real unlock order with prerequisites, "leads to", status and the topic's resources inline. Locked topics can be read but not marked. |
| Lessons / Lesson | Filterable list with plan topics first; reading layout at 68 characters, contents list, previous and next, working completion control, transcript and Listen. |
| Resources | Search plus topic, type and level filters, grouped by topic, results count, empty state with a clear-filters action. |
| Tutor | Conversation log with quick questions, topic picker and a side panel for related resources. Renders lists and code. |
| My DNA | Saved profile view with Edit and Cancel, answers shown back to the learner, model detail collapsed. |
| Progress | Real quiz history with chart and table, activity facts, accessibility usage, and a plainly worded settings comparison. |
| My code | Same functions, restyled into a single column of labelled sections. |

## 4. Verification actually performed

Run in a headless Chromium (153) against the production build and the real Flask backend, with a plan and two quiz attempts created through the API.

| Check | Result |
|---|---|
| Frontend unit and render tests | 19 passed (15 existing, 4 added) |
| Backend tests | 44 passed |
| Production build | Compiled successfully, no warnings |
| ESLint (react-app rules) | 0 errors |
| axe-core, WCAG 2.0/2.1/2.2 A and AA tags | 0 violations on all 13 pages |
| Page and width combinations rendered | 130 (seeded light at 1440, 1024, 768 and 390; empty-state, dark and high contrast at 1440 and 390) |
| Horizontal scrolling | None in any of the 130 |
| Console errors | None, apart from Google Fonts failing to load in the offline test sandbox |
| End-to-end flow in the browser | 21 of 21 checks (see below) |

The end-to-end checks cover: skip link and focus, navigation and current page, theme toggle persisting across a reload, account menu with Escape and focus return, the accessibility dialog (also under axe), goal selection by keyboard and carry-over to Start, topic chips, building a plan, answering the whole quiz by keyboard and submitting, the dashboard after a quiz, locked and unlocked path topics and status changes, lesson controls and completion, lesson and resource filtering, tutor questions, My DNA save/edit/cancel and the high-contrast switch, resume codes on a second browser including a wrong code, the mobile menu, and touch-target size.

## 5. Not done, or not verified

* Not tested with NVDA, JAWS or VoiceOver, and not on physical phones. Automated checks find only part of the problems a screen reader user would meet.
* Not deployed. Lighthouse and the live Vercel and Render site have not been re-run against this version.
* The test sandbox has no internet, so Inter was not loaded; renders used the system fallback font. Layout was checked with that font, which is wider than Inter, so real text should fit with room to spare.
* Contrast was computed and checked with axe, but not with a person who has low vision.
* The model behind "suggested level" and "suggested learning style" still uses generated example data. The interface now says so; retraining on consented data remains future work.
* Browser-only features (voice commands, text to speech) depend on the browser and were not exercised here.
