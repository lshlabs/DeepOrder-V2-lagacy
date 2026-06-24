# Architecture

## Current Active Flow

```text
[Mock Delivery Console]
        |
        v
[Mock Delivery API]
        |
        | POST /api/external/orders/webhook
        v
[DeepOrder Backend]
        |
        | GET /api/kds/orders
        v
[KDS Web]
        |
        v
[KDS App WebView]
```

This is the currently implemented and validated local E2E path.

## Current Goal

The current goal is not to prove a final real-platform integration method.

The current goal is to complete and stabilize this backend-centered flow:

```text
external-style order event
-> webhook receiver
-> platform adapter
-> normalized order
-> internal persistence
-> KDS API
-> KDS rendering
```

## Long-Term Expansion Direction

The long-term direction is to support real store environments where official server API / webhook integration may not be available.

The planned expansion path is:

```text
[Delivery Program]
        |
        v
[Receipt / Printer / COM Port Output]
        |
        v
[Receipt Agent]
        |
        v
[Receipt Parser]
        |
        v
[NormalizedOrderEvent]
        |
        v
[DeepOrder Backend]
        |
        v
[KDS Web / KDS App]
```

This means:

- current implementation track: API/Webhook-first mock platform architecture
- long-term real-world track: receipt / COM-port parsing architecture

## Core Decisions

- Real delivery platform APIs are out of the initial v2 scope.
- Mock Delivery API is used first to validate webhook, idempotency, adapter, and KDS workflows.
- DeepOrder Backend owns the normalized internal order model.
- Platform-specific payload differences should stay behind adapter boundaries.
- AI features must have fallback behavior so order intake is not blocked.
- Receipt / COM-port parsing is a future ingestion layer, not the current main implementation target.

## Why This Direction

- The API/Webhook-based mock flow is already implemented and demoable.
- It shows backend skills clearly: webhook intake, adapter pattern, normalization, idempotency, persistence, and KDS APIs.
- Receipt / COM-port parsing is realistic for long-term store environments, but it requires a local agent, platform-specific parsing, and much broader operational scope.

See [deeporder-direction-decision.md](/Users/mac/Documents/DeepOrder_V2/docs/deeporder-direction-decision.md) for the full decision record.
