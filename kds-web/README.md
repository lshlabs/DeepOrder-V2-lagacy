# KDS Web

React + TypeScript web client for kitchen display workflows.

## Initial Scope

- Vite app shell
- 로그인 / 가입 신청 / 승인 대기 / KDS 화면 분리
- polling `GET /api/kds/orders`
- `Authorization: Bearer <accessToken>` 기반 인증
- `refreshToken` 기반 자동 세션 복구
- `자동 로그인` 체크 시 localStorage 기반 세션 유지
- `자동 로그인` 미체크 시 sessionStorage 기반 세션 유지
- NEW, COOKING, DONE order columns
- status transition actions
- AI cooking request action cards with original customer request for verification
- allergy/exclude/cooking request color treatment and human-check start flow

## Local Run

```bash
cd kds-web
npm install
npm run dev
```

The dev server listens on `0.0.0.0:5173`, allowing a router, tunnel, or IDE
port forwarder to expose it externally. The app is still available locally at
`http://localhost:5173`.

When accessing it from another device, set `VITE_DEEPORDER_API_URL` to an API
address that is reachable from that device; `127.0.0.1` refers to the device
running the browser.

## Public access with ngrok

1. Create an ngrok account and copy its auth token from the ngrok dashboard.
2. Configure the token once on the development machine:

   ```bash
   npx ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
   ```

3. Run the Vite server in one terminal and the tunnel in another:

   ```bash
   npm run dev
   # In another terminal, from kds-web
   npm run tunnel
   ```

4. Open the reserved forwarding URL below from an external device:

   ```text
   https://twice-karma-given.ngrok-free.dev
   ```

The tunnel command exposes local port `5173`. The ngrok auth token and
forwarding URL are intentionally not stored in this repository. Use the
single-domain setup below for local development, or point
`VITE_DEEPORDER_API_URL` to a separately reachable backend (such as its own
HTTPS ngrok tunnel) and restart `npm run dev`.

### KDS and backend through one ngrok domain

For local development, the KDS Vite server proxies its `/api` requests to the
local backend at `127.0.0.1:8000`. This lets one ngrok domain serve both KDS
and API traffic without exposing a second backend tunnel.

Run these three commands in separate terminals:

```bash
# Terminal 1
cd deeporder-backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2
cd kds-web
npm run dev:ngrok

# Terminal 3
cd kds-web
npm run tunnel
```

The tunnel must target port `5173`, not `8000`. Open
`https://twice-karma-given.ngrok-free.dev`; browser requests to `/api` are
proxied by Vite to the local backend.

## Environment

```bash
VITE_DEEPORDER_API_URL=http://127.0.0.1:8000
```

`kds-web`은 더 이상 `VITE_STORE_ID`를 사용하지 않습니다.
주문 조회 / 상태 변경 매장 컨텍스트는 로그인한 계정의 `store_id`를 backend가 결정합니다.

주소 검색 팝업을 쓰려면 backend에 `JUSO_CONFIRM_KEY`, `JUSO_RETURN_URL`이 설정되어 있어야 합니다.

## Auth Flow

```text
로그인 화면
→ /api/auth/login
→ autoLogin 여부에 따라 accessToken + refreshToken 저장
→ /api/auth/me
→ APPROVED: KDS 진입
→ PENDING_APPROVAL / REJECTED: 승인 대기 화면
```

KDS 주문 조회와 상태 변경은 이제 사용자가 `storeId`를 직접 넘기지 않습니다.
백엔드가 access token 기준으로 현재 사용자와 연결된 `store_id`를 결정합니다.

## Validation

- 비로그인 상태: `AuthPage`
- 승인 대기 / 거절 상태: `AuthPage` 내부 pending view
- 승인 완료 상태: `KdsPage`
- access token 만료 시: `refreshToken`으로 자동 복구 시도
- refresh 실패 시: 로그아웃 + 저장 토큰 삭제
