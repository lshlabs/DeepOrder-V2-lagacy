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

## Sample Webhook

```json
{
  "eventId": "evt_001",
  "eventType": "ORDER_CREATED",
  "platform": "MOCK_DELIVERY",
  "storeId": "STORE_001",
  "order": {
    "orderId": "mock_order_001",
    "orderNumber": "A-001",
    "customerRequest": "양상추는 빼주세요.",
    "deliveryRequest": "문 앞에 놓아주세요.",
    "items": [
      {
        "name": "제육덮밥",
        "quantity": 1,
        "options": ["덜 맵게"],
        "unitPrice": 9000,
        "totalPrice": 9000
      }
    ]
  }
}
```

