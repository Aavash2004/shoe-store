# Deployment Guidelines & Prevention Protocol

This document outlines the deployment standards, operational rules, and platform constraints for the **Shoe Store** web application deployed on **Vercel** (`abxv.vercel.app`).

---

## 1. Always Push to GitHub Before Checking Deployments

Vercel's Git integration builds from commits pushed to the remote repository on GitHub (`origin/main`). Commits that exist only in your local workspace will **not** trigger builds or appear on Vercel.

**Standard Release Workflow:**
```bash
# 1. Check local status
git status

# 2. Stage and commit changes
git add .
git commit -m "feat/fix: descriptive message"

# 3. Push to remote main (CRITICAL)
git push origin main

# 4. Verify branch is synchronized with remote
git status
# Output should confirm: "Your branch is up to date with 'origin/main'."
```

---

## 2. Never Use Dashboard "Redeploy" to Release New Code

In Vercel:
- **"Redeploy"** strictly rebuilds the **exact historical commit snapshot** associated with that deployment record.
- It does **not** fetch new Git commits or update to the latest branch head.
- Clicking "Redeploy" on an older deployment will continuously rebuild old code and overwrite production with stale assets.

**How to deploy new changes:**
- **Automatic:** Simply run `git push origin main`. Vercel automatically detects new commits and triggers a fresh production build.
- **Manual Trigger:** Use your Vercel Deploy Hook, or run `npx vercel --prod` from your terminal.

---

## 3. Vercel Hobby Plan Cron Limitations

Vercel's Hobby (free) plan enforces a strict rule on scheduled cron jobs:
- **Maximum Frequency:** **Once per day** (`0 X * * *`).
- Any sub-daily interval (such as `*/30 * * * *`, `0 * * * *`, or `*/5 * * * *`) in `vercel.json` causes Vercel to **reject the deployment validation entirely**, blocking all subsequent builds from deploying.

### Architecture for Frequent Scheduled Tasks
To execute tasks more frequently than once per 24 hours without upgrading to Vercel Pro:
1. Keep the daily schedule in `vercel.json` as a passive fallback.
2. Delegate the high-frequency schedule (e.g. every 30 minutes) to an external runner:
   - **GitHub Actions:** Configured in `.github/workflows/cleanup-expired-orders.yml` running on cron `*/30 * * * *` with `workflow_dispatch`.
   - The workflow invokes the endpoint `POST https://abxv.vercel.app/api/cron/cleanup-expired-orders` authenticated via `Authorization: Bearer ${{ secrets.CRON_SECRET }}`.

---

## 4. Run `npx vercel build` Before Pushing Config Changes

Before pushing modifications to configuration files (`vercel.json`, Next.js rewrites, headers, middleware, or cron jobs), validate the build locally to catch schema or plan violations before deployment:

```bash
# Verify TypeScript and build output locally
npx vercel build
```

This ensures that any configuration errors, missing environment variables, or platform constraint violations are identified immediately on your local machine.

---

## 5. Required Production Secrets

The following environment variable must be maintained:

| Variable | Platform | Description |
|---|---|---|
| `CRON_SECRET` | **Vercel** (Environment Variables) | Used by `/api/cron/*` routes to authenticate incoming cron triggers. |
| `CRON_SECRET` | **GitHub** (Repository Secrets) | Used by `.github/workflows/*.yml` to authenticate requests to Vercel. |

*Note: Never commit secret values into source control or document them in plaintext.*
