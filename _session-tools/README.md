# Session tools (not part of the repository)

These scripts were used by Claude to check the redesign in a real headless browser. Do not commit this folder.

* `browser-check/serve.py` serves `frontend/build` and proxies `/api` to Flask (like Vercel's rewrite does).
* `browser-check/shoot.mjs` renders every page at chosen widths and runs axe-core. Usage: `node shoot.mjs <widths> <seeded|fresh|hc> <light|dark> <all|page,page> [tag]`
* `browser-check/interact.mjs` drives the app like a user (21 checks).
* `run.sh` and `run2.sh` start the backend and static server, run one of the scripts, then stop everything.

Setup used (paths in the scripts are for Claude's sandbox and need adjusting):
`npm i @sparticuz/chromium puppeteer-core axe-core`, then build the frontend (`CI=false npm run build` inside `frontend`).
Run the backend with `STORE_BACKEND=memory SECRET_KEY=test` on port 5055. Background processes die when a command ends, so start and stop servers inside one command.
