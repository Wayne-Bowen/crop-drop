#  Hosting CropDrop

Application: CropDrop, Node.js 20+ and Express 5, PostgreSQL, sessions stored in the database.
Plan chosen: **Render (web service) + Neon (PostgreSQL)**, both on free tiers, deployed from GitHub.

Free-tier terms change often. The figures below were checked on 13 October 2026 against the sources listed at the end. Re-check the pricing pages on the day you submit, and change anything that has moved.

---

##  Platform choice

### What the app needs
| Need | Why |
|---|---|
| Node.js 20+ runtime, `npm start` | Express server in `server.js`. |
| Reads `PORT` from the environment | Hosts assign the port. |
| PostgreSQL | Data model with foreign keys and transactions; sessions are stored in the same database. |
| Git deployment | Code lives on GitHub. |
| HTTPS | Login sessions use secure cookies in production. |

### Comparison

| | **Render** (web service) | **Railway** |
|---|---|---|
| Free resources | Free web service: 512 MB RAM, 0.5 vCPU, 750 instance hours per month. | No permanent free tier. One-time trial with $5 of credit, then Hobby at $5 per month with $5 of usage included. |
| Idle behaviour | Spins down after 15 minutes without traffic. The next request takes about a minute. | Stays running while credit lasts; usage is metered, so a running app and database use up credit continuously. |
| Automatic SSL/TLS | Yes, HTTPS on `onrender.com` addresses. Confirm the padlock during Task 6. | Yes, HTTPS on generated domains. Confirm during testing. |
| Git deployment | GitHub or GitLab connection, deploys on every push to the chosen branch. | GitHub connection, deploys on every push. |
| Database support | Managed PostgreSQL. **Free database expires 30 days after creation, has no backups, and only one is allowed per account.** | Postgres added in the same project, but it is billed as metered usage and can use more than the monthly credit by itself. |
| Credit card | Not required for the free tier. | Account verification is needed for the trial. |

### Database comparison

| | **Neon** | **Render Postgres (free)** |
|---|---|---|
| Free allowance | 0.5 GB storage and 100 compute-hours per month per project. | 1 GB storage. |
| Expiry | None. The free plan is permanent. | Deleted 30 days after creation. |
| Idle behaviour | Compute suspends after 5 minutes idle and wakes on the next query (a few seconds). | Always on while it exists. |
| Connection | Standard PostgreSQL connection string, SSL required. | Standard connection string. |
| Credit card | Not required. | Not required. |

### Final choice and justification
**Render for the web service and Neon for the database.**

* **Backend compatibility.** Render detects Node.js, runs `npm install` then `npm start`, and passes `PORT`. Neon is standard PostgreSQL, so CropDrop's SQL, transactions and session store work unchanged. Only `DATABASE_URL` and `DATABASE_SSL=true` change.
* **Ease of deployment.** Connect the GitHub repository, set six environment variables, click deploy. No Dockerfile or CLI.
* **Reliability trade-offs.** Neon's database does not expire, which is why it is used instead of Render's free database (deleted after 30 days, no backups). Railway was rejected because it cannot stay free once the trial credit is used.
* **Known limits, accepted.** (1) The first request after 15 idle minutes takes about a minute. (2) The web service disk is temporary, so photos uploaded from the dashboard disappear on redeploy. CropDrop avoids this by using Unsplash photo links for product images. (3) Neon's free storage is 0.5 GB, plenty for this project.

### Sources (checked 13 October 2026)
* Render free tier documentation: docs.render.com/free
* Neon plans: neon.com/pricing and neon.com/docs/introduction/plans
* Railway pricing summaries from third-party reviews (April to August 2026). Railway's own pricing page should be checked directly before you quote it.

---

##  Domain lookup on www.cdacc.go.ke

Run these in WSL and paste the output into your report as screenshots or text.

```bash
sudo apt install -y whois dnsutils      # once
whois cdacc.go.ke
dig cdacc.go.ke A +noall +answer
dig cdacc.go.ke NS +noall +answer
dig cdacc.go.ke MX +noall +answer
dig cdacc.go.ke TXT +noall +answer
dig www.cdacc.go.ke CNAME +noall +answer
```
If `whois` returns little, use the registry's own lookup. `.ke` domains are managed by KeNIC, so search for the KeNIC WHOIS page.

Record exactly what the tools show. Do not fill in anything from memory.

| Item | Value found | Command or page used |
|---|---|---|
| Domain | cdacc.go.ke | |
| Registrar / registry | | |
| Registration date | | |
| **Expiry date** | | |
| Name servers (NS) | | |
| A record (IP address) | | |
| Mail servers (MX) | | |
| Other DNS records (TXT, CNAME) | | |
| Date and time of lookup | | |

---

## GitHub repository

You have already pushed. Prove each requirement and keep the output as evidence.

| Requirement | How to verify |
|---|---|
| Repository exists with all source code | `git remote -v` then `git ls-files` (list all tracked files). |
| Initialised locally with documentation | `README.md` and the `docs/` folder appear in `git ls-files`. |
| `.gitignore` for sensitive files | `cat .gitignore` shows `.env`, `node_modules/` and `uploads/*`. |
| No secrets committed | `git ls-files \| grep -E "^\.env$"` prints nothing. `git log --all -p \| grep -iE "ADMIN_PASSWORD=.+\|SESSION_SECRET=.+\|postgres://[^ ]+@"` prints nothing real. |
| README covers framework, environment variables, setup | Open `README.md`: Node.js and Express, the variables table, and the WSL setup steps are all there. |
| All files accessible | Clone fresh into a temporary folder: `git clone https://github.com/Wayne-Bowen/YOUR-REPO.git /tmp/verify && ls /tmp/verify` |

If a secret was ever committed, changing it later is not enough because it stays in history. Rotate the secret (new password or key) and then clean history.

Commit the new documents:
```bash
git add docs README.md db.js
git commit -m "Add hosting documentation and harden database pool for hosted Postgres"
git push
```

---

##  Deployment account and configuration

### A. Create the database (Neon)
1. Sign up at neon.com with GitHub. No card is needed.
2. Create a project, name it `cropdrop`, pick the region nearest to you.
3. On the dashboard, open **Connect** and copy the connection string. It looks like `postgresql://user:password@host/dbname?sslmode=require`. **Treat it as a password.**

### B. Create the web service (Render)
1. Sign up at render.com with GitHub.
2. **New** then **Web Service**, then connect your GitHub account and choose the CropDrop repository.
3. Settings:

| Setting | Value |
|---|---|
| Name | `cropdrop` (this becomes `cropdrop.onrender.com`; if taken, add something to the name) |
| Branch | `main` |
| Runtime | Node |
| Build command | `npm install` |
| Start command | `npm start` |
| Instance type | Free |
| Health check path | `/api/health` |

4. Environment variables (Advanced section, or Environment tab):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the Neon connection string |
| `DATABASE_SSL` | `true` |
| `SESSION_SECRET` | output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL` | `bowenwayne44@gmail.com` |
| `ADMIN_PASSWORD` | a strong password you choose (store it in a password manager) |

5. Confirm no sensitive values are in Git (run the Task 3 commands again). The values above live only in the Render dashboard.

---

##  Deploy and verify

1. Click **Create Web Service**. Render builds from GitHub.
2. Open the **Logs** tab. Success looks like the install finishing, then `Admin account created for bowenwayne44@gmail.com`, then `CropDrop running on ...`. Note any warnings.
3. Open your `https://<name>.onrender.com` address. The first load may take about a minute.

### Test checklist (take a screenshot of each)

| Test | What to do | Expected |
|---|---|---|
| Home page | Open `/` | Hero, ticker area and sections render. |
| Registration | Register a buyer, then a farmer | Success messages; farmer shows as waiting for approval. |
| Login | Log in as each | Redirects to the right page; wrong password shows the same generic error. |
| Database **write** | As admin approve the farmer; as farmer add a product with an Unsplash link; as admin approve it; as buyer place an order | Each action succeeds and persists after a refresh. |
| Database **read** | Open Market, a product page, My orders | Data shown matches what you wrote. |
| Proof in the database | In Neon open **SQL Editor** and run `SELECT id, buyer_id, total, status FROM orders ORDER BY id DESC LIMIT 5;` | Your order appears. |
| Static assets | Browser DevTools, **Network** tab, reload | `style.css`, `core.js` and the font files all return 200. |
| Responsive | DevTools device toolbar at 390 px and 768 px | No sideways scrolling; menu button works. |

Do **not** run `npm run seed` against the live database. It creates demo accounts with known passwords. Create real test accounts through the site instead.

---

##  SSL/TLS

1. Open the site in a browser and click the padlock in the address bar, then **Connection is secure** then **Certificate**. Screenshot the issuer and validity dates.
2. Check the redirect and headers from WSL:
```bash
curl -sI http://YOUR-NAME.onrender.com | head -5     # should redirect (301/308) to https
curl -sI https://YOUR-NAME.onrender.com | head -15   # should show HTTP/2 200 and strict-transport-security
```
3. Cookies are only sent over HTTPS in production: DevTools, **Application**, **Cookies**, `cd.sid` shows **Secure** and **HttpOnly** ticked.

If the HTTP address does not redirect on your service, record that honestly and rely on the HSTS header that CropDrop sends.

---

## Monitoring

1. **Render Logs tab.** Watch for errors while you use the site. Filter for `error`. Screenshot a clean period.
2. **Render Events and Metrics tabs.** Note deploys, restarts, memory and CPU.
3. **Health endpoint.** `curl https://YOUR-NAME.onrender.com/api/health` returns `{"ok":true,"db":"up",...}`. This is the same path Render uses for its health check.
4. **Neon dashboard.** Monitoring shows compute hours and storage used against the free limits.
5. Optional: a free uptime monitor such as UptimeRobot pinging `/api/health` every 5 minutes. Note that this keeps the free service awake all month and uses most of the 750 hours.

---

## Task 8: Maintenance schedule
See `docs/maintenance-schedule.md`.
