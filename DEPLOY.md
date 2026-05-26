# Deploying Panko

Goal: a public URL you can text to friends. ~30 minutes one-time setup.
Stack: **Vercel** (frontend, free) + **Render** (backend, free tier).

---

## 0. Pre-flight check

Before pushing to GitHub, double-check that secrets aren't tracked:

```bash
cd "C:/Users/wespa/Desktop/Panko Risk Lab"
git status                # if it's not a git repo yet, see step 1
cat .gitignore | grep .env # should show .env, .env.local, etc.
```

If `backend/.env` shows up in `git status`, something is wrong — stop and tell me.

---

## 1. Push to GitHub

If this isn't a git repo yet:

```bash
cd "C:/Users/wespa/Desktop/Panko Risk Lab"
git init
git add .
git commit -m "Initial Panko deploy"
```

Create a new repo on GitHub (private is fine), then:

```bash
git remote add origin git@github.com:<your-username>/panko.git
git branch -M main
git push -u origin main
```

Verify on the GitHub web UI that you do **not** see `backend/.env` in the repo. If you do, your `.gitignore` didn't catch it — delete the file from the repo immediately and rotate the API key.

---

## 2. Deploy the backend (Render)

1. Sign up at https://render.com (free, takes 30 seconds via GitHub).
2. **New → Blueprint** → connect your GitHub repo.
3. Render auto-detects the `render.yaml` at the repo root and creates a `panko-backend` service. Click **Apply**.
4. While it builds, set the secret env vars:
   - **Environment → Add Environment Variable**
   - `ANTHROPIC_API_KEY` = your real key (the one in `backend/.env`)
   - Leave `PANKO_ALLOWED_ORIGINS` empty for now — we'll set it once Vercel gives us a URL.
5. Wait for build to finish (~2-3 minutes). When the status flips to **Live**, copy the URL — it'll look like `https://panko-backend.onrender.com`.
6. Smoke test: paste `https://panko-backend.onrender.com/api/health` into a browser. Should return `{"status":"ok"}`. If it does, backend is live.

> **Note on free tier:** the service spins down after 15 minutes of no traffic. The first request after that takes ~30 seconds to wake up. After that it's instant until the next idle period. Keep-warm setup is in the next section.

### Keeping the backend warm

We ship `.github/workflows/keepalive.yml`, a 5-minute cron that pings `/api/health` from GitHub Actions. **This is not enough on its own** — GH Actions cron is known to skip runs by 5-15 minutes during busy periods, which can drift past Render's 15-minute idle threshold. The 2026-05-25 outage was exactly this.

For a real-user-grade keep-warm, layer one of these on top:

1. **UptimeRobot (recommended, free).** Sign up at uptimerobot.com, add a new HTTPS monitor pointed at `https://panko-backend-ho2k.onrender.com/api/health`, interval 5 minutes. No drift, no cron, free for 50 monitors. ~3 minutes of setup.
2. **Render Starter tier ($7/mo).** Eliminates the spin-down entirely, plus you get persistent disk. The real answer once you have real users.

You can delete `keepalive.yml` once UptimeRobot is in place — keeping both is harmless but wasteful.

---

## 3. Deploy the frontend (Vercel)

1. Sign up at https://vercel.com (free, 30 seconds via GitHub).
2. **Add New → Project** → import your GitHub repo.
3. Configure:
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** `frontend`  ← **important**, click "Edit" to change from `./`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
4. Expand **Environment Variables**:
   - `VITE_API_URL` = `https://panko-backend.onrender.com` (the URL from step 2)
5. Click **Deploy**. Wait ~1 minute.
6. You'll get a URL like `https://panko-<random>.vercel.app`. Test it — the welcome page should load.

---

## 4. Wire CORS

The backend's CORS middleware allows any `*.vercel.app` origin by default (regex match), so step 3 should already work. But to lock it to **only your specific Vercel app** (more secure):

1. Back in Render, find your service → **Environment**
2. Set `PANKO_ALLOWED_ORIGINS` = `https://your-app.vercel.app` (no trailing slash)
3. **Manual Deploy → Clear build cache & deploy** to pick up the new env var.

---

## 5. Smoke-test the full app

Open your Vercel URL. Walk through:

- [ ] Welcome screen loads
- [ ] Sign in with name → land on Dashboard
- [ ] Go to Analyze, enter `AAPL 50% / MSFT 50%`, dates `2023-01-01 → 2024-01-01`, **Analyze Portfolio**
  - First click may take ~30s if backend was sleeping. Subsequent clicks: instant.
- [ ] Dashboard shows Panko Score with 5-pillar bar
- [ ] Open Assistant (⌘K) → ask a question → get a real Claude reply
  - If it says "ANTHROPIC_API_KEY is not set," the env var didn't propagate — re-deploy the backend.
- [ ] Try Thesis tab → pick "Retirement Safety" → Generate suggestions
- [ ] Try Improve → should compute optimized paths

---

## 6. Send to your friends

```
Hey, working on a portfolio risk tool. Would love your feedback —
takes 5 min: https://your-app.vercel.app

(Educational tool, not financial advice. Your data stays in your browser.)
```

---

## Updating the deployed app

Both Vercel and Render auto-deploy on every `git push` to `main`. So:

```bash
git add .
git commit -m "Whatever changed"
git push
```

…and ~2 minutes later, both services rebuild. No clicking required.

---

## Costs

- **Vercel free tier:** 100 GB bandwidth/month. You'll never hit it with friend testing.
- **Render free tier:** Spins down after 15 min idle. 750 instance hours/month (≈always-on if you stay below).
- **Anthropic API:** pay-per-token. Each Assistant question is ~$0.001 with Haiku 4.5. Each Thesis generation is ~$0.005. Friend testing → maybe $1-2 total.

---

## Rolling back / undoing

- **Vercel:** every deploy is preserved. Project → Deployments → click any older one → "Promote to Production."
- **Render:** Deployments tab → "Rollback" any prior deploy.
- **GitHub:** standard `git revert` works since each deploy is tied to a commit.

---

## Common issues

**"Failed to fetch" on the Vercel URL**
→ Backend isn't reachable. Check Render dashboard: is the service Live? Is the URL correct in `VITE_API_URL` on Vercel?

**CORS error in browser console**
→ `PANKO_ALLOWED_ORIGINS` doesn't match your Vercel URL exactly (trailing slashes matter). Or you locked it down too tight — set it back to empty to use the regex default.

**Assistant says "ANTHROPIC_API_KEY is not set"**
→ Set the env var on Render and re-deploy the backend. Render env changes don't auto-redeploy — you have to trigger one.

**First analysis takes 30 seconds**
→ Render free-tier cold start. Normal. Tell your friends to expect it.

**yfinance rate-limit errors**
→ Yahoo throttles. Fixed in `backend/data/fetcher.py` — the user sees a clear "wait 1-2 minutes" message instead of a generic error.
