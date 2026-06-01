# DeepOrder Backend

FastAPI service for receiving external order webhooks, storing normalized orders, and serving KDS APIs.

## Initial Scope

- `POST /api/external/orders/webhook`
- eventId idempotency
- order and order item persistence
- `GET /api/kds/orders`
- `PATCH /api/orders/{order_id}/status`

## Local Run

```bash
cd deeporder-backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

