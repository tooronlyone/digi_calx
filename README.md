# Digi_CalX

A working calibration-services marketplace connecting factories with calibration
labs — instrument registry, technical eligibility matching, quoting, booking,
a full job state machine (as-found → adjustment authorization → as-left →
certificate), ratings and disputes. Black & white / monochrome interface in
the D-HAG visual style.

Stack: **Python (FastAPI) + SQLite** backend, **React (Vite)** frontend.

---

## 1. Run the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000` (docs at `http://localhost:8000/docs`).
A fresh `digi_calx.db` SQLite file is created automatically on first run in
the `backend/` folder. Uploaded certificate files are stored in `backend/uploads/`.

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. It talks to the backend at `http://localhost:8000`
by default — override with a `.env` file containing `VITE_API_BASE=http://your-api-host:8000`.

## 3. Try it out

### As factory / lab

1. Register a **factory** account (e.g. "Lahore Steel Works").
2. Register a second, separate **lab** account in another browser/incognito
   window (e.g. "Precision Calibration Lab").
3. As the lab: **Capability Catalog → Add capability** (set category/measurand
   to match the instrument you'll add, e.g. category `pressure_gauge`,
   measurand `pressure`, range 0–100 bar).
4. As the factory: **Instrument Assets → Add instrument** (same category/
   measurand, range within the lab's range, e.g. 0–60 bar) → **Request
   calibration**.
5. Back as the lab: **Request Inbox** → open the request → submit a quote
   (try adding a transport cost too).
6. As the factory: open the request → pick "Factory arranges" or "Digi_CalX
   arranges" transport → **Accept** the quote. This creates a job awaiting
   payment.
7. On the Job page, **pay the total** (dummy gateway — instant). The job is
   now booked.
8. As the lab: walk the job through its lifecycle from the Job Detail page —
   received → calibration in progress → as-found result. If you mark it
   out of tolerance, propose an adjustment/repair charge.
9. As the factory: authorize the adjustment and pay the extra charge (dummy
   gateway again), or decline and get an as-found-only certificate.
10. As the lab: record the as-left result → issue certificate → close the
    job. Check **Wallet** — the payout (minus platform commission) should
    now show up.
11. As the factory: rate the completed job, or open a dispute at any point
    before closure.

### As admin

Go to `http://localhost:5173/admin/login` and sign in with the default
admin account, which is created automatically the first time the backend
starts:

```
Email:    admin@digicalx.pk
Password: DigiCalX@Admin123
```

**Change this password before deploying anywhere real** — see below. From
the admin console you can:

- **Dashboard** — platform-wide counts (factories, labs, jobs, disputes) and
  gross revenue / commission earned.
- **Organizations** — every factory and lab, with lab ratings, and a
  Verify/Unverify toggle.
- **Jobs** — every job on the platform, read-only, with full financial and
  technical detail plus its status history.
- **Disputes** — resolve any open dispute (dismissed / partially upheld /
  upheld) with notes; resolving puts the job `ON_HOLD` for manual follow-up.
- **Finance** — every payment collected and every wallet ledger entry
  (payouts and commission deductions) across all labs.
- **Settings** — change the global platform commission rate; it applies to
  jobs booked from that point forward (jobs already booked keep the rate
  they were created with).

To change the admin email/password, set environment variables before
starting the backend for the first time (they only take effect on the very
first run, when the admin account is created):

```bash
# macOS/Linux
export DIGICALX_ADMIN_EMAIL="you@yourcompany.com"
export DIGICALX_ADMIN_PASSWORD="a-strong-password"
uvicorn app.main:app --reload --port 8000

# Windows CMD
set DIGICALX_ADMIN_EMAIL=you@yourcompany.com
set DIGICALX_ADMIN_PASSWORD=a-strong-password
uvicorn app.main:app --reload --port 8000
```

If the backend has already run once (and `digi_calx.db` already exists),
either delete `digi_calx.db` and restart, or log in with the existing admin
account and change credentials via the database directly — there's no
in-app "change admin password" screen in this MVP.

## Project structure

```
backend/
  app/
    main.py        FastAPI app & all routes
    models.py       SQLAlchemy models (SQLite)
    schemas.py       Pydantic request/response schemas
    auth.py           JWT auth, password hashing
    database.py        SQLite engine/session
  requirements.txt
  uploads/                Certificate files land here

frontend/
  src/
    api.js               Backend API client
    AuthContext.jsx        Session/auth state
    App.jsx                  Routing
    components/                Layout (sidebar), Stepper (job timeline)
    pages/                       Auth, Dashboard, Assets, Requests,
                                    Capabilities, Inbox, Jobs, JobDetail, etc.
```

## What's implemented (MVP scope)

- Two account types: **factory** and **lab**, each backed by an organization.
- Factory: instrument asset registry, calibration request wizard.
- Lab: capability catalog (measurand / category / range / accreditation /
  service mode / turnaround / price).
- **Matching engine**: hard-filters requests against published capabilities
  and returns a plain-language explanation for every eligible lab — nothing
  is inferred or invented.
- **Quoting with transport cost**: labs quote a calibration price and,
  separately, a transport cost for Digi_CalX to arrange pickup/delivery.
  The factory chooses per-quote whether to arrange transport itself or have
  Digi_CalX handle it (which adds the transport cost to the total).
- **Lab ratings shown in the marketplace**: average rating and rating count
  appear next to every lab in the match list, quote list, and lab directory.
- **Dummy payment gateway**: accepting a quote puts the job in
  `AWAITING_PAYMENT` with the total (calibration + transport, if applicable)
  shown up front. No job can progress until the factory "pays" — this is a
  placeholder endpoint that marks the payment paid instantly; swap in a real
  gateway (JazzCash/Easypaisa/Stripe/etc.) later without changing the rest
  of the flow.
- **Job state machine**: booking → payment → handover → received →
  calibration in progress → as-found result → (branch) customer decision on
  out-of-tolerance instruments, including the lab's proposed extra
  adjustment/repair charge → a second dummy payment for that charge →
  adjustment → as-left → certificate → return → closed, with an
  append-only history log.
- **Wallet & commission settlement**: when a job is closed, Digi_CalX
  automatically settles it — the full amount collected is credited to the
  lab's wallet, and a platform commission (rate set by the admin, default
  10%) is deducted as a separate ledger entry. Labs can see their balance
  and full transaction history under **Wallet**.
- Certificate issuance with optional file upload and versioning.
- Post-job ratings and a dispute flow.
- **Admin console** (`/admin/login`): a platform-admin role (not tied to any
  factory or lab) with full oversight — organization directory with lab
  verification, a read-only view of every job with full financial/technical
  detail, dispute resolution, a platform-wide payments and wallet ledger,
  and control over the global commission rate. A default admin account is
  auto-created on first backend startup (see below for credentials and how
  to change them).

## What's intentionally out of scope for this MVP

A **real** payment gateway (the current one is a dummy/mock — no real money
moves), CNIC/NTN verification workflows, SMS/email notifications, PDF
certificate generation/templating, multi-user roles per organization, and
admin/ops dashboards were not built — the schema and routes are structured
so any of these can be added without reworking the core data model. The
payment endpoints (`/jobs/{id}/pay` and `/jobs/{id}/pay-adjustment`) are the
two places to wire in a real gateway later.
