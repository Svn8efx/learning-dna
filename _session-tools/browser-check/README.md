# Browser check scripts

Scripts used for the audits (see `docs/FINAL_AUDIT.md`). They were run in a Linux sandbox with headless Chromium,
so paths and the Chromium package may need adjusting on Windows. They are test tools, not part of the app.

| Script | What it checks |
|---|---|
| `shoot.mjs` | axe-core scan of every page. `node shoot.mjs 1280,390,320 seeded light all` (modes: `seeded` or `hc` with light/dark) |
| `interact.mjs` | 21-step scripted user flow (plan, quiz, path, lesson, My DNA, resume code, mobile menu) |
| `states.mjs` | axe scan with notifications, account menu, search and mobile menu open |
| `voice.mjs` | Voice and text-to-speech with a **mocked** speech service (denied, no microphone, unsupported, commands, read aloud) |
| `journeys.mjs` | Resume code, server errors and slow server, hostile text, keyboard-only use, link integrity |
| `width-check.mjs` | Sideways scroll on every page at 320 px with 100%, 150% and 200% text |
| `serve.py` | Serves the built frontend and proxies `/api` to the backend on port 5055, like Vercel's rewrite |

Setup: build the frontend (`npm run build` in `frontend`), start the backend on port 5055 and `serve.py` on port 5056, install
`puppeteer-core`, `@sparticuz/chromium` and `axe-core` next to the scripts, then run a script with `node`.
The mocked-speech results do not prove that a real microphone or speaker works.
