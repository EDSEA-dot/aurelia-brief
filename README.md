# Aurelia Health Daily Brief — Deploy Guide

## What this is
A hosted web app with two parts:
- `/` — the daily brief input tool
- `/brief/2026-04-22` — a shareable, permanent URL for each day's brief

## Setup (one time, ~10 minutes)

### Step 1 — Upstash (free database)
1. Go to https://upstash.com and sign in with GitHub
2. Click **Create Database**
3. Name it `aurelia-brief`, pick the region closest to you, click **Create**
4. On the database page, scroll to **REST API**
5. Copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** — you'll need these in Step 3

### Step 2 — Deploy to Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Import your `aurelia-brief` GitHub repository
4. Click **Deploy** (don't change any settings yet)
5. It will fail on the first deploy — that's expected. Continue to Step 3.

### Step 3 — Add environment variables
1. In your Vercel project, go to **Settings → Environment Variables**
2. Add these two variables:
   - Name: `UPSTASH_REDIS_REST_URL` → paste the URL from Step 1
   - Name: `UPSTASH_REDIS_REST_TOKEN` → paste the token from Step 1
3. Click **Save** for each
4. Go to **Deployments** and click **Redeploy** on the latest deployment

### Step 4 — Done!
Your app is live at `https://aurelia-brief.vercel.app` (or similar).

## How to use every morning
1. Open your Vercel URL
2. Fill in the brief (upload Notion CSV for auto-fill)
3. Click **Publish & Get Link**
4. Share the link — e.g. `https://aurelia-brief.vercel.app/brief/2026-04-22`
5. Anyone with the link can view the full brief, no login needed
6. Briefs are stored for 90 days

## File structure
```
aurelia-brief/
├── public/
│   └── index.html      # The input tool
├── api/
│   ├── save.js         # Saves brief data to Upstash
│   └── view.js         # Renders the brief as a web page
├── package.json
└── vercel.json
```

## Future automations
When you're ready to connect Notion, Slack, Meta Ads etc. automatically,
those integrations will POST data to `/api/save` on a schedule — no manual
form filling needed. The brief will be ready at its URL every morning.
