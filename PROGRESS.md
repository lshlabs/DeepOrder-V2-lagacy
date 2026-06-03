# DeepOrder v2 Progress Log

이 문서는 DeepOrder v2 구현 진행 내역을 누적 기록하는 문서다.

앞으로 Step 하나가 완료될 때마다 다음 항목을 기준으로 기록한다.

- 완료한 Step
- 구현한 기능
- 생성/수정한 주요 파일
- 검증한 명령과 결과
- 남은 이슈 또는 다음 Step에서 이어갈 내용

---

## Step 0. 모노레포 뼈대 생성

완료일: 2026-06-01

### 목표

Notion 설계 문서의 전체 구조를 바탕으로 DeepOrder v2 모노레포의 기본 골격을 만든다.

### 완료한 작업

- 루트 프로젝트 문서와 기본 설정 파일을 생성했다.
- `deeporder-backend`, `mock-delivery-api`, `kds-web`, `kds-app` 디렉터리를 만들었다.
- Backend와 Mock API는 FastAPI 프로젝트로 확장할 수 있도록 Python 패키지 구조를 잡았다.
- KDS Web은 React + TypeScript + Vite 기반으로 시작할 수 있도록 기본 파일을 만들었다.
- KDS App은 React Native WebView wrapper를 나중에 구현할 위치만 잡았다.
- `docs`, `deploy`, `scripts` 디렉터리를 만들어 문서, 배포 설정, 개발 스크립트가 들어갈 자리를 마련했다.
- 루트 `package.json`에 npm workspace를 설정해 `kds-web`을 workspace로 관리하도록 했다.
- `Makefile`에 자주 사용할 로컬 실행 명령의 초안을 추가했다.

### 생성한 주요 파일

- `README.md`
- `.gitignore`
- `.editorconfig`
- `.env.example`
- `package.json`
- `Makefile`
- `deeporder-backend/README.md`
- `deeporder-backend/pyproject.toml`
- `deeporder-backend/app/main.py`
- `mock-delivery-api/README.md`
- `mock-delivery-api/pyproject.toml`
- `mock-delivery-api/app/main.py`
- `kds-web/README.md`
- `kds-web/package.json`
- `kds-web/index.html`
- `kds-web/src/main.tsx`
- `kds-web/tsconfig.json`
- `kds-web/vite.config.ts`
- `kds-app/README.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/deployment.md`

### 초기 디렉터리 구조

```text
deeporder-backend/    FastAPI service that receives external order webhooks
mock-delivery-api/    FastAPI service that generates and sends mock delivery orders
kds-web/              React + TypeScript KDS web client
kds-app/              React Native WebView wrapper for Android devices
docs/                 Architecture, API, and deployment notes
deploy/               Nginx, systemd, or Docker deployment examples
scripts/              Local developer helper scripts
```

### 검증 결과

다음 검증을 수행했다.

```bash
python3 -m py_compile deeporder-backend/app/main.py mock-delivery-api/app/main.py
```

결과:

```text
통과
```

```bash
node -e "const fs=require('fs'); for (const f of ['package.json','kds-web/package.json','kds-web/tsconfig.json']) JSON.parse(fs.readFileSync(f,'utf8')); console.log('json ok')"
```

결과:

```text
json ok
```

### 완료 기준 충족 여부

- 모노레포 디렉터리 구조 생성 완료
- 각 서비스의 README 및 기본 실행 방향 작성 완료
- 루트 환경변수 예시 작성 완료
- 다음 Step에서 Backend 구현을 시작할 수 있는 상태 확보

---

## Step 1. DeepOrder Backend Webhook 수신

완료일: 2026-06-01

### 목표

DeepOrder Backend가 외부 주문 플랫폼 또는 Mock Delivery API로부터 webhook 주문 이벤트를 수신하고, 주문을 저장하며, KDS에서 조회할 수 있게 만든다.

Notion 설계 문서 기준 Step 1 완료 기준:

- Swagger 또는 API 요청으로 주문 JSON을 보내면 DB에 저장된다.
- 같은 `eventId`를 보내면 중복 이벤트로 처리된다.
- KDS API로 주문 목록을 조회할 수 있다.
- 주문 상태를 변경할 수 있다.

### 구현한 기능

#### 1. 설정 관리

`pydantic-settings` 기반 설정 파일을 추가했다.

- 기본 DB URL: `sqlite:///./deeporder.db`
- 환경변수 prefix: `DEEPORDER_`
- `.env` 파일을 읽을 수 있도록 설정

주요 파일:

- `deeporder-backend/app/config.py`

#### 2. DB 연결과 테이블 생성

SQLAlchemy 2.x 기반 DB 연결을 추가했다.

- `create_engine`
- `sessionmaker`
- FastAPI dependency용 `get_db`
- 앱 시작 시 `Base.metadata.create_all()`로 테이블 생성

현재는 초기 PoC 단계이므로 Alembic migration은 아직 추가하지 않았다.

주요 파일:

- `deeporder-backend/app/database.py`
- `deeporder-backend/app/main.py`

#### 3. DB 모델

다음 테이블 모델을 추가했다.

`webhook_events`

- `event_id`
- `event_type`
- `platform`
- `store_id`
- `status`
- `raw_payload`
- `created_at`

`orders`

- `platform`
- `store_id`
- `external_order_id`
- `order_number`
- `status`
- `customer_request`
- `delivery_request`
- `raw_payload`
- `ordered_at`
- `created_at`
- `updated_at`

`order_items`

- `order_id`
- `name`
- `quantity`
- `options`
- `unit_price`
- `total_price`

주요 설계:

- `webhook_events.event_id`는 unique로 관리한다.
- `orders`는 `platform + external_order_id` 조합을 unique로 관리한다.
- 주문 상태는 `NEW`, `COOKING`, `DONE`, `CANCELLED` enum으로 관리한다.

주요 파일:

- `deeporder-backend/app/models.py`

#### 4. Pydantic 스키마

Webhook 입력, KDS 응답, 상태 변경 요청/응답 스키마를 추가했다.

지원 webhook event type:

- `ORDER_CREATED`
- `ORDER_CANCELLED`

지원 주문 상태:

- `NEW`
- `COOKING`
- `DONE`
- `CANCELLED`

주요 파일:

- `deeporder-backend/app/schemas.py`

#### 5. Webhook 수신 API

다음 API를 구현했다.

```text
POST /api/external/orders/webhook
```

동작:

- `eventId`가 이미 존재하면 `DUPLICATE_EVENT`를 반환한다.
- 신규 `ORDER_CREATED` 이벤트는 주문과 주문 아이템을 저장한다.
- 신규 `ORDER_CANCELLED` 이벤트는 기존 주문이 있으면 `CANCELLED` 상태로 변경한다.
- 동일 주문이 이미 존재하는 경우 새 주문을 만들지 않고 이벤트만 기록한다.
- DB unique 충돌이 발생해도 중복 처리 응답으로 안전하게 처리한다.

응답 예시:

```json
{
  "result": "PROCESSED",
  "eventId": "evt_001",
  "orderId": 1,
  "message": "Order webhook processed."
}
```

중복 이벤트 응답 예시:

```json
{
  "result": "DUPLICATE_EVENT",
  "eventId": "evt_001",
  "orderId": null,
  "message": "Event was already processed."
}
```

주요 파일:

- `deeporder-backend/app/orders.py`

#### 6. KDS 주문 목록 API

다음 API를 구현했다.

```text
GET /api/kds/orders?storeId=STORE_001
```

동작:

- `storeId` 기준으로 주문을 조회한다.
- 주문 아이템을 함께 반환한다.
- 최신 주문이 먼저 오도록 정렬한다.

주요 파일:

- `deeporder-backend/app/orders.py`

#### 7. 주문 상태 변경 API

다음 API를 구현했다.

```text
PATCH /api/orders/{order_id}/status
```

요청 예시:

```json
{
  "status": "COOKING"
}
```

동작:

- 주문이 없으면 `404 Order not found.`를 반환한다.
- 주문이 있으면 상태를 요청값으로 변경한다.

주요 파일:

- `deeporder-backend/app/orders.py`

#### 8. 테스트 추가

FastAPI `TestClient` 기반 테스트를 추가했다.

검증한 흐름:

- 주문 webhook 전송 시 DB에 저장된다.
- KDS API에서 저장된 주문을 조회할 수 있다.
- 주문 상태를 `NEW`에서 `COOKING`으로 변경할 수 있다.
- 같은 `eventId`를 다시 보내면 `DUPLICATE_EVENT`로 처리된다.

주요 파일:

- `deeporder-backend/tests/test_order_webhook.py`

### 수정한 문서

- `deeporder-backend/README.md`
  - 샘플 webhook payload 추가
- `docs/api.md`
  - Step 1 API 설명 추가
- `.gitignore`
  - Python `*.egg-info/` 생성물 제외 추가

### 검증 결과

Backend 가상환경을 생성하고 의존성을 설치했다.

```bash
cd deeporder-backend
/opt/homebrew/bin/python3.13 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e ".[dev]"
```

테스트 실행:

```bash
.venv/bin/python -m pytest -q
```

결과:

```text
2 passed, 1 warning
```

Ruff 실행:

```bash
.venv/bin/python -m ruff check app tests
```

결과:

```text
All checks passed!
```

서버 실행 확인:

```bash
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

확인한 요청:

```bash
curl -s http://127.0.0.1:8000/health
```

결과:

```json
{"status":"ok","service":"deeporder-backend"}
```

Webhook 요청도 직접 보내 정상 저장되는 것을 확인했다.

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `deeporder-backend/.pytest_cache`
- `__pycache__`
- `deeporder-backend/deeporder_backend.egg-info`

### 현재 남은 이슈

- DB migration 도구인 Alembic은 아직 추가하지 않았다.
- 인증/서명 검증은 아직 없다.
- AI Request Analyzer는 아직 없다.
- KDS 응답에 `aiAnalysis`는 아직 포함되지 않는다.
- WebSocket/SSE는 아직 구현하지 않고, 이후 KDS Web 단계에서는 polling으로 시작한다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 2. Mock Delivery API 샘플 주문 전송
```

예상 작업:

- `mock-delivery-api` FastAPI 구현 확장
- 샘플 주문 생성 API 추가
- DeepOrder Backend webhook으로 주문 전송
- Webhook 전송 로그 저장
- Mock API 테스트 추가

---

## Step 2. Mock Delivery API 기본 주문 전송

완료일: 2026-06-01

### 목표

Mock Delivery API에서 샘플 주문 payload를 만들고, DeepOrder Backend의 webhook endpoint로 전송하며, 전송 결과를 로그로 남긴다.

Notion 설계 문서 기준 Step 2 완료 기준:

- Mock API에서 샘플 주문을 생성할 수 있다.
- 생성된 주문을 DeepOrder Backend webhook으로 전송할 수 있다.
- Webhook 전송 결과가 로그로 저장된다.
- 전송된 주문을 DeepOrder Backend KDS API에서 조회할 수 있다.

### 구현한 기능

#### 1. 설정 관리

`pydantic-settings` 기반 설정 파일을 추가했다.

- 기본 DB URL: `sqlite:///./mock_delivery.db`
- 기본 DeepOrder webhook URL: `http://localhost:8000/api/external/orders/webhook`
- `MOCK_DATABASE_URL` 환경변수로 DB URL 변경 가능
- `DEEPORDER_WEBHOOK_URL` 환경변수로 webhook target 변경 가능

주요 파일:

- `mock-delivery-api/app/config.py`

#### 2. DB 연결과 테이블 생성

SQLAlchemy 2.x 기반 DB 연결을 추가했다.

- `create_engine`
- `sessionmaker`
- FastAPI dependency용 `get_db`
- 앱 시작 시 `Base.metadata.create_all()`로 테이블 생성

현재는 초기 PoC 단계이므로 Alembic migration은 아직 추가하지 않았다.

주요 파일:

- `mock-delivery-api/app/database.py`
- `mock-delivery-api/app/main.py`

#### 3. DB 모델

다음 테이블 모델을 추가했다.

`mock_orders`

- `event_id`
- `order_id`
- `order_number`
- `store_id`
- `payload`
- `created_at`

`mock_webhook_logs`

- `event_id`
- `order_id`
- `webhook_url`
- `status`
- `success`
- `http_status_code`
- `response_body`
- `error_message`
- `request_payload`
- `created_at`

주요 설계:

- 생성된 mock 주문 payload를 DB에 저장한다.
- webhook 전송 성공과 실패를 모두 로그로 저장한다.
- 전송 로그에는 요청 payload와 응답 body를 같이 남긴다.

주요 파일:

- `mock-delivery-api/app/models.py`

#### 4. Pydantic 스키마

샘플 주문 생성, webhook 전송, webhook 로그 응답 스키마를 추가했다.

주요 파일:

- `mock-delivery-api/app/schemas.py`

#### 5. 샘플 주문 생성

다음 API를 구현했다.

```text
POST /api/mock/orders/sample
```

요청 예시:

```json
{
  "storeId": "STORE_001"
}
```

동작:

- `MOCK_DELIVERY` 플랫폼의 `ORDER_CREATED` payload를 생성한다.
- 서버에서 `eventId`, `orderId`, `orderNumber`를 생성한다.
- 샘플 메뉴는 `제육덮밥`, `콜라`로 구성했다.
- 고객 요청사항과 배달 요청사항을 포함한다.
- 생성된 payload를 `mock_orders`에 저장한다.

주요 파일:

- `mock-delivery-api/app/sample_orders.py`
- `mock-delivery-api/app/mock_orders.py`

#### 6. Webhook 전송

다음 API를 구현했다.

```text
POST /api/mock/orders/send
```

요청 예시:

```json
{
  "generatedOrderId": 1
}
```

동작:

- `generatedOrderId`가 있으면 해당 mock 주문을 전송한다.
- `payload`가 직접 들어오면 해당 payload를 전송한다.
- body가 없으면 가장 최근 생성된 주문을 전송한다.
- 생성된 주문이 하나도 없으면 샘플 주문을 자동 생성한 뒤 전송한다.
- `webhookUrl`을 요청 body로 넘기면 기본 webhook URL 대신 해당 URL로 전송한다.
- `httpx.post()`로 DeepOrder Backend webhook에 전송한다.
- 성공/실패 여부와 HTTP 응답을 `mock_webhook_logs`에 저장한다.

주요 파일:

- `mock-delivery-api/app/mock_orders.py`

#### 7. Webhook 로그 조회

다음 API를 구현했다.

```text
GET /api/mock/webhook-logs?limit=20
```

동작:

- 최근 webhook 전송 로그를 최신순으로 조회한다.
- `limit`은 1부터 100까지 허용한다.

주요 파일:

- `mock-delivery-api/app/mock_orders.py`

#### 8. 테스트 추가

FastAPI `TestClient` 기반 테스트를 추가했다.

검증한 흐름:

- 샘플 주문을 생성할 수 있다.
- 생성된 주문 payload에 `ORDER_CREATED`, `MOCK_DELIVERY`, `STORE_001` 값이 들어간다.
- 생성된 주문을 webhook으로 전송할 수 있다.
- 전송 성공 로그가 저장된다.
- webhook 로그 API에서 전송 로그를 조회할 수 있다.

테스트에서는 실제 외부 HTTP 호출 대신 `httpx.post`를 monkeypatch해서 성공 응답을 검증했다.

주요 파일:

- `mock-delivery-api/tests/test_mock_orders.py`

### 수정한 문서

- `mock-delivery-api/README.md`
  - 샘플 주문 생성, 전송, 로그 조회 curl 예시 추가
- `docs/api.md`
  - Mock Delivery API endpoint 설명 추가
- `PROGRESS.md`
  - Step 2 진행 내역 추가

### 검증 결과

Mock Delivery API 가상환경을 생성하고 의존성을 설치했다.

```bash
cd mock-delivery-api
/opt/homebrew/bin/python3.13 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e ".[dev]"
```

테스트 실행:

```bash
.venv/bin/python -m pytest -q
```

결과:

```text
2 passed, 1 warning
```

Ruff 실행:

```bash
.venv/bin/python -m ruff check app tests
```

결과:

```text
All checks passed!
```

통합 확인:

```bash
cd deeporder-backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd mock-delivery-api
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
```

샘플 주문 생성:

```bash
curl -s -X POST http://127.0.0.1:8001/api/mock/orders/sample \
  -H 'Content-Type: application/json' \
  -d '{"storeId":"STORE_001"}'
```

결과:

```text
generatedOrderId와 MOCK_DELIVERY ORDER_CREATED payload 반환 확인
```

샘플 주문 전송:

```bash
curl -s -X POST http://127.0.0.1:8001/api/mock/orders/send \
  -H 'Content-Type: application/json' \
  -d '{"generatedOrderId":3}'
```

결과:

```text
success=true, status=SUCCESS, httpStatusCode=200 확인
```

DeepOrder Backend KDS 조회:

```bash
curl -s 'http://127.0.0.1:8000/api/kds/orders?storeId=STORE_001'
```

결과:

```text
Mock API가 전송한 주문이 NEW 상태로 저장되어 조회되는 것 확인
```

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `mock-delivery-api/mock_delivery.db`
- `mock-delivery-api/.pytest_cache`
- `mock-delivery-api/app/__pycache__`
- `mock-delivery-api/tests/__pycache__`
- `mock-delivery-api/mock_delivery_api.egg-info`
- `deeporder-backend/deeporder.db`

### 현재 남은 이슈

- Mock Console GUI는 아직 없다.
- AI 주문 생성은 아직 없다.
- 메뉴 등록 API는 아직 없다.
- 랜덤 주문 시뮬레이션은 아직 없다.
- webhook retry 정책은 아직 없다.
- webhook target 보안/서명 검증은 아직 없다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 3. KDS Web 주문 표시
```

예상 작업:

- `kds-web` React + TypeScript 화면 구현
- `/kds` 페이지 구성
- `GET /api/kds/orders?storeId=STORE_001` polling
- `NEW`, `COOKING`, `DONE` 컬럼 분리
- 주문 카드 표시
- `PATCH /api/orders/{order_id}/status` 연동

---

## Step 3. KDS Web 기본 화면

완료일: 2026-06-01

### 목표

React + TypeScript 기반 KDS Web에서 DeepOrder Backend 주문 목록을 조회하고, 주문 상태별 컬럼에 표시하며, 버튼으로 주문 상태를 변경한다.

Notion 설계 문서 기준 Step 3 완료 기준:

- Mock API에서 주문을 전송하면 KDS Web에 주문 카드가 표시된다.
- 주문 상태별로 `NEW`, `COOKING`, `DONE` 컬럼을 나눈다.
- `NEW` 주문에는 `조리 시작` 버튼을 표시한다.
- `COOKING` 주문에는 `완료` 버튼을 표시한다.
- 버튼 클릭 시 `PATCH /api/orders/{order_id}/status`를 호출한다.
- 아직 AI 태그 UI는 빈 영역만 만들어둔다.
- 아직 WebSocket은 구현하지 않고 polling으로 조회한다.
- 아직 React Native는 구현하지 않는다.

### 구현한 기능

#### 1. Backend CORS 설정 추가

KDS Web은 Vite dev server에서 실행되고 Backend는 별도 포트에서 실행되므로 브라우저 요청을 위해 CORS 설정을 추가했다.

기본 허용 origin:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

환경변수:

```text
DEEPORDER_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

주요 파일:

- `deeporder-backend/app/config.py`
- `deeporder-backend/app/main.py`
- `.env.example`

#### 2. KDS Web 주문 보드 구현

`kds-web/src/main.tsx`에 KDS 화면을 구현했다.

구현 내용:

- `GET {VITE_DEEPORDER_API_URL}/api/kds/orders?storeId={VITE_STORE_ID}` 호출
- 3초 간격 polling
- `NEW`, `COOKING`, `DONE` 3컬럼 보드
- 컬럼별 주문 개수 표시
- 주문 카드 렌더링
- 주문번호, 플랫폼, 메뉴명, 수량, 옵션 표시
- 고객 요청사항 표시
- 배달 요청사항 표시
- 주문 경과 시간 표시
- 총 금액 표시
- AI 분석 영역 placeholder 표시
- `NEW` 주문의 `조리 시작` 버튼
- `COOKING` 주문의 `완료` 버튼
- 상태 변경 중 버튼 disabled 처리
- 요청 실패 시 상단 에러 배너 표시

주요 파일:

- `kds-web/src/main.tsx`

#### 3. KDS Web 스타일 구현

`kds-web/src/styles.css`를 추가해 KDS 화면 스타일을 구성했다.

디자인 방향:

- 주방/태블릿 화면에서 한눈에 보이도록 큰 주문번호와 버튼 사용
- 신규/조리중/완료 상태를 색상으로 구분
- 3컬럼 보드 레이아웃
- 모바일/좁은 화면에서는 1컬럼으로 전환
- 카드 내부에는 메뉴, 요청사항, AI placeholder, 액션 버튼을 안정적으로 배치

주요 파일:

- `kds-web/src/styles.css`

#### 4. Vite 환경 타입 추가

`import.meta.env` 타입 인식을 위해 Vite 타입 선언 파일을 추가했다.

주요 파일:

- `kds-web/src/vite-env.d.ts`

#### 5. KDS 환경변수 정리

KDS Web 기본 API URL을 로컬 테스트에 맞춰 `127.0.0.1`로 정리했다.

```text
VITE_DEEPORDER_API_URL=http://127.0.0.1:8000
VITE_STORE_ID=STORE_001
```

주요 파일:

- `.env.example`
- `kds-web/README.md`

#### 6. Timestamp 표시 보정

SQLite 저장/응답 과정에서 timezone 정보가 빠진 timestamp가 내려올 수 있어, KDS Web에서 timezone 없는 API timestamp를 UTC로 해석하도록 보정했다.

이 보정을 하지 않으면 로컬 timezone에 따라 경과 시간이 실제보다 크게 표시될 수 있다.

주요 파일:

- `kds-web/src/main.tsx`

### 생성/수정한 주요 파일

- `kds-web/src/main.tsx`
- `kds-web/src/styles.css`
- `kds-web/src/vite-env.d.ts`
- `kds-web/README.md`
- `deeporder-backend/app/config.py`
- `deeporder-backend/app/main.py`
- `.env.example`
- `package-lock.json`

### 검증 결과

KDS Web 의존성을 설치했다.

```bash
npm install
```

KDS Web production build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
```

Backend 테스트와 Ruff:

```bash
cd deeporder-backend
.venv/bin/python -m pytest -q
.venv/bin/python -m ruff check app tests
```

결과:

```text
2 passed, 1 warning
All checks passed!
```

통합 실행:

```bash
cd deeporder-backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd mock-delivery-api
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
```

```bash
npm --workspace kds-web run dev -- --host 127.0.0.1 --port 5173
```

Mock API에서 샘플 주문 생성 후 Backend로 전송했다.

검증 결과:

- `GET /api/kds/orders?storeId=STORE_001`에서 주문이 `NEW` 상태로 조회되는 것을 확인했다.
- 브라우저에서 `http://127.0.0.1:5173/kds` 접속 시 주문 카드가 표시되는 것을 확인했다.
- `조리 시작` 버튼 클릭 시 `PATCH /api/orders/{order_id}/status`가 호출되는 것을 확인했다.
- 주문이 `신규1`에서 `신규0`, `조리중1`로 이동하는 것을 확인했다.
- 버튼 문구가 `조리 시작`에서 `완료`로 바뀌는 것을 확인했다.
- 에러 배너 없이 렌더링되는 것을 확인했다.
- Playwright 기반 브라우저 검증과 screenshot capture를 수행했다.

브라우저 검증 요약:

```json
{
  "before": ["신규1", "조리중0", "완료0"],
  "after": ["신규0", "조리중1", "완료0"],
  "error": null
}
```

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `mock-delivery-api/mock_delivery.db`
- `deeporder-backend/.pytest_cache`
- `mock-delivery-api/.pytest_cache`
- `__pycache__`
- `.ruff_cache`
- `kds-web/dist`

실행했던 dev server와 브라우저 세션도 종료했다.

### 현재 남은 이슈

- AI 분석 결과는 아직 실제 데이터가 없고 placeholder만 표시한다.
- Mock Console GUI는 아직 없다.
- KDS Web의 테스트 자동화는 아직 없다.
- 주문 취소 표시 UI는 아직 없다.
- WebSocket/SSE는 아직 없다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 4. Mock Delivery Console GUI
```

예상 작업:

- `mock-delivery-api`에 Jinja2 template 설정
- `GET /console` 화면 구현
- 샘플 주문 생성 버튼
- 생성된 주문 전송 버튼
- webhook 로그 새로고침 버튼
- 최근 생성 payload 미리보기
- 최근 webhook 전송 로그 테이블

---

## Step 4. Mock Delivery Console GUI

완료일: 2026-06-01

### 목표

Swagger나 curl 없이 브라우저에서 Mock Delivery API의 샘플 주문 생성, 주문 전송, webhook 로그 확인을 수행할 수 있는 Console 화면을 만든다.

Notion 설계 문서 기준 Step 4 완료 기준:

- `GET /console`에서 콘솔 화면을 볼 수 있다.
- 화면에 DeepOrder Webhook URL이 표시된다.
- `샘플 주문 생성` 버튼으로 샘플 주문을 만들 수 있다.
- `생성된 주문 전송` 버튼으로 주문을 DeepOrder Backend에 보낼 수 있다.
- `Webhook 로그 새로고침` 버튼으로 최근 전송 로그를 볼 수 있다.
- 최근 생성된 주문 payload를 미리 볼 수 있다.
- 최근 webhook 전송 로그 테이블을 볼 수 있다.
- 아직 AI 주문 생성은 구현하지 않는다.
- 아직 랜덤 시뮬레이션은 구현하지 않는다.

### 구현한 기능

#### 1. Jinja2 기반 Console route 추가

`GET /console` route를 추가했다.

동작:

- `app/templates/console.html`을 렌더링한다.
- 현재 설정된 DeepOrder webhook URL을 화면에 전달한다.

주요 파일:

- `mock-delivery-api/app/console.py`
- `mock-delivery-api/app/main.py`
- `mock-delivery-api/app/templates/console.html`

#### 2. Static assets mount 추가

Console 화면에서 사용할 CSS/JavaScript를 제공하기 위해 FastAPI `StaticFiles`를 `/static`에 mount했다.

주요 파일:

- `mock-delivery-api/app/main.py`
- `mock-delivery-api/app/static/console.css`
- `mock-delivery-api/app/static/console.js`

#### 3. Console 화면 구현

Console UI를 구현했다.

화면 구성:

- 상단 제목 `Mock Delivery Console`
- KDS 화면으로 이동하는 링크
- DeepOrder Webhook URL 표시 영역
- Store ID 입력
- `샘플 주문 생성` 버튼
- `생성된 주문 전송` 버튼
- `Webhook 로그 새로고침` 버튼
- 상태 메시지 영역
- 최근 생성 주문 payload preview
- 최근 webhook 전송 로그 table

주요 파일:

- `mock-delivery-api/app/templates/console.html`
- `mock-delivery-api/app/static/console.css`

#### 4. Console JavaScript 구현

브라우저에서 기존 Mock API REST endpoint를 호출하는 fetch 기반 동작을 구현했다.

연동 API:

- `POST /api/mock/orders/sample`
- `POST /api/mock/orders/send`
- `GET /api/mock/webhook-logs?limit=20`

동작:

- `샘플 주문 생성` 클릭 시 sample order를 생성한다.
- 생성된 `generatedOrderId`를 저장한다.
- 생성된 payload를 JSON preview로 표시한다.
- sample order 생성 전에는 `생성된 주문 전송` 버튼을 disabled 상태로 둔다.
- `생성된 주문 전송` 클릭 시 저장된 `generatedOrderId`로 주문을 전송한다.
- 전송 성공/실패 메시지를 상태 영역에 표시한다.
- 전송 후 webhook log를 자동 갱신한다.
- 로그 테이블에는 시간, 상태, HTTP status, 주문 ID, 응답/오류를 표시한다.

주요 파일:

- `mock-delivery-api/app/static/console.js`

#### 5. 의존성 추가

Jinja2 template 렌더링을 위해 `jinja2` 의존성을 추가했다.

주요 파일:

- `mock-delivery-api/pyproject.toml`

#### 6. 테스트 추가

Console page 렌더링 테스트를 추가했다.

검증 내용:

- `GET /console`이 200을 반환한다.
- HTML에 `Mock Delivery Console`이 포함된다.
- HTML에 `DeepOrder Webhook URL`이 포함된다.
- HTML에 `/static/console.js`가 포함된다.

주요 파일:

- `mock-delivery-api/tests/test_mock_orders.py`

### 생성/수정한 주요 파일

- `mock-delivery-api/app/console.py`
- `mock-delivery-api/app/templates/console.html`
- `mock-delivery-api/app/static/console.css`
- `mock-delivery-api/app/static/console.js`
- `mock-delivery-api/app/main.py`
- `mock-delivery-api/pyproject.toml`
- `mock-delivery-api/README.md`
- `mock-delivery-api/tests/test_mock_orders.py`
- `docs/api.md`

### 트러블슈팅

#### 1. `TemplateResponse` 호출 시 TypeError 발생

문제:

```text
TypeError: unhashable type: 'dict'
```

원인:

- Starlette/FastAPI 최신 버전에서 `Jinja2Templates.TemplateResponse` 호출 시그니처가 기존 예제와 달랐다.
- 처음에는 `TemplateResponse("console.html", context)` 형태로 호출했다.
- 이 때문에 context dict가 template name 위치로 잘못 해석되어 Jinja cache key 처리 중 `unhashable type: 'dict'` 오류가 발생했다.

해결:

```python
templates.TemplateResponse(
    request,
    "console.html",
    {"webhook_url": str(settings.deeporder_webhook_url)},
)
```

검증:

- `GET /console` 테스트가 통과했다.
- 전체 Mock API 테스트가 `3 passed`로 통과했다.

#### 2. 브라우저 검증 전 DB 초기화 경로 실수

문제:

- `/console` 브라우저 최초 확인 시 이전 테스트 webhook 로그가 남아 있었다.

원인:

- DB 파일 삭제 명령을 `deeporder-backend` 작업 디렉터리에서 상대 경로로 실행했다.
- 결과적으로 실제 `mock-delivery-api/mock_delivery.db`가 삭제되지 않았다.

해결:

- 실행 중인 Backend/Mock API 서버를 종료했다.
- 루트 기준 절대 경로로 DB 파일을 삭제했다.

```bash
rm -f /Users/mac/Documents/DeepOrder_V2/deeporder-backend/deeporder.db
rm -f /Users/mac/Documents/DeepOrder_V2/mock-delivery-api/mock_delivery.db
```

검증:

- 서버를 재시작한 뒤 Console을 새로고침했다.
- 초기 로그 테이블에 `전송 로그가 없습니다.`가 표시되는 것을 확인했다.
- 이후 주문 생성/전송 시 로그가 1건만 표시되는 것을 확인했다.

### 검증 결과

Mock Delivery API 의존성을 갱신했다.

```bash
cd mock-delivery-api
.venv/bin/python -m pip install -e ".[dev]"
```

Mock Delivery API 테스트:

```bash
.venv/bin/python -m pytest -q
```

결과:

```text
3 passed, 1 warning
```

Mock Delivery API Ruff:

```bash
.venv/bin/python -m ruff check app tests
```

결과:

```text
All checks passed!
```

Backend 회귀 테스트:

```bash
cd deeporder-backend
.venv/bin/python -m pytest -q
.venv/bin/python -m ruff check app tests
```

결과:

```text
2 passed, 1 warning
All checks passed!
```

통합 실행:

```bash
cd deeporder-backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd mock-delivery-api
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
```

브라우저 검증:

```text
http://127.0.0.1:8001/console
```

확인한 내용:

- Console 화면이 렌더링된다.
- DeepOrder webhook URL이 표시된다.
- 초기 로그 테이블은 비어 있다.
- `샘플 주문 생성` 클릭 시 `generatedOrderId=1`이 표시된다.
- payload preview에 `ORDER_CREATED`, `MOCK_DELIVERY`, `STORE_001` payload가 표시된다.
- `생성된 주문 전송` 버튼이 활성화된다.
- `생성된 주문 전송` 클릭 시 `전송 성공: HTTP 200`이 표시된다.
- 로그 테이블에 `SUCCESS`, `200`, `mock_order_*`, DeepOrder Backend 응답 body가 표시된다.
- Backend KDS API에서 전송된 주문이 `NEW` 상태로 조회된다.
- 브라우저 screenshot capture를 수행했다.

Backend KDS 확인:

```bash
curl -s 'http://127.0.0.1:8000/api/kds/orders?storeId=STORE_001'
```

결과:

```text
Console에서 전송한 주문이 NEW 상태로 저장된 것을 확인
```

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `mock-delivery-api/mock_delivery.db`
- `.pytest_cache`
- `__pycache__`
- `.ruff_cache`

실행했던 Backend/Mock API 서버와 브라우저 세션도 종료했다.

### 현재 남은 이슈

- Console에서 메뉴 등록/관리 기능은 아직 없다.
- Console에서 AI 주문 생성은 아직 없다.
- Console에서 랜덤 주문 시뮬레이션은 아직 없다.
- Webhook retry 정책은 아직 없다.
- KDS Web 자동화 테스트는 아직 없다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 5. AI Request Analyzer
```

예상 작업:

- `deeporder-backend`에 `order_ai_analysis` 모델 추가
- AI Request Analyzer service 작성
- AI 호출 구조와 JSON schema 검증 추가
- fallback keyword analyzer 추가
- 주문 저장 후 background task로 분석 실행
- KDS API 응답에 `aiAnalysis` 포함
