This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## How Daily Risk Scoring Works

Cardiometrix computes daily risk through a Node orchestrator that calls the Python `risk-service`.

1. At scoring time, the backend aggregates the user's last 30 days of vitals/labs into a deterministic `FeaturesV1` vector.
2. The backend calls `POST {RISK_SERVICE_URL}/score`.
3. Response is stored in `RiskDaily` (and mirrored into legacy `RiskScore` for compatibility).
4. A daily nudge is selected from a catalog using top drivers + risk band and stored in `DailyNudge` (and mirrored into legacy `Nudge`).
5. A daily scheduler runs this flow for all patient users at `DAILY_RISK_CRON` (default `0 3 * * *`).

If data is insufficient or risk-service is unavailable, the system stores a fallback risk record with:
- `band: "unknown"`
- `risk: null`
- `error: "insufficient_data"` or `error: "risk_service_unavailable"`

API endpoints:
- `GET /api/risk/today`
- `GET /api/risk/weekly`
- `GET /api/risk/forecast?horizons=30,60,90`
- `POST /api/nudges/compute`
- `GET /api/nudges/today`
- `POST /api/admin/run-daily-risk` (admin only, optional `{ "date": "YYYY-MM-DD" }`)
