# Cymor Website Builder

Type a prompt → get a live deployed website, a GitHub repo, and a downloadable ZIP. Built on Node/Express, MongoDB Atlas, Gemini, GitHub API, and Vercel — free tier throughout.

See `cymor-website-builder-spec.md` (shared earlier in this chat) for the full architecture writeup. This README covers what you need to actually run it.

---

## 1. What's in this folder

```
cymor-website-builder/
  backend/
    server.js              → Express entrypoint
    routes/api.js           → all API endpoints
    services/
      aiService.js           → Gemini: classify prompt + generate copy
      templateService.js     → picks the template file for a category
      generatorService.js    → merges AI content into the template
      validationService.js   → pre-deploy checks
      seoService.js          → robots.txt / sitemap.xml generation
      githubService.js        → creates repo + commits generated site
      deployService.js        → deploys straight to Vercel via API
      zipService.js            → streams a ZIP download, no disk writes
      pipelineService.js       → orchestrates the full flow + job queue
    models/Project.js        → MongoDB schema
    templates/saas.html       → the v1 template (used for all 6 categories for now)
    .env.example              → copy this to .env and fill in
    package.json
  frontend/
    index.html              → the entire builder UI (single file, no build step)
```

---

## 2. Environment variables you need

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Where to get it | Required? |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas → your cluster → **Connect → Drivers** → copy the connection string, swap in your DB user password | ✅ Yes |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey — free tier | ✅ Yes |
| `GEMINI_MODEL` | Defaults to `gemini-2.0-flash` — leave as-is unless you want a different model | No |
| `GITHUB_TOKEN` | GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)** → generate with **`repo`** scope checked | ✅ Yes |
| `GITHUB_OWNER` | Your GitHub username (repos get created under this account) | ✅ Yes |
| `VERCEL_TOKEN` | Vercel → **Account Settings → Tokens → Create Token** | ✅ Yes |
| `VERCEL_TEAM_ID` | Only needed if your Vercel account is a Team, not a personal account — find it in Team Settings | No |
| `PORT` | Defaults to `5000` | No |
| `CORS_ORIGIN` | Your deployed frontend URL once live (e.g. your Render URL). Use `*` while testing locally | No |
| `MAX_CONCURRENT_GENERATIONS` | Defaults to `3` — caps how many generations run at once, to stay inside Gemini's free-tier rate limit | No |

**Nothing else needs a key.** GitHub repos are created public by default (`private: false` in `githubService.js`) since Vercel deploys read from the file payload directly, not from GitHub — GitHub here is just for source-control visibility.

---

## 3. Running it locally

```bash
cd backend
npm install
cp .env.example .env
# fill in .env with the values above
npm start
```

Then open `http://localhost:5000` — the backend serves the frontend directly, so there's nothing separate to run for the UI.

---

## 4. Deploying the builder itself (not the generated sites — this app)

1. Push this repo to GitHub.
2. Render → New → Web Service → connect the repo.
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Add all the env vars from the table above in Render's dashboard.
3. Once live, set `CORS_ORIGIN` to that Render URL and redeploy.

The frontend is served by the same Express app — no separate static host needed.

---

## 5. Known v1 limitations (by design, not bugs)

- **One template design, six category labels.** All six categories currently render through `templates/saas.html`; only the AI-written copy changes per category. Add `templates/restaurant.html` etc. and register them in `templateService.js`'s `TEMPLATE_MAP` as you build each one out.
- **Sites deploy to *your* Vercel account**, not the end user's. This avoids needing Vercel OAuth for v1. Every generated site becomes a project under your Vercel account — fine at current scale, worth revisiting if this gets real traffic.
- **No auth yet.** `/api/projects` returns everyone's projects. Fine for solo use or a closed beta; add a `userId` field to `Project` and a login step before opening this up publicly.
- **Editing isn't wired up yet.** The spec's `/api/edit` endpoint isn't built — regenerating currently means submitting a new prompt. Straightforward to add: re-run `generateContent` with the existing prompt + an edit instruction, re-merge, re-commit, re-deploy.

---

## 6. Quick way to tell it's working

1. Open the app, type: `Create a modern law firm website with online booking`
2. Watch the pipeline diagram move through Analyze → Content → Validate → GitHub → Deploy → Live
3. You should land on a live `.vercel.app` URL, a GitHub repo link, and a **Download ZIP** button — all three, every time.

If any step fails, the error message in `statusLine` on the page (and in `project.error` in MongoDB) will say exactly which service rejected the request — almost always a missing or malformed env var.
