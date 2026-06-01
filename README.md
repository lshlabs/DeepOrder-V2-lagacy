# DeepOrder v2

DeepOrder v2 is a proof-of-concept order operations system for AI-assisted mock delivery orders, webhook ingestion, and KDS display.

The project intentionally starts with a Mock Delivery API instead of real delivery platform integrations. This keeps the architecture testable while preserving the same shape needed for future platform adapters.

## Monorepo Structure

```text
deeporder-backend/    FastAPI service that receives external order webhooks
mock-delivery-api/    FastAPI service that generates and sends mock delivery orders
kds-web/              React + TypeScript KDS web client
kds-app/              React Native WebView wrapper for Android devices
docs/                 Architecture, API, and deployment notes
deploy/               Nginx, systemd, or Docker deployment examples
scripts/              Local developer helper scripts
```

## Planned Local Ports

```text
deeporder-backend: 8000
mock-delivery-api: 8001
kds-web: 5173
```

## Step Roadmap

1. Monorepo skeleton
2. DeepOrder Backend webhook ingestion
3. Mock Delivery API sample order sending
4. KDS Web order board
5. Mock Delivery Console
6. AI Request Analyzer
7. KDS AI badges and warnings
8. AI Order Generator
9. Random Order Simulation
10. React Native WebView App
11. Linux deployment documentation

## Current Step

Step 0 is complete when the repository has a clear folder layout, environment examples, service placeholders, and enough documentation for the next implementation step to begin without guessing the project shape.

