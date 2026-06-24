# Mock Delivery API

FastAPI service that behaves like a virtual delivery platform for DeepOrder demos.

## Initial Scope

- Store/Menu/OptionGroup/Option catalog APIs
- AI order generation with API fallback
- webhook sending to DeepOrder Backend
- recent order send record management

## Local Run

```bash
cd mock-delivery-api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
```

## Basic Flow

### Catalog setup

```bash
curl -X POST http://localhost:8001/api/mock/stores \
  -H "Content-Type: application/json" \
  -d '{"storeName":"테스트 치킨집"}'
```

```bash
curl -X POST http://localhost:8001/api/mock/stores/STORE_001/menus \
  -H "Content-Type: application/json" \
  -d '{"name":"양념치킨","type":"MAIN","basePrice":23000}'
```

`MAIN` and `SET` menus can have option groups. `SIDE` and `DRINK` menus cannot.

### Order generation and send flow

1. Create a store and at least one `MAIN` or `SET` menu.

```bash
curl -X POST http://localhost:8001/api/mock/stores \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트 매장"}'
```

2. Generate an order through the console API.

```bash
curl -X POST http://localhost:8001/api/mock/stores/STORE_001/orders/generate \
  -H "Content-Type: application/json" \
  -d '{}'
```

3. Send the generated order to DeepOrder Backend.

```bash
curl -X POST http://localhost:8001/api/mock/orders/send \
  -H "Content-Type: application/json" \
  -d '{
    "orderId":"ORDER_001",
    "orderNumber":"A1B2C3",
    "storeId":"STORE_001",
    "storeName":"테스트 매장",
    "createdAt":"2026-06-13T00:00:00Z",
    "generatedBy":"fallback-generator",
    "items":[
      {
        "menuId":"MENU_001",
        "menuName":"양념치킨",
        "type":"MAIN",
        "basePrice":23000,
        "quantity":1,
        "selectedOptions":[],
        "itemTotal":23000
      }
    ],
    "totalPrice":23000
  }'
```

`orderId`는 외부 주문 식별자이고, `orderNumber`는 매장에서 보는 6자리 대문자+숫자 코드입니다. 두 값을 같은 필드로 재사용하지 않습니다.

## Console UI

```text
http://127.0.0.1:5174
```

The active management console now lives in this monorepo as a Vite frontend workspace:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm run dev:console
```

The console is pinned to port `5174` to avoid colliding with `kds-web` on `5173`.

FastAPI is an API-only server. The Vite console manages Store/Menu/OptionGroup/Option catalog data, creates delivery-platform-like orders, sends them to the DeepOrder Backend webhook, previews generated payloads, and refreshes recent send records through `/api/mock/*` endpoints.

## CORS Notes

Local CORS is configured to allow the current frontend dev origins:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3001`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:5174`
- `http://127.0.0.1:5174`
