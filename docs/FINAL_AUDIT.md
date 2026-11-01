# Final audit

Audit of the Learning DNA project after the redesign: features, API, voice, end-to-end journeys, security and reliability.

**How to read this report.** Every result is labelled by *how* it was obtained, because they do not prove the same thing:

| Label | Meaning |
|---|---|
| **Automated (backend)** | `pytest` against the Flask app, using the in-memory store and `mongomock` (an emulated MongoDB, not a real one). |
| **Automated (frontend)** | `npm test` (Jest + jsdom). Browser APIs are mocked. |
| **Browser, local build** | A real headless Chromium opened the production build of the frontend, served locally and talking to a local copy of the backend. Network and fonts were not the real ones. |
| **Browser, mocked speech** | Same as above, but the browser's speech recogniser and speech synthesiser were replaced by test doubles. It shows how our code reacts to the events those services send. It does **not** show that a real microphone, speaker or speech service works. |
| **Not tested** | Could not be tested in this environment. Listed in section 7 with the reason. |

**Nothing in this report was verified on the live site** (`learning-dna.vercel.app` / Render). The tests ran on a local copy of the same code.

---

## 1. Summary

- **16 problems were found and fixed**, each with a regression test or a browser check (section 4). The resume-code rate limit is now safer and configurable, but whether it is fully closed on your live site depends on a setting and a one-minute check that only you can do (section 6, item 3).
- **Backend:** 149 tests pass. Against the original code, 90 of the regression tests written for the first 11 problems fail, so they do catch the bugs.
- **Frontend:** 37 tests pass. The production build compiles with no warnings in strict CI mode.
- **Accessibility scan (axe-core, WCAG 2.0/2.1/2.2 A and AA tags):** 0 violations on all 13 pages, in light, dark and high-contrast modes, at 1280, 390 and 320 px wide (117 combinations).
- **Mocked-speech browser tests:** 48 of 48 checks pass. **Notification panel browser test:** 12 of 12. **Journey tests:** 46 of 46. **Scripted flow:** 21 of 21.
- **Real microphone, real speech output, NVDA/JAWS, the live site and the live database were not tested.**
- Several deployment and security risks remain (section 6). The most important are the guessable fallback `SECRET_KEY`, the session cookie without a `Secure` flag, and the resume-code rate limit setting.

---

## 2. Feature checklist

`P` = passed, `F` = failed then fixed, `-` = not tested. "Test" says how it was checked.

| # | Feature | Result | Test |
|---|---|---|---|
| 1 | Home page, skip link, landmarks, navigation (10 routes), mobile menu | P | Browser; scripted flow |
| 2 | Goals page: keyboard selection, Continue enabled only after a choice, prefilled Start | P | Scripted flow |
| 3 | Start page: topic chips, unknown topics explained, plan built, quiz opens | P | Scripted flow; journey J3 |
| 4 | Quiz: keyboard answers, previous/next, submit blocked until complete, results saved | P | Scripted flow; API tests |
| 5 | Dashboard: real results table, no invented numbers, empty state without a plan | P | Frontend tests; scripted flow |
| 6 | Dashboard / Path / Quiz / Resources when the server fails | **F** | Was shown as "no plan yet" (bug 10). Now an error with Try again. Frontend tests; journey J4 |
| 7 | Learning path: ordering, prerequisites, unlock rule, status buttons | **F** | Topics unlocked on every page read (bug 1); server accepted locked topics (bug 2). Backend tests |
| 8 | Lessons list and filter; all 30 lessons open; unknown lesson shows a message | P | Journey J7 |
| 9 | Lesson page: transcript, contents, previous/next, Mark completed | P | Scripted flow |
| 10 | Resources: type filter, clear filters, video modal, course/video tracking | P / **F** | Tracking accepted bad numbers (bug 5). Backend tests; scripted flow |
| 11 | Tutor: quick questions, typed question, answer in the log | P | Scripted flow; hostile text J5 |
| 12 | My DNA: save, edit, cancel; high contrast applied | P | Scripted flow |
| 13 | Progress: chart plus table, 15-second refresh, quiz history | P | Frontend tests; journey J2 |
| 14 | Search drawer | P | Frontend tests; browser states |
| 14b | Notifications: bell count, mark all read, delete, click to open, refresh while browsing | **F** | Bugs 14 and 15. Frontend tests (5); backend test; browser test (12 checks) |
| 15 | Account menu: My code, Log out | P | Scripted flow; browser states |
| 16 | Resume code: create, copy, resume on another browser, spoken-style entry | P | Scripted flow; journey J2 |
| 17 | Resume code: wrong format, unknown code, rate limit message | P | Backend tests; journey J1 |
| 18 | Theme toggle persists after reload | P | Scripted flow |
| 19 | Accessibility settings persist (refresh, new browser via code) | **F** | Local settings were replaced by defaults (bug 9). Frontend and backend tests; journey J2 |
| 20 | Text size 100-200%, high contrast, large targets, reduce motion | P / **F** | Header overflowed at phone width with large text (bug 11). Browser, 320-390 px |
| 21 | Keyboard shortcuts (Alt+Shift+letter) | P | Browser, mocked (Alt+Shift+R) |
| 22 | Footer link to the repository | P | Browser; axe |
| 23 | Voice commands (see section 3) | P / **F** | Bugs 7 and 8 |
| 24 | Text to speech (see section 3) | P | Browser, mocked speech |
| 25 | Real microphone, real speech output | - | Section 7 |
| 26 | NVDA / JAWS screen reader use | - | Section 7 |

---

## 3. Voice and speech testing

**All results in this section come from automated Jest tests and a browser run with a mocked speech service. None of them used a real microphone or speaker.**

### What was tested

| Area | Result | Test type |
|---|---|---|
| Phrase parsing: navigation, scrolling, back, help, click-by-name, text size, contrast, stop | P | Jest |
| Phrases that merely *mention* a command word do nothing (14 examples) | P after fix | Jest; browser, mocked |
| Recogniser lifecycle: off means no recogniser; start; "listening" state; result handled | P | Jest, mocked recogniser |
| Silence (`no-speech`) restarts quietly | P | Jest, mocked |
| Microphone permission **denied** (`not-allowed`): stops, shows the error, does not retry in a loop | P | Jest and browser, mocked |
| **No microphone** (`audio-capture`): clear message, no retry | P | Jest and browser, mocked |
| Short network drops retried; reported only after three in a row | P | Jest, mocked |
| Retry button starts a new session | P | Jest, mocked |
| Switching voice off or leaving the page aborts the recogniser and cancels a pending restart | P | Jest, mocked |
| **Unsupported browser** (no speech recognition): no crash; message shown; the site stays usable | P after fix | Jest and browser, mocked |
| Commands in the browser: go to quiz / progress / path, unknown click target message, high contrast, bigger and normal text, "stop listening" saves the setting off | P | Browser, mocked |
| Text to speech: Listen calls the synthesiser once with the lesson text; Stop cancels; voice "read this page" and "stop"; Alt+Shift+R shortcut | P | Browser, mocked |
| Text to speech **unsupported**: Listen button hidden (no dead button); "read this page" says the browser cannot read aloud; lesson text and transcript remain | P | Browser, mocked |
| Keyboard and mouse alternatives remain available in every failure case | P | Browser, mocked |

### Voice bugs found

- **Bug 7.** When the microphone was blocked or the browser did not support voice, the message appeared only inside the Accessibility dialog. A learner who never opened it saw nothing. A header alert now explains the problem, says the keyboard and mouse still work, and links to settings.
- **Bug 8.** Several commands matched anywhere in a sentence. "My accessibility homework is due" opened settings. Settings, text size and contrast commands now have to be the whole phrase.

### Not tested

A real microphone, the real browser speech service (Chrome's service needs internet and sends audio to a server), real voices and audio output, Edge's and Brave's differences, and recognition accuracy with real speech.

---

## 4. Bugs found and fixed

| # | Bug | Severity | Fix | Regression test |
|---|---|---|---|---|
| 1 | **Learning-path topics unlocked on their own.** Each read of the path (every page load) unlocked the next topic, so after about three page views the whole path was open. The documented rule is that later topics stay locked until earlier ones are completed. Cause: `_coerce_path_progress` unlocked the first locked topic whenever the first topic was open but not completed, and the result was saved on every read. | High | The first topic that is not completed is open; nothing else opens by reading. | `test_reading_the_path_does_not_unlock_topics`; `test_completing_a_topic_unlocks_only_the_next_one` |
| 2 | The server accepted "completed" or "in progress" for a locked topic. Only the buttons stopped it. | Medium | Both update routes return 400 for locked topics. | `test_locked_topics_cannot_be_started_or_completed_by_request` |
| 3 | A JSON body that was not an object (list, string, number) caused a 500, and the reply included Python error text. Quiz answers of the wrong type and list values in the My DNA form did the same. | Medium | `json_body()` helper returns a clear 400; type checks added. | `test_non_object_json_is_a_400_not_a_crash` (30 cases); quiz and intake tests |
| 4 | Unexpected server errors sent the raw exception text to the browser (a test with a fake database URL and password showed it in the response). | Medium | Generic message to the browser; details go to the server log. | `test_unexpected_errors_do_not_leak_details` |
| 5 | Video tracking accepted `inf` / NaN / non-numbers. `inf` was saved and then made that learner's `/api/context` fail permanently. | Medium | Numbers are cleaned and limited (0-100 %, 0-86 400 s); progress maths ignores bad stored values, so already-broken profiles recover. | `test_video_tracking_survives_bad_numbers` (7 cases); `..._clamps_percentages` |
| 6 | No limit on request size. | Low | 1 MB limit, answered with a JSON 413. | `test_oversized_requests_are_refused` |
| 7 | Voice problems visible only inside the settings dialog. | Medium (accessibility) | Header alert. | Frontend tests; browser, mocked speech |
| 8 | Voice commands triggered by ordinary sentences containing a command word. | Medium | Whole-phrase matching. | Jest (14 negative examples); browser |
| 9 | Settings stored in the browser were replaced by defaults when the server had nothing saved (new session, server restart, or a failed save). This also made my first high-contrast scan invalid, because the large-text setting was being thrown away. | High (accessibility) | The server now says whether anything is `saved`; the browser keeps its own copy otherwise and saves it. Older backends without the flag behave as before. | Backend test; two frontend tests; browser |
| 10 | When the server failed or could not be reached, Dashboard, Learning path, Quiz and Resources said "You have not built a study plan yet". A learner could rebuild and overwrite a saved plan. | High | Error message, "Your saved plan is not lost", and a Try again button. | Frontend tests (2); journey J4 |
| 11 | **Layout.** The header overflowed sideways at phone width with 150-200 % text; at 320 px with large text, Learning path, Quiz, Lessons, Goals, Home and Progress also scrolled sideways. Two scrollable tables were not reachable by keyboard at 320 px. | Medium (accessibility) | The header and its button group wrap; narrow-screen rules let columns shrink; both tables are focusable regions with names. | axe scans at 320 px; width check on 13 pages at 100/150/200 % |
| 12 | **The Account menu covered the right-hand page links** (Tutor, Progress) at 1280 px while open; axe flagged the partly hidden Tutor link. | Low (accessibility) | The menu now opens under the whole header, like the notifications panel, so it never covers the links. Escape and outside click still close it and Escape returns focus to the Account button. | Frontend test; open-panel scan now 24 of 24; scripted flow 21 of 21 |
| 13 | **Rate-limit key.** The resume-code limiter used the first `X-Forwarded-For` value even if it was junk, so a script could create endless new "visitors", and the table of visitors never shrank. | Low-Medium | Only real IP addresses are accepted (otherwise the connecting address is used); quiet visitors are forgotten; new setting `TRUSTED_PROXY_HOPS` makes the limiter use the address that a trusted proxy recorded instead of one the visitor wrote. Default `0` keeps the old behaviour, so nothing changes until you set it. | 5 backend tests |
| 14 | **Notifications could not be used.** The number on the bell never cleared; notifications were not clickable and could not be deleted or marked as read. The list was also loaded only once when the site first opened, so a new plan or quiz result did not appear until a full reload. | Medium | The bell counts new notifications and clears when the panel is opened. The panel has **Mark all read**, a delete button on each notification, and each notification opens its page (path, lesson, progress). The list refreshes on every page change. Choices are remembered in this browser (not across devices). The server now gives each notification a stable `id` and a `href`. | 5 frontend tests, 1 backend test, 12-check browser test (including axe with the panel open) |
| 15 | **The voice-commands message was a plain full-width bar** with no way to close it. | Low (design) | Now a card with an icon, a title, a short reason, a button to open settings and an X in the corner. The X is remembered for the browser session and the card returns if the problem changes. | 2 frontend tests; browser test (X dismisses, stays dismissed after reload) |
| 16 | **Sideways scroll at 320 px with 200% text** on the Learning path: the timeline's left space grows with text size and left the topic card almost no width. This explains the intermittent 7 px overflow reported earlier. | Low (accessibility) | Less left space on narrow screens, and headings, links and buttons may break a long word if they must. | Width check on 13 pages at 100/150/200 %, run twice after the change and clean both times |

---

## 5. Tests performed and exact results

| Check | Result |
|---|---|
| Backend `pytest` (in-memory and `mongomock`) | **151 passed** |
| The new backend tests against the original code | 90 failed (so they detect the bugs) |
| Frontend `npm test` | **43 passed** (3 suites) |
| Frontend production build, `CI=true` | Compiled successfully, no warnings (this also runs ESLint) |
| `ruff` (pyflakes rules, star-import and unused-import rules ignored) | 3 notes, all unused local variables (`learning.py`, `catalog_service.py`, a test). The same count was in the original code; none affect behaviour. Left as is. |
| axe-core scan, 13 pages x 3 widths x 3 modes (light, dark, high contrast with 150 % text, large targets and reduced motion) | **117 combinations, 0 violations, no sideways scroll, no console errors** |
| Open-panel scan (notifications, account menu, search, mobile menu) x light/dark x 1280/1000/390 px | **24 of 24 clean** (before the Account menu fix, 22 of 24) |
| Scripted flow (`interact.mjs`) | **21 of 21** |
| Mocked-speech browser suite (`voice.mjs`) | **48 of 48** |
| Notification panel browser test (`notif.mjs`) | **12 of 12** (one earlier start-up failure was a stale test server on the port, not the app; it passed on the next run) |
| Journey suite (`journeys.mjs`) | **46 of 46** |
| Width check at 320 px, 100/150/200 % text, 13 pages | No sideways scroll (twice, after fixing bug 16) |
| Static checks | No `dangerouslySetInnerHTML`, `eval` or `innerHTML` in the frontend. No keys, passwords or tokens in code or docs; secrets come only from environment variables. |
| `npm audit --omit=dev` | 78 findings, no critical. Most are in the react-scripts build tooling, which is not shipped to the browser. See section 6. |

**Fixed since the first draft of this report:** the Account menu used to cover the right-hand page links at 1280 px (bug 12).

### API and security probes (local, with test data only)

| Probe | Result |
|---|---|
| Every frontend API call has a matching backend route and method (checked by reading the code) | Yes. A few backend routes are not used by the frontend (`/api/features`, `/api/status`, `/api/path/update`, `/api/path/progress`) |
| CORS: unknown origin gets no allow header; preflight from an unknown origin gets none | Yes |
| Hostile text (script and image tags) in plan, goal, tutor, search and form fields | Stored and shown as plain text; no script ran, no element injected, on 11 pages |
| Path traversal in `/api/content/...` | Not served |
| Resume code: bad format, unknown code, spoken style, rate limit | Behaves as designed |
| Data persists across refresh and across browsers (resume code): plan, quiz results, path progress, settings | Yes |

---

## 6. Remaining risks (not changed)

1. **`SECRET_KEY` has a public default** (`learning-dna-dev-secret`). If it is not set on Render, session cookies can be forged. **Check this first.**
2. **The session cookie has no `Secure` flag.** It is sent only over HTTPS in practice (Vercel), but the flag is not set.
3. **Resume-code rate limit: partly fixed, one check left for you.**
   - *What changed:* junk in `X-Forwarded-For` is ignored, quiet visitors are forgotten, and the new `TRUSTED_PROXY_HOPS` setting lets the limiter ignore addresses the visitor wrote. The default (`0`) behaves as before.
   - *Why I did not simply turn it on:* Render's documentation and staff say the first address is the real client, but a Render user's own test found that Render only appends to what the client sends. Vercel (which sits in front of your API) is documented to overwrite the header, but I cannot see the real chain from here, and a wrong number would put every visitor into one shared bucket. So the right number has to be confirmed on the live site.
   - *One-minute check (browser console on the live site, on any page):* run the loop below. If you get `404` ten times and then `429`, rotating fake addresses did **not** help, so the public path through Vercel is protected. If you never get `429`, tell me the output and we will set `TRUSTED_PROXY_HOPS`.
     `for (let i = 0; i < 13; i++) { const r = await fetch('/api/account/resume', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Forwarded-For': '10.1.1.' + i}, body: JSON.stringify({code: 'maple-river-tiger-42'})}); console.log(i, r.status); }`
   - *Still true:* the server-wide cap (60 wrong codes a minute) lets anyone block *everyone's* resume for a minute, and honest users on shared school Wi-Fi share one address and can be locked out after 10 wrong tries. Someone who calls the Render address directly (not through Vercel) may still be able to fake the header. The limiter lives in each server process, so several workers multiply the limits.
4. **Codes are the only login.** There is no password. Anyone with the code opens the progress (the page says so). The code space is about 2 billion, protected only by the rate limit above.
5. **Memory fallback.** If MongoDB is not configured, data is kept in memory and is lost on restart. Check the Render settings.
6. **Dependencies.** `npm audit` reports 78 findings, mostly build tooling. `react-router` 6.30.6 has two advisories fixed only in version 7 (open redirect through backslashes in links; server-side-render hydration). The app navigates only to fixed routes and does not use server rendering, so exposure is low, but a major upgrade is future work.
7. **Locked topics.** Watching 40 % of a video on a locked topic still sets it to "in progress" (the page shows videos for locked topics). Left as designed behaviour.
8. **Unbounded stored activity.** A client can keep adding video/course tracking entries to its own profile.
9. **Theme.** Dark/light is saved per browser, not per account (accessibility settings are per account).
10. **Cold starts.** The free Render plan sleeps; the loading screen explains this after 6 seconds (tested with a simulated slow server).

---

## 7. Not tested, and why

| Not tested | Why |
|---|---|
| Real microphone, real speech recognition accuracy, real audio output and voices | The test environment has no audio hardware and no real speech service. |
| NVDA / JAWS / VoiceOver | No screen reader available. The markup was checked by axe and keyboard tests only. |
| The live site and live API | The environment cannot reach them. Production URLs and Vercel's `/api` rewrite were read from `vercel.json` but not exercised. |
| Real MongoDB Atlas | Only `mongomock` was available. Indexes, network errors and cloud limits are untested. |
| Whether external video, course and dataset links still work | The environment cannot reach those sites. All external links were checked only for `rel="noopener"`. |
| Safari, Firefox, Edge, real phones | Only Chromium was used. |
| Load and security attacks (denial of service, brute force at scale) | Out of scope and could harm real users. |
| The TensorFlow model on the live site | The live site uses the scikit-learn fallback. |
| Performance scores (Lighthouse / PageSpeed) | Must be run on the live site. |

---

## 8. Manual checks to do yourself

1. In **Render**: confirm `SECRET_KEY` is a long random value, `MONGO_URI` is set, and `STORE_BACKEND` is `auto` or `mongo`.
2. In **Chrome and Edge**, with a real microphone: turn voice commands on, allow the microphone, say "go to quiz", "scroll down", "stop listening". Then block the microphone and check that the header message appears.
3. Press **Listen** on a lesson with sound on; test Stop and the speed setting.
4. **NVDA** (free) with Firefox or Chrome: My DNA form, Quiz, Lessons, Progress table, the notifications panel and the Account menu.
5. On a **real phone**: open the menu, open notifications, turn text size to 150-200 %, and look for sideways scrolling.
6. Open a few external video and course links from Resources to check that they still work.
7. After deploying, run **Lighthouse / PageSpeed** on the live site and repeat the NVDA pass on the final design.
8. Stop the Render service (or turn off Wi-Fi) briefly and confirm the new "We could not load your plan" message appears with Try again.
9. Check the favicon, the notifications panel and the footer link on the live site after deploying (clear the cache with Ctrl+Shift+R).

---

## 9. How to re-run the checks

Backend and frontend tests:

```powershell
cd C:\Users\PC\Desktop\learning-dna
pytest
cd frontend
npm test
```

The browser scripts used for this audit are in `_session-tools/browser-check/` (see its README). They need Node and a Chromium build, and were run in a Linux sandbox, so they may need adjusting on Windows.
