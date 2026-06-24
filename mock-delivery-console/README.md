# Mock Delivery Console

Vite-based React workspace for the Mock Delivery management console migration.

현재 콘솔은 다음 역할을 함께 담당합니다.

- 메뉴 / 옵션 / 매장 관리
- 주문 생성 / webhook 전송
- API 설정 관리
- KDS 계정 가입 승인 / 거절용 `회원 관리` 탭

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

## Local Run

1. Start the backend:

```bash
cd /Users/mac/Documents/DeepOrder_V2/mock-delivery-api
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

2. Start the frontend from the monorepo root:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm run dev:console
```

3. Open:

```text
http://127.0.0.1:5174
```

The console is pinned to port `5174` to avoid colliding with `kds-web` on `5173`.

## Local Env

Use `.env.example` as the baseline for local development:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8001/api/mock
VITE_DEEPORDER_API_URL=http://127.0.0.1:8000
VITE_ADMIN_TOKEN=your_admin_token_here
```

`VITE_ADMIN_TOKEN`은 `mock-delivery-console -> deeporder-backend /api/admin/*` 승인 API 호출에 사용됩니다.

## Member Approval

- route: `http://127.0.0.1:5174/user-approval`
- sidebar label: `회원 관리`
- backend target: `http://127.0.0.1:8000/api/admin/*`
- required header: `X-Admin-Token: <VITE_ADMIN_TOKEN>`

## Status

This workspace has been migrated from the standalone Next.js console into the `DeepOrder_V2` monorepo as a Vite-based React SPA.
