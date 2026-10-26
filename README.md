# CropDrop

A marketplace that connects smallholder farmers directly with buyers (households, hotels, schools, exporters). Farmers list produce, buyers search and order, admins approve farmers and listings and move orders through their lifecycle.

**Stack:** Node.js 20+, Express 5, PostgreSQL (`pg`), plain HTML/CSS/JavaScript front end (no framework), PDFKit for receipts.

## Pages
Public: Home, About, Market (catalogue), Product detail, Farmers (list and profiles), Contact.
Accounts: Login and Register (farmer or buyer). Admin accounts are created by the server, never by sign-up.
Buyer: Cart, Checkout, My orders (status timeline), Receipt (print or PDF).
Farmer: Dashboard with listing create, edit and delete (with photo upload) and orders for their produce.
Admin: Approve farmers, approve or reject listings, move orders Placed, Confirmed, Dispatched, Delivered, read contact messages.

## Run it locally (WSL / Ubuntu)

1. Node 20 or newer (`node -v`). If it is older, install the current LTS with nvm (see nvm's GitHub page).
2. PostgreSQL:
   ```bash
   sudo apt update && sudo apt install -y postgresql postgresql-contrib
   sudo service postgresql start
   sudo -u postgres psql -c "CREATE USER cropdrop WITH PASSWORD 'cropdrop';"
   sudo -u postgres psql -c "CREATE DATABASE cropdrop OWNER cropdrop;"
   sudo -u postgres psql -c "CREATE DATABASE cropdrop_test OWNER cropdrop;"
   ```
3. The app:
   ```bash
   cp .env.example .env        # then edit SESSION_SECRET and ADMIN_PASSWORD
   npm install
   npm run seed                # optional demo farmers, produce and a demo buyer
   npm run dev                 # http://localhost:3000
   ```
Tables are created automatically on first start (`schema.sql`).

**Admin login:** `bowenwayne44@gmail.com`. If you leave `ADMIN_PASSWORD` empty in `.env`, a random password is generated and printed **once** in the terminal the first time the server starts, so copy it then. Or set `ADMIN_PASSWORD` in `.env` before the first start. (If the database already has the older default admin, its email is switched to this one and its password is kept.)

Demo logins after `npm run seed`: farmer `mary@cropdrop.local` / `Farmer@1234`, buyer `buyer@cropdrop.local` / `Buyer@1234`.

### Photos
Product photos can be an upload or an **Unsplash link**. Farmers can paste an `images.unsplash.com/photo-...` address in the listing form (other sites are rejected on purpose). To get one: open a photo on unsplash.com, right-click the image, choose Copy image address.

For the demo products, edit `seed-photos.json` (slug to Unsplash address) and run `npm run seed` again; products that have no photo yet get one without creating duplicates. Tomatoes, mangoes and bananas are already filled in. Photos from Unsplash are used under the Unsplash License.

## Environment variables
| Name | Purpose |
|---|---|
| `PORT` | Port to listen on (hosts set this for you). Default 3000. |
| `NODE_ENV` | `production` turns on secure cookies and requires `SESSION_SECRET`. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `DATABASE_SSL` | `true` when the database host requires SSL (most hosted Postgres does). |
| `SESSION_SECRET` | Long random string used to sign session cookies. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The first admin account, created if no admin exists. Leave the password empty to generate one. |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Commands
| Command | What it does |
|---|---|
| `npm start` | Run the server (production). |
| `npm run dev` | Run with auto-restart on file changes. |
| `npm run seed` | Add demo data. Safe to run twice. |
| `npm test` | End-to-end API tests. Needs `DATABASE_URL` pointing at a database ending in `_test`; it wipes that database's tables. |

Example: `DATABASE_URL=postgres://cropdrop:cropdrop@localhost:5432/cropdrop_test npm test`

## Data model
`users`, `categories`, `produce`, `orders`, `order_items`, plus `messages` (contact form) and `session` (created by the session store).

## API (JSON)
| Method and path | Who | Notes |
|---|---|---|
| `GET /api/health` | anyone | Database ping, used for monitoring. |
| `GET /api/produce` | anyone | `q`, `category`, `location`, `sort`, `limit`, `offset`. |
| `GET /api/produce/:id`, `/batch?ids=` | anyone | Approved, in-stock produce only. |
| `POST/PUT/DELETE /api/produce` | farmer | Multipart upload; edits go back to approval. |
| `GET /api/farmers`, `/api/farmers/:id` | anyone | Approved farmers and their produce. |
| `POST /api/auth/register`, `/login`, `/logout` | anyone | Rate limited. |
| `POST /api/orders` | buyer | Prices and stock are checked in the database, in one transaction. |
| `GET /api/orders/mine`, `/:id`, `/:id/receipt.pdf` | buyer, admin | A buyer sees only their own orders. |
| `GET /api/admin/overview`, `POST /api/admin/...` | admin | Approvals and order status changes. |

## Security
Parameterised SQL everywhere (no string-built queries), bcrypt password hashing, strong-password rule, session fixation protection, login rate limiting, CSRF token on every state-changing request, role checks on every protected route, server-side validation that matches the client-side validation, upload type and file-signature checks, Helmet headers with a strict Content Security Policy, output escaping in the front end, secrets only in environment variables.

## Testing
Two test suites run against a throwaway `*_test` database (they refuse to run against anything else):

| Command | What it does |
|---|---|
| `npm test` | 46 end-to-end API checks (regression suite) |
| `npm run test:report` | 57 documented test cases with expected and actual results, written to `docs/testing/results/` |

See `docs/testing/README.md` for the full testing documentation.

## Deploying
CropDrop is set up for **Render** (web service) with **Neon** (PostgreSQL). The full guide, including the platform comparison, settings and the verification checklist, is in [`docs/deployment.md`](docs/deployment.md). The maintenance plan is in [`docs/maintenance-schedule.md`](docs/maintenance-schedule.md).

In short: build command `npm install`, start command `npm start`, health check `/api/health`, and set `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL=true`, `SESSION_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the host's dashboard. Uploaded photos are stored on the web service's temporary disk, so use Unsplash photo links for product images on a free host.
