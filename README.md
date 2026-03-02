# Cardiometrix Monorepo

Cardiometrix is organized as a mobile-first digital health product:
- `apps/mobile` is the main patient experience.
- `apps/web` is the clinician/admin portal.
- scoring and backend services live under `services/`.

<!-- ## Repository Layout

```text
/apps
  /mobile        # React Native / Expo (MAIN patient product)
  /web           # Next.js clinician/admin portal + API routes
/services
  /api           # API service boundary (current API lives in apps/web/src/app/api)
  /risk-service  # Python FastAPI risk scoring
/packages
  /shared        # shared zod schemas/types/utils
``` -->

## Product Direction

- **Mobile-first (patient):** data capture, device integrations, reminders, nudges, daily workflow.
- **Web-first (clinician/admin):** triage dashboards, trend review, collaboration, reporting.

## Auth Mode (MVP)

<!-- Single auth mode: **JWT bearer tokens**.

- Login/register returns JWT.
- Mobile stores token in SecureStore/Keychain and sends `Authorization: Bearer <token>`.
- Web portal stores token client-side and sends `Authorization: Bearer <token>` for `/api/*`.
- API auth checks bearer token only (no cookie session dependency in MVP). -->

## Quick Start

### Option A: Docker compose (recommended)

<!-- ```bash
docker compose up --build
```

Endpoints:
- Web: `http://localhost:3000`
- Risk service: `http://localhost:8001`
- Mongo: `mongodb://localhost:27017` -->

### Option B: Run services manually

1. Install workspace deps:
```bash
pnpm install
```

2. Start web portal/API:
```bash
pnpm dev:web
```

3. Start mobile app:
```bash
pnpm dev:mobile
```

4. Start risk-service:
```bash
pnpm dev:risk
```

<!-- ## Environment Variables

Primary app env is expected in `apps/web/.env` (start from `apps/web/.env.example`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | - | Mongo connection string |
| `MONGODB_DB` | Yes | `cardiometrix` | Database name |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `TOKEN_TTL_DAYS` | No | `7` | Auth token TTL |
| `APP_URL` | No | `http://localhost:3000` | Public app URL |
| `APP_BASE_URL` | No | `http://localhost:3000` | Base URL used by schedulers |
| `RISK_SERVICE_URL` | Yes | `http://localhost:8001` | FastAPI risk service base URL |
| `CRON_SECRET` | Yes (prod) | - | Protects `/api/jobs/*` cron endpoints |
| `ADMIN_KEY` | No | - | Optional key for admin manual run endpoint |
| `EXPO_ACCESS_TOKEN` | No | - | Optional Expo access token for server push |
| `ENABLE_IN_PROCESS_CRON` | No | `false` | Set `true` only for persistent worker/server deployments |
| `TZ` | No | `UTC` | Server timezone |
| `COOKIE_DOMAIN` | No | unset | Cookie domain in production |
| `BP_TREND_DAYS` | No | `14` | Trend window |
| `VAR_DAYS` | No | `7` | Variability window |
| `BASELINE_DAYS` | No | `30` | Baseline window |
| `RECENT_DAYS` | No | `7` | Recent comparison window | -->

## Architecture

```text
apps/mobile (patient) ---> apps/web API routes (/api/*) ---> MongoDB
                                 |
                                 v
                         services/risk-service (/score)
```

## Daily Risk Orchestration

<!-- 1. Compute deterministic `FeaturesV1` from recent data.
2. Call `POST {RISK_SERVICE_URL}/score`.
3. Persist `RiskDaily` (+ compatibility mirror to legacy `RiskScore`).
4. Pick and persist `DailyNudge` (+ compatibility mirror to legacy `Nudge`).
5. Dispatch push notifications from server based on per-user `timezone + notifyTimeLocal`.
6. Mark `lastNotifiedDate` to avoid duplicate sends on the same local day.

Fallback:
- If data is insufficient or risk service is unavailable: store `band: "unknown"`, `risk: null`, and keep API response non-500. -->

## Key API Endpoints

- `POST /api/push/register`
- `PUT /api/settings/notifications`
- `GET /api/risk/today`
- `GET /api/risk/weekly`
- `GET /api/risk/forecast?horizons=30,60,90`
- `POST /api/risk/compute`
- `POST /api/nudges/compute`
- `GET /api/nudges/today`
- `POST /api/nudges/done`
- `POST /api/admin/run-daily?date=YYYY-MM-DD` (admin role or `ADMIN_KEY`)
- `POST /api/jobs/daily-score` (cron secret protected)
- `POST /api/jobs/dispatch-push` (cron secret protected)

## Cron Security

`/api/jobs/*` endpoints require one of:
- `Authorization: Bearer $CRON_SECRET`
- `x-cron-secret: $CRON_SECRET`

## Vercel Cron

`apps/web/vercel.json` includes:
- `POST /api/jobs/daily-score` at `5 3 * * *` (03:05 UTC)
- `POST /api/jobs/dispatch-push` every 5 minutes

## MVP Scope

Mobile UI is intentionally trimmed to a focused MVP:
- Home: today risk, explainability (drivers + what changed), today nudge, weekly report share.
- Add Data: manual vitals/labs entry and device import.
- Settings: notifications, clinician share, account actions.

Advanced backend endpoints remain available but hidden from mobile navigation as internal/experimental (for later phases).

## Tests

Web/API tests:
```bash
pnpm test
```

Risk-service tests:
```bash
cd services/risk-service
pytest -q
```

## Package Manager

Use `pnpm` at repo root for workspace consistency.
