# API Service Boundary

This directory defines the API service boundary in the monorepo layout.

Current implementation:
- API runtime is hosted by Next.js route handlers in `apps/web/src/app/api/*`.

Future extraction path:
- Move route handlers and orchestration modules into a standalone Node API service here,
  while keeping `apps/web` as clinician/admin UI only.
