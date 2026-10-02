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

---

## 6. Cleanup Scheduler

### What Runs Every 30 Minutes
- **Workflow:** `.github/workflows/cleanup-expired-orders.yml`
- **Target:** `POST https://abxv.vercel.app/api/cron/cleanup-expired-orders`
- **Purpose:** Identifies pending Stripe checkout sessions older than 30 minutes, cancels uncaptured PaymentIntents, restores reserved stock back to product inventory, and transitions orders to `CANCELLED`.
- **Failure Alert:** If the endpoint returns a non-2xx status code (or connection fails), the workflow terminates with an exit code of `1`, automatically triggering GitHub email alerts for the failed run.

### Secret Management & Synchronization
The workflow passes `Authorization: Bearer ${{ secrets.CRON_SECRET }}` and the Next.js API route validates against `process.env.CRON_SECRET`. **Both secrets must match exactly.**

### How to Rotate `CRON_SECRET`
To rotate the secret without exposing its value:
```powershell
# 1. Generate new 32-byte secret in shell variable (never printed)
$secret = (node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")

# 2. Update GitHub secret
$secret | & "C:\Program Files\GitHub CLI\gh.exe" secret set CRON_SECRET --repo Aavash2004/shoe-store

# 3. Update Vercel production environment variable
$secret | npx vercel env add CRON_SECRET production --force

# 4. Clean variable from shell
Remove-Variable secret

# 5. Redeploy to apply updated env var to live production functions
git commit --allow-empty -m "chore: redeploy with rotated CRON_SECRET"
git push origin main
```

### Re-enabling the Workflow if Disabled
GitHub automatically disables scheduled workflows on repositories that have had no commits or activity for 60 days.
- **Automated Prevention:** `.github/workflows/keepalive.yml` runs on the 1st of every month to keep the schedule active using `gh workflow enable`.
- **Manual Re-enable Command:**
  ```powershell
  & "C:\Program Files\GitHub CLI\gh.exe" workflow enable cleanup-expired-orders.yml --repo Aavash2004/shoe-store
  ```
  *(Or navigate to GitHub repository -> Actions -> select "Cleanup Expired Orders" -> click "Enable workflow").*

---

## 7. External Dedicated Schedulers (cron-job.org / Upstash QStash)

Because GitHub Actions schedules run on shared runner queues and can experience latency jitter (ranging from a few minutes to hours during peak platform traffic), you can complement or replace it with a dedicated external scheduler:

### Option A: cron-job.org (Free Cloud Cron)
1. In the [cron-job.org](https://cron-job.org) dashboard, click **Create Cronjob**.
2. **Title**: `ABXV Cleanup Expired Orders`
3. **URL**: `https://abxv.vercel.app/api/cron/cleanup-expired-orders`
4. **Schedule**: User-defined / Every 30 minutes (`*/30 * * * *`).
5. **Request Method**: `POST`
6. **Headers**:
   - `Authorization`: `Bearer <CRON_SECRET>` *(Use the value stored in Vercel Production Environment Variables)*
   - `Content-Type`: `application/json`
7. **Alerts**: Enable email alerts if status is not `200 OK`.

### Option B: Upstash QStash (Serverless Cron with Retries)
1. In the [Upstash Console](https://console.upstash.com/qstash) -> **QStash** -> **Schedules**:
2. Click **Create Schedule**:
   - **Destination URL**: `https://abxv.vercel.app/api/cron/cleanup-expired-orders`
   - **Cron Expression**: `*/30 * * * *`
   - **HTTP Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer <CRON_SECRET>`
3. QStash handles automatic exponential retries and detailed delivery logs.


