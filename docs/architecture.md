# Architecture

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

## Core Decisions

- Real delivery platform APIs are out of the initial v2 scope.
- Mock Delivery API validates webhook, idempotency, adapter, and KDS workflows first.
- DeepOrder Backend owns the normalized internal order model.
- Platform-specific payload differences should stay behind adapter boundaries.
- AI features must have fallback behavior so order intake is not blocked.

