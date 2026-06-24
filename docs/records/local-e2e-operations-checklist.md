작업 기록: `mock-delivery-console -> mock-delivery-api -> deeporder-backend -> kds-web` 전체 운영 흐름을 고정하고 반복 검증하기 위해 만든 E2E 체크리스트 문서.

# DeepOrder E2E Operations Checklist

This document fixes the canonical local operating flow for the current stack:

`mock-delivery-console -> mock-delivery-api -> deeporder-backend -> kds-web`

Use this as the repeatable validation checklist after local setup changes, migration work, API changes, UI changes, or release preparation.

## Fixed Local Topology

- `mock-delivery-console`: `http://127.0.0.1:5174`
- `mock-delivery-api`: `http://127.0.0.1:8001`
- `deeporder-backend`: `http://127.0.0.1:8000`
- `kds-web`: `http://127.0.0.1:5173`

## Fixed E2E Baseline

- KDS는 더 이상 `STORE_FLAT` 또는 `VITE_STORE_ID`에 고정되지 않는다.
- KDS 주문 조회 / 상태 변경은 로그인한 사용자와 연결된 `store_id` 기준으로 동작한다.
- Console API base url: `mock-delivery-console/.env`
- DeepOrder webhook endpoint: `http://127.0.0.1:8000/api/external/orders/webhook`

## Preflight

- [ ] `deeporder-backend` is running on `127.0.0.1:8000`
- [ ] `mock-delivery-api` is running on `127.0.0.1:8001`
- [ ] `mock-delivery-console` is running on `127.0.0.1:5174`
- [ ] `kds-web` is running on `127.0.0.1:5173`
- [ ] 테스트용 KDS 계정이 회원가입 + 관리자 승인 완료 상태다
- [ ] `mock-delivery-console/.env` contains:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api/mock
VITE_DEEPORDER_API_URL=http://127.0.0.1:8000
VITE_ADMIN_TOKEN=deeporder-admin-token
```

- [ ] `kds-web` uses:

```env
VITE_DEEPORDER_API_URL=http://127.0.0.1:8000
```

## Startup

Run the services with [start_deeporder.md](/Users/mac/Documents/DeepOrder_V2/scripts/start_deeporder.md).

## Automated Smoke

Run the API-level smoke test for:

- order generation
- webhook forwarding
- backend receipt
- `NEW -> COOKING -> DONE` status transitions

```bash
npm run smoke:kds-e2e
```

## Scenario A: Baseline Wiring

- [ ] Open `http://127.0.0.1:5174`
- [ ] Confirm the console runtime badge shows `FastAPI`
- [ ] Open `http://127.0.0.1:5173`
- [ ] Confirm the auth page loads without API errors
- [ ] Log in with an approved store owner account
- [ ] Confirm KDS header shows the logged-in store name / store id

## Scenario B: Catalog Preconditions

- [ ] In `메뉴 관리`, confirm the target approved store exists
- [ ] Confirm the target store has at least one `MAIN` or `SET` menu
- [ ] Confirm that menu is `isAvailable=true`
- [ ] If catalog data is missing, import [catalog-export-2026-06-05.json](/Users/mac/Documents/DeepOrder_V2/catalog-export-2026-06-05.json) or rebuild the target store/menu data before continuing

## Scenario C: Console Send Target

- [ ] Open `http://127.0.0.1:5174/api-management`
- [ ] Confirm an active API config exists
- [ ] Confirm the active endpoint is `http://127.0.0.1:8000/api/external/orders/webhook`
- [ ] If missing, create:

```text
name: DeepOrder Local Webhook
provider: DeepOrder
endpoint: http://127.0.0.1:8000/api/external/orders/webhook
model: webhook
temperature: 0
active: true
```

## Scenario D: Order Generation

- [ ] Open `http://127.0.0.1:5174/orders`
- [ ] Select the same store connected to the approved KDS account
- [ ] Click `주문 생성`
- [ ] Confirm JSON viewer shows a generated order
- [ ] Confirm the generated payload contains the selected `storeId`
- [ ] Confirm `items.length >= 1`

## Scenario E: Webhook Forwarding

- [ ] Click `주문 보내기`
- [ ] Confirm a new row appears in `전송 목록`
- [ ] Confirm the row status is `성공`
- [ ] Confirm HTTP status is `2xx`
- [ ] Confirm the response message is not a validation error

## Scenario F: Backend Receipt

- [ ] Query:

```bash
curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<approved-email>","password":"<password>"}'

curl -s http://127.0.0.1:8000/api/kds/orders \
  -H 'Authorization: Bearer <accessToken>'
```

- [ ] Confirm the latest order exists in `orders`
- [ ] Confirm the latest order `status` is `NEW`
- [ ] Confirm the latest order item names match the generated console order
- [ ] Confirm the latest order has `platform=MOCK_DELIVERY`

## Scenario G: KDS Rendering

- [ ] Refresh `http://127.0.0.1:5173`
- [ ] Confirm the new order card appears in the `신규` column
- [ ] Confirm the order number and item names are visible
- [ ] Confirm the elapsed timer is ticking
- [ ] Confirm AI analysis panel does not break the card layout even if analysis is pending

## Scenario H: Status Progression

- [ ] In KDS, click `조리 시작`
- [ ] Confirm the order moves from `신규` to `조리중`
- [ ] Click `완료`
- [ ] Confirm the order moves from `조리중` to `완료`
- [ ] Re-query backend and confirm the order `status` is `DONE`

## Scenario I: Persistence and Refresh

- [ ] Refresh the KDS page
- [ ] Confirm the order remains in the correct status column
- [ ] Refresh the console `주문 생성` page
- [ ] Confirm the `전송 목록` still contains the recorded send result

## Scenario J: Failure Checks

- [ ] If `주문 보내기` returns `422`, verify the active endpoint is correct and the console is sending webhook-shaped payloads through `mock-delivery-api`
- [ ] If KDS is empty, verify the approved KDS account is bound to the same store used in console order generation
- [ ] If console runtime shows `Mock`, verify `mock-delivery-console/.env` exists and restart Vite
- [ ] If CORS fails, verify backend CORS includes both `5173` and `5174`

## Reset / Repeat

- [ ] If needed, clear console order records:

```bash
curl -X DELETE http://127.0.0.1:8001/api/mock/order-records
```

- [ ] If needed, restart all four services
- [ ] Repeat `Scenario D` through `Scenario I`

## Validation Notes

- `mock-delivery-console` order generation produces a console-specific order object.
- `mock-delivery-api` now converts that order into the DeepOrder webhook payload shape when the active endpoint is `/api/external/orders/webhook`.
- `kds-web` no longer uses `VITE_STORE_ID`; the backend resolves store context from the authenticated user.

## Current Known Good Result

Validated locally on `2026-06-16`:

- active webhook config creation: passed
- approved account auth flow: passed
- order generation for authenticated target store: passed
- console raw order to DeepOrder webhook translation path: implemented
- auth-based KDS store alignment: passed
