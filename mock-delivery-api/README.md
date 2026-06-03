# Mock Delivery API

FastAPI service that behaves like a virtual delivery platform for DeepOrder demos.

## Initial Scope

- sample order payload generation
- webhook sending to DeepOrder Backend
- webhook send logs
- future AI order generation and random simulation

## Local Run

```bash
cd mock-delivery-api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
```

## Basic Flow

1. Create a sample order.

```bash
curl -X POST http://localhost:8001/api/mock/orders/sample \
  -H "Content-Type: application/json" \
  -d '{"storeId":"STORE_001"}'
```

2. Send the generated order to DeepOrder Backend.

```bash
curl -X POST http://localhost:8001/api/mock/orders/send \
  -H "Content-Type: application/json" \
  -d '{"generatedOrderId":1}'
```

3. Check webhook send logs.

```bash
curl http://localhost:8001/api/mock/webhook-logs
```

## Console

```text
http://localhost:8001/console
```

The console can create a sample order, send it to the DeepOrder Backend webhook, preview the generated payload, and refresh recent webhook logs.
