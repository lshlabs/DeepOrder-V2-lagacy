# DeepOrder 수동 실행 가이드

현재 `DeepOrder_V2`는 자동 탭/윈도우 실행 스크립트 대신, 각 서비스를 개별 터미널 탭 또는 개별 터미널 윈도우에서 수동으로 실행하는 방식을 기준으로 사용합니다.

## 실행 순서

### 1. `deeporder-backend`

```bash
cd /Users/mac/Documents/DeepOrder_V2/deeporder-backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. `mock-delivery-api`

```bash
cd /Users/mac/Documents/DeepOrder_V2/mock-delivery-api
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

### 3. `mock-delivery-console`

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm run dev:console
```

브라우저 접속:

```text
http://127.0.0.1:5174
```

### 4. `kds-web`

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm run dev:kds
```

브라우저 접속:

```text
http://127.0.0.1:5173
```

## 포트 정리

- `deeporder-backend`: `8000`
- `mock-delivery-api`: `8001`
- `mock-delivery-console`: `5174`
- `kds-web`: `5173`

## 참고

- `mock-delivery-console`와 `kds-web`는 포트를 명시적으로 고정해 두었습니다.
- 두 프론트엔드는 `strictPort`가 켜져 있으므로, 포트가 이미 사용 중이면 다른 포트로 자동 이동하지 않고 즉시 실패합니다.
- 필요하면 각 서비스를 서로 다른 Terminal 탭에 나눠 띄우는 것을 권장합니다.

## 자동 스모크 테스트

서비스를 모두 띄운 뒤 아래 명령으로 주문 생성부터 KDS 상태 전이까지 한 번에 점검할 수 있습니다.

```bash
npm run smoke:kds-e2e
```
