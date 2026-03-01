# Cardiometrix MVP Scope (Mobile First)

## Included (MVP)
- Device import status + manual vitals/labs entry.
- Daily risk display from `GET /api/risk/today`.
- Explainability display from risk payload:
  - top drivers
  - what changed vs baseline (when available)
- One daily nudge from `GET /api/nudges/today` with done action via `POST /api/nudges/done`.
- Weekly report summary/share flow.
- Notification preference settings (time, timezone, enabled).

## Excluded From Mobile Navigation (for now)
- Cohort compare UI
- Anomaly detection UI
- Medication insights analytics UI
- Forecast extras pages beyond MVP summary
- Deep timeline-centric views

## Internal / Experimental Endpoints (kept server-side)
- `/api/cohort/compare`
- `/api/anomalies`
- `/api/medications/insights`
- `/api/risk/forecast`
- `/api/timeline`
- `/api/quality`
- `/api/trends`

## Why This Scope
This scope keeps the product clinically believable and shippable: one daily risk signal, one actionable nudge, and a weekly report loop. It reduces QA surface area, minimizes fragile dependencies, and keeps engineering focused on reliability before adding advanced analytics UI.
