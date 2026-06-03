# API Notes

This file will collect endpoint contracts as each step is implemented.

## DeepOrder Backend

- `GET /health`
- `POST /api/external/orders/webhook`
- `GET /api/kds/orders?storeId=STORE_001`
- `PATCH /api/orders/{order_id}/status`

### `POST /api/external/orders/webhook`

Receives external order events from a delivery platform adapter.

Supported event types:

- `ORDER_CREATED`
- `ORDER_CANCELLED`

Idempotency:

- `eventId` is stored in `webhook_events`.
- If the same `eventId` is received again, the API returns `DUPLICATE_EVENT` and does not create another order.

### `GET /api/kds/orders`

Returns normalized orders for a store.

Required query:

- `storeId`

### `PATCH /api/orders/{order_id}/status`

Updates an order status.

Supported statuses:

- `NEW`
- `COOKING`
- `DONE`
- `CANCELLED`

## Mock Delivery API

- `GET /health`
- `GET /console`
- `POST /api/mock/orders/sample`
- `POST /api/mock/orders/send`
- `GET /api/mock/webhook-logs`

### `GET /console`

Serves the browser-based Mock Delivery Console.

The console supports:

- sample order creation
- sending the generated order to DeepOrder Backend
- generated payload preview
- recent webhook send logs

### `POST /api/mock/orders/sample`

Creates and stores one sample `ORDER_CREATED` payload.

Request body:

```json
{
  "storeId": "STORE_001"
}
```

Response includes:

- `generatedOrderId`
- `payload`

### `POST /api/mock/orders/send`

Sends a generated or provided order payload to the DeepOrder Backend webhook URL.

Request body options:

- `generatedOrderId`: send a previously generated sample order.
- `payload`: send a caller-provided mock order payload.
- `webhookUrl`: override the default webhook target.

If no body is provided, the API sends the latest generated order. If no generated order exists, it creates a sample order first.

The default webhook target is:

```text
http://localhost:8000/api/external/orders/webhook
```

### `GET /api/mock/webhook-logs`

Returns recent webhook send logs.

Optional query:

- `limit`: 1 to 100, default 20
