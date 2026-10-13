# CropDrop maintenance schedule

Hosting: Render (Node.js web service, free) and Neon (PostgreSQL, free). Owner: the developer.

## 1. Backup and recovery

| What | How | Frequency | Where it goes |
|---|---|---|---|
| Database dump | `pg_dump "$DATABASE_URL" -Fc -f cropdrop-$(date +%F).dump` run from WSL (install `postgresql-client` if needed) | Weekly, and before every release that changes `schema.sql` | Local folder plus a second copy in private cloud storage. Never in the Git repository. |
| Source code | Already on GitHub | Every commit | GitHub. |
| Environment variables | Export them to a password manager | After any change | Password manager, not Git. |
| Product photos | Product images are Unsplash links, so there are no files to back up. Uploaded photos live on a temporary disk and are lost on redeploy. | n/a | n/a |

**Recovery steps**
1. Create a new Neon project (or use the existing one if it is intact).
2. Restore: `pg_restore --clean --no-owner -d "NEW_DATABASE_URL" cropdrop-YYYY-MM-DD.dump`
3. Update `DATABASE_URL` in the Render dashboard and let it redeploy.
4. Check `/api/health`, log in as admin, open the Market and My orders pages.
5. Record the incident in the log below.

**Restore test.** Once a month restore the latest dump into a scratch Neon database and run `SELECT count(*) FROM users;` to prove the backup is usable.

## 2. Dependency updates

| Task | Command | Frequency |
|---|---|---|
| Check for outdated packages | `npm outdated` | Monthly |
| Apply minor and patch updates | `npm update`, then `npm test` and a manual login/order check | Monthly |
| Major version upgrades | One package at a time on a branch, full test run | When needed, at most quarterly |
| Node.js version | Keep within the current LTS; update `engines` in `package.json` | Every 6 months |
| After any update | `npm test` (46 checks) must pass before pushing | Every time |

## 3. Security checks

| Check | How | Frequency |
|---|---|---|
| Known vulnerabilities | `npm audit` | Weekly; fix high and critical issues within 48 hours |
| Admin and user review | In Neon SQL editor: `SELECT id, email, role, status, created_at FROM users WHERE role='admin' OR status='pending';` Remove anything unexpected. | Monthly |
| Credential rotation | Change `ADMIN_PASSWORD` and `SESSION_SECRET` in Render. Changing the secret logs everyone out. | Every 3 months, and immediately after any suspected leak |
| Secrets in Git | `git log --all -p \| grep -iE "SESSION_SECRET=.+\|postgres://[^ ]+@"` | Before each release |
| Security headers and HTTPS | `curl -sI https://YOUR-NAME.onrender.com` shows `strict-transport-security` and `content-security-policy` | Monthly |
| Failed login and rate-limit activity | Search Render logs for repeated 401 or 429 responses | Weekly |

## 4. Application health monitoring

| What | How | Frequency |
|---|---|---|
| Service up | `curl https://YOUR-NAME.onrender.com/api/health` returns `"db":"up"` | Daily while in use |
| Errors | Render Logs tab, search `error` | Daily while in use, otherwise weekly |
| Memory and CPU | Render Metrics tab (free instance has 512 MB) | Weekly |
| Database size | Neon dashboard, keep under the 0.5 GB free limit; alert yourself at 70 percent | Weekly |
| Database compute hours | Neon dashboard, keep under 100 hours per month | Weekly |
| Hosting terms | Re-read Render and Neon free-tier pages for changes | Quarterly |

**Thresholds that trigger action:** any 5xx errors in the logs, health check failing twice in a row, database over 70 percent of its storage, or any high or critical `npm audit` finding.

## 5. Incident and change log (keep this table up to date)

| Date | What happened or changed | Action taken | Verified by |
|---|---|---|---|
| | | | |
