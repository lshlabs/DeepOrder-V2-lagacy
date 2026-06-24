# DeepOrder v2

DeepOrder v2 is a proof-of-concept order operations system for AI-assisted mock delivery orders, webhook ingestion, and KDS display.

The project intentionally starts with a Mock Delivery API instead of real delivery platform integrations. This keeps the architecture testable while preserving the same shape needed for future platform adapters.

## Direction Summary

DeepOrder's current short-term goal is to finish a working backend-centered order intake PoC:

```text
mock-delivery-console
-> mock-delivery-api
-> deeporder-backend webhook
-> platform adapter
-> normalized order
-> DB
-> kds-web
```

This is the active implementation path because it is already working locally, demonstrates backend design clearly, and is the fastest route to a complete portfolio-grade system.

The long-term expansion direction is different:

```text
delivery program
-> receipt / printer / COM port output
-> receipt agent
-> receipt parser
-> NormalizedOrderEvent
-> deeporder-backend
-> KDS Web/App
```

In other words:

- short-term: keep the API/Webhook-based mock platform flow and finish the end-to-end system
- long-term: expand toward receipt / COM-port based ingestion for real store environments

See [deeporder-direction-decision.md](/Users/mac/Documents/DeepOrder_V2/docs/deeporder-direction-decision.md) for the reasoning behind this decision.

## Current Direction

The current implementation direction is:

- Frontend: `Vite + React`
- Backend: `FastAPI (Python)`

The current active local flow is:

- `mock-delivery-console` for catalog management and order generation
- `mock-delivery-api` for mock platform APIs and webhook forwarding
- `deeporder-backend` for webhook ingestion and KDS APIs
- `kds-web` for KDS board rendering and order status changes

The current priority is:

- make the entire API/Webhook-based flow stable and demoable
- improve smoke tests, docs, and UX around the current end-to-end path
- treat real platform relay / receipt parsing as a later expansion track

## Repository Structure

Document index: [docs/README.md](/Users/mac/Documents/DeepOrder_V2/docs/README.md)

```text
deeporder-backend/    FastAPI backend for external order webhooks, order storage, KDS APIs, and AI analysis
mock-delivery-api/    FastAPI backend for mock order generation, sending, logs, and catalog APIs
mock-delivery-console/ Vite + React admin console for mock delivery catalog and API management
kds-web/              Active Vite + React KDS client for local end-to-end validation
kds-app/              React Native wrapper placeholder, not implemented as an active product
docs/                 Architecture, API, and deployment notes
deploy/               Deployment examples
scripts/              Local developer helper scripts
```

## Active Frontend Workspaces

The active frontend workspaces currently in this monorepo are:

- `mock-delivery-console/`
  Vite + React SPA for store/menu/option management, API configuration, and AI order generation flows
- `kds-web/`
  Active Vite + React KDS client for local end-to-end validation

The old standalone Next.js console at `/Users/mac/Desktop/menu-management-console` should now be treated as the fallback comparison baseline during migration sign-off, not as the active target frontend.

## Planned Local Ports

```text
deeporder-backend: 8000
mock-delivery-api: 8001
mock-delivery-console: 5174
kds-web: 5173
```

## Step Roadmap

1. Monorepo skeleton
2. DeepOrder Backend webhook ingestion
3. Mock Delivery API sample order sending
4. Mock Delivery Console backend and frontend split
5. KDS backend/API flow
6. KDS frontend with `Vite + React`
7. AI Request Analyzer
8. KDS AI action display
9. AI Order Generator
10. Random Order Simulation
11. Deployment documentation

## Status Summary

- `deeporder-backend/`: implemented
- `mock-delivery-api/`: backend implemented
- `mock-delivery-console/`: migrated into this monorepo and validated as the active frontend target
- standalone `menu-management-console`: retained as fallback comparison baseline
- `kds-web/`: active local KDS frontend
- `kds-app/`: placeholder only

## E2E Flow

Use [local-e2e-operations-checklist.md](/Users/mac/Documents/DeepOrder_V2/docs/records/local-e2e-operations-checklist.md) as the canonical local validation scenario for:

- `mock-delivery-console -> mock-delivery-api -> deeporder-backend -> kds-web`
- order generation
- webhook forwarding
- KDS rendering
- status transition verification

## Scope Boundary

DeepOrder is not currently trying to prove a production-ready integration with Baemin, Coupang Eats, or Yogiyo.

What it is trying to prove now is:

- external order event intake
- platform adapter / normalization boundary
- idempotent persistence
- AI-assisted request analysis
- KDS rendering and status workflow

What is intentionally deferred:

- real platform signature integration
- full receipt / COM-port parsing implementation
- multi-tenant SaaS operations
- complete mobile KDS app productization
