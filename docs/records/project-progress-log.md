작업 기록: DeepOrder v2 전반의 구현 진행 상황, 트러블슈팅, 후속 할 일을 누적 기록하는 진행 로그 문서.

# DeepOrder v2 Progress Log

이 문서는 DeepOrder v2 구현 진행 내역을 누적 기록하는 문서다.

앞으로 Step 하나가 완료될 때마다 다음 항목을 기준으로 기록한다.

- 완료한 Step
- 구현한 기능
- 생성/수정한 주요 파일
- 검증한 명령과 결과
- 트러블슈팅 진행 내역이 있었으면 문제, 원인, 해결, 검증을 기록한다.
- 남은 이슈 또는 다음 Step에서 이어갈 내용

---

## 진행 순서 메모

작성일: 2026-06-03

AI 활용 범위와 Mock API 확장 범위를 아래 순서로 진행한다.

```text
Step 5. DeepOrder Backend AI Request Analyzer
Step 6. KDS Web AI 분석 표시
Step 7. Mock Delivery API Store/Menu/Option + AI Order Generator
Step 8. Random Order Simulation
```

Step 7은 범위가 크기 때문에 다음 하위 단계로 나누어 진행한다.

```text
Step 7-1. Store/Menu/Option 데이터 모델과 API
Step 7-2. Console 메뉴/옵션 관리 화면
Step 7-3. Seed 치킨집 데이터
Step 7-4. order_validator + order_builder
Step 7-5. fallback_order_generator
Step 7-6. Gemini provider
Step 7-7. AI generate / generate-and-send API
Step 7-8. Console AI 주문 테스트 화면
```

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
GET /api/kds/orders?storeId=STORE_FLAT
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
  "storeId": "STORE_FLAT"
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
- 생성된 주문 payload에 `ORDER_CREATED`, `MOCK_DELIVERY`, `STORE_FLAT` 값이 들어간다.
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
- `project-progress-log.md`
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
  -d '{"storeId":"STORE_FLAT"}'
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
curl -s 'http://127.0.0.1:8000/api/kds/orders?storeId=STORE_FLAT'
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
- `GET /api/kds/orders?storeId=STORE_FLAT` polling
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
VITE_STORE_ID=STORE_FLAT
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

- `GET /api/kds/orders?storeId=STORE_FLAT`에서 주문이 `NEW` 상태로 조회되는 것을 확인했다.
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
- payload preview에 `ORDER_CREATED`, `MOCK_DELIVERY`, `STORE_FLAT` payload가 표시된다.
- `생성된 주문 전송` 버튼이 활성화된다.
- `생성된 주문 전송` 클릭 시 `전송 성공: HTTP 200`이 표시된다.
- 로그 테이블에 `SUCCESS`, `200`, `mock_order_*`, DeepOrder Backend 응답 body가 표시된다.
- Backend KDS API에서 전송된 주문이 `NEW` 상태로 조회된다.
- 브라우저 screenshot capture를 수행했다.

Backend KDS 확인:

```bash
curl -s 'http://127.0.0.1:8000/api/kds/orders?storeId=STORE_FLAT'
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
Step 5. DeepOrder Backend AI Request Analyzer
```

예상 작업:

- `deeporder-backend`에 `order_ai_analysis` 모델 추가
- AI Request Analyzer service 작성
- AI 호출 구조와 JSON schema 검증 추가
- fallback keyword analyzer 추가
- 주문 저장 후 background task로 분석 실행
- KDS API 응답에 `aiAnalysis` 포함

---

## Step 5. DeepOrder Backend AI Request Analyzer

완료일: 2026-06-03

### 목표

DeepOrder Backend가 주문 저장 후 고객 요청사항, 배달 요청사항, 메뉴 옵션을 AI 또는 fallback analyzer로 분석하고, KDS API 응답에 구조화된 `aiAnalysis`를 포함한다.

완료 기준:

- `order_ai_analysis` 테이블을 추가한다.
- 주문 저장 후 AI 분석을 background task로 실행한다.
- AI API key가 없거나 호출에 실패해도 주문 저장은 실패하지 않는다.
- fallback keyword analyzer를 통해 기본 분석 결과를 저장한다.
- KDS 주문 목록 API 응답에 `aiAnalysis`가 포함된다.
- 알레르기/재료 제외 요청은 위험도와 사람 확인 필요 여부에 반영된다.

### 구현한 기능

#### 1. AI 분석 설정 추가

Gemini 기본 provider 설정을 추가했다. 모델 교체가 쉽도록 provider와 model은 환경변수로 관리한다.

환경변수:

```text
DEEPORDER_AI_PROVIDER=gemini
DEEPORDER_GEMINI_API_KEY=
DEEPORDER_GEMINI_MODEL=gemini-2.5-flash-lite
DEEPORDER_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
DEEPORDER_OPENAI_API_KEY=
DEEPORDER_OPENAI_MODEL=
DEEPORDER_OPENAI_BASE_URL=https://api.openai.com/v1
```

동작:

- 기본값은 `DEEPORDER_AI_PROVIDER=gemini`이다.
- Gemini 모델 기본값은 `gemini-2.5-flash-lite`이다.
- `DEEPORDER_GEMINI_MODEL`을 바꾸면 코드 변경 없이 Gemini 모델을 교체할 수 있다.
- `DEEPORDER_AI_PROVIDER=openai`로 설정하면 OpenAI-compatible provider를 사용할 수 있다.
- 선택한 provider의 API key/model 설정이 없거나 호출에 실패하면 fallback analyzer를 사용한다.

주요 파일:

- `deeporder-backend/app/config.py`
- `.env.example`

#### 2. `order_ai_analysis` 모델 추가

주문별 AI 분석 결과를 저장하는 모델을 추가했다.

필드:

- `order_id`
- `summary`
- `tags`
- `cooking_notes`
- `packing_notes`
- `delivery_notes`
- `risk_level`
- `warnings`
- `needs_human_check`
- `analysis_status`
- `error_message`
- `created_at`
- `updated_at`

enum:

- `RiskLevel`: `LOW`, `MEDIUM`, `HIGH`
- `AnalysisStatus`: `PENDING`, `COMPLETED`, `FALLBACK`, `FAILED`

주요 파일:

- `deeporder-backend/app/models.py`

#### 3. KDS 응답 스키마 확장

KDS 주문 응답에 `aiAnalysis`를 추가했다.

응답 shape:

```json
{
  "summary": "양상추 제외, 견과류 알레르기 확인",
  "tags": ["알레르기위험", "재료제외", "조리요청"],
  "cookingNotes": ["양상추는 빼주시고 견과류 알레르기 있어요"],
  "packingNotes": [],
  "deliveryNotes": ["문 앞에 놓아주세요"],
  "riskLevel": "HIGH",
  "warnings": ["알레르기 또는 위험 요청이 있으므로 반드시 사람 확인 필요"],
  "needsHumanCheck": true,
  "analysisStatus": "FALLBACK"
}
```

주요 파일:

- `deeporder-backend/app/schemas.py`

#### 4. Fallback Request Analyzer 구현

AI provider를 사용할 수 없거나 실패할 때 동작하는 키워드 기반 analyzer를 구현했다.

분석 기준:

- 고객 요청사항
- 배달 요청사항
- 메뉴 옵션 문자열

감지하는 주요 케이스:

- 조리 요청
- 배달 요청
- 재료 제외 요청
- 포장 요청
- 알레르기/위험 요청

위험도:

- 재료 제외 요청은 `MEDIUM`
- 알레르기 관련 요청은 `HIGH`
- 위험 요청이 있으면 `needsHumanCheck=true`

주요 파일:

- `deeporder-backend/app/services/fallback_request_analyzer.py`

#### 5. AI Request Analyzer service 구현

주문 분석 service를 추가했다.

동작:

1. `Order`와 `OrderItem`, 기존 `OrderAIAnalysis`를 조회한다.
2. 분석 상태를 `PENDING`으로 설정한다.
3. `DEEPORDER_AI_PROVIDER` 설정에 따라 Gemini 또는 OpenAI-compatible provider 호출을 시도한다.
4. AI 응답은 Pydantic 모델로 검증한다.
5. AI 호출 또는 검증 실패 시 fallback analyzer로 대체한다.
6. 분석 성공 시 `COMPLETED`, fallback 사용 시 `FALLBACK`, 저장 실패 시 `FAILED`로 기록한다.

주요 파일:

- `deeporder-backend/app/services/ai_request_analyzer.py`

#### 6. Webhook 저장 후 background task 연결

`POST /api/external/orders/webhook`에서 신규 `ORDER_CREATED` 주문 저장 시:

- `order_ai_analysis` row를 `PENDING` 상태로 생성한다.
- 주문 저장 commit 이후 `BackgroundTasks`로 `analyze_order_request(order.id)`를 실행한다.
- AI 분석 실패가 주문 저장 실패로 이어지지 않게 분리했다.

주요 파일:

- `deeporder-backend/app/orders.py`

#### 7. Runtime dependency 정리

AI provider 호출에 `httpx`가 필요하므로 Backend runtime dependency로 이동했다.

주요 파일:

- `deeporder-backend/pyproject.toml`

#### 8. 테스트 보강

기존 webhook/KDS flow 테스트를 확장했다.

검증 내용:

- webhook 주문 저장 후 KDS 응답에 `aiAnalysis`가 포함된다.
- API key가 없는 기본 환경에서는 `analysisStatus=FALLBACK`이다.
- `견과류 알레르기` 요청은 `riskLevel=HIGH`로 분석된다.
- `알레르기위험` tag가 포함된다.
- `needsHumanCheck=true`가 된다.

주요 파일:

- `deeporder-backend/tests/test_order_webhook.py`

### 생성/수정한 주요 파일

- `deeporder-backend/app/models.py`
- `deeporder-backend/app/schemas.py`
- `deeporder-backend/app/orders.py`
- `deeporder-backend/app/config.py`
- `deeporder-backend/app/services/__init__.py`
- `deeporder-backend/app/services/fallback_request_analyzer.py`
- `deeporder-backend/app/services/ai_request_analyzer.py`
- `deeporder-backend/tests/test_order_webhook.py`
- `deeporder-backend/pyproject.toml`
- `deeporder-backend/README.md`
- `docs/api.md`
- `.env.example`

### 트러블슈팅

#### 1. AI Provider 기본값을 OpenAI-compatible처럼 설계한 문제

문제:

- Step 5 최초 구현에서 Backend AI Request Analyzer의 provider 설정을 OpenAI-compatible API 중심으로 설계했다.
- 이후 사용자가 이전 AI 구현 문서에서 `gemini-2.5-flash-lite` 사용을 정한 점을 지적했다.

원인:

- 메인 설계 문서의 Backend AI Request Analyzer 항목에 `OpenAI API 또는 호환 LLM API` 표현이 있어, Step 5에서는 OpenAI-compatible 구조로 먼저 해석했다.
- 하지만 프로젝트 전체 AI provider 기본값은 Notion AI 주문 생성/분석 구현 문서에 맞춰 Gemini로 통일하는 편이 더 일관적이다.

해결:

- Backend AI Request Analyzer 기본 provider를 Gemini로 변경했다.
- 기본 모델을 `gemini-2.5-flash-lite`로 설정했다.
- 모델 교체가 쉽도록 provider/model/base URL을 환경변수로 관리하게 했다.
- OpenAI-compatible provider는 확장 옵션으로 남겼다.

환경변수:

```text
DEEPORDER_AI_PROVIDER=gemini
DEEPORDER_GEMINI_API_KEY=
DEEPORDER_GEMINI_MODEL=gemini-2.5-flash-lite
DEEPORDER_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
DEEPORDER_OPENAI_API_KEY=
DEEPORDER_OPENAI_MODEL=
DEEPORDER_OPENAI_BASE_URL=https://api.openai.com/v1
```

검증:

- API key가 없는 기본 환경에서 fallback analyzer가 정상 동작하는 것을 테스트로 확인했다.
- Backend, Mock API, KDS Web 회귀 검증을 모두 통과했다.

#### 2. 수동 검증 전 DB 삭제 상대경로 실수

문제:

- 수동 검증을 위해 DB를 초기화하려고 했지만, `deeporder-backend` 디렉터리 안에서 `rm -f deeporder-backend/deeporder.db` 형태로 실행했다.
- 실제 DB 파일이 삭제되지 않아 이전 테스트 데이터가 남은 상태로 수동 검증 결과가 출력되었다.

원인:

- 현재 작업 디렉터리와 삭제 대상 경로를 혼동했다.
- `deeporder-backend` 내부에서 다시 `deeporder-backend/deeporder.db`를 지정해 존재하지 않는 경로를 삭제하려 했다.

해결:

- 서버를 종료했다.
- 루트 기준 절대 경로로 DB 파일과 캐시를 정리했다.

```bash
rm -f /Users/mac/Documents/DeepOrder_V2/deeporder-backend/deeporder.db
rm -rf /Users/mac/Documents/DeepOrder_V2/deeporder-backend/.pytest_cache
rm -rf /Users/mac/Documents/DeepOrder_V2/deeporder-backend/.ruff_cache
```

검증:

- 수동 검증 자체에서는 `aiAnalysis`가 정상적으로 응답에 포함되는 것을 확인했다.
- 이후 절대 경로로 DB와 캐시를 정리했다.

### 검증 결과

Backend 테스트:

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

Mock Delivery API 회귀 테스트:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest -q
.venv/bin/python -m ruff check app tests
```

결과:

```text
3 passed, 1 warning
All checks passed!
```

KDS Web build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
```

수동 Backend 확인:

```bash
cd deeporder-backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Webhook 요청:

```bash
curl -s -X POST http://127.0.0.1:8000/api/external/orders/webhook \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"step5_evt_001","eventType":"ORDER_CREATED","platform":"MOCK_DELIVERY","storeId":"STORE_FLAT","order":{"orderId":"step5_order_001","orderNumber":"S5-001","customerRequest":"양상추는 빼주시고 견과류 알레르기 있어요.","deliveryRequest":"문 앞에 놓아주세요.","items":[{"name":"제육덮밥","quantity":1,"options":["덜 맵게"],"unitPrice":9000,"totalPrice":9000}]}}'
```

KDS 조회:

```bash
curl -s 'http://127.0.0.1:8000/api/kds/orders?storeId=STORE_FLAT'
```

확인한 내용:

- `aiAnalysis`가 포함된다.
- `analysisStatus`는 `FALLBACK`이다.
- `riskLevel`은 `HIGH`이다.
- `tags`에 `알레르기위험`, `재료제외`, `조리요청`, `배달요청`이 포함된다.
- `needsHumanCheck`는 `true`이다.

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `deeporder-backend/.pytest_cache`
- `deeporder-backend/.ruff_cache`
- `deeporder-backend/app/__pycache__`
- `deeporder-backend/tests/__pycache__`
- `kds-web/dist`

실행했던 Backend 서버도 종료했다.

### 현재 남은 이슈

- 실제 AI provider 호출은 API key/model 설정이 있어야 동작한다.
- OpenAI-compatible provider 호출은 실제 API key로 아직 통합 검증하지 않았다.
- Gemini provider 호출은 실제 API key로 아직 통합 검증하지 않았다.
- KDS Web은 아직 `aiAnalysis`를 화면에 표시하지 않는다.
- AI 분석 결과 수정/재분석 API는 아직 없다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 6. KDS Web AI 분석 표시
```

예상 작업:

- KDS Web 주문 카드에 `aiAnalysis` 영역 연결
- summary 표시
- tags badge 표시
- `riskLevel=HIGH` 강한 경고 표시
- `riskLevel=MEDIUM` 주의 표시
- `analysisStatus=PENDING` 분석중 표시
- `analysisStatus=FALLBACK` 기본 키워드 분석 결과 표시
- `needsHumanCheck=true`이면 버튼 문구를 `확인 후 조리 시작`으로 변경

---

## Step 6. KDS Web AI 분석 표시

완료일: 2026-06-03

### 목표

KDS Web 주문 카드에 DeepOrder Backend가 내려주는 `aiAnalysis` 결과를 시각적으로 표시한다.

완료 기준:

- AI summary를 표시한다.
- AI tags를 badge 형태로 표시한다.
- `riskLevel=HIGH`이면 강한 경고 영역을 표시한다.
- `riskLevel=MEDIUM`이면 주의 표시를 한다.
- `analysisStatus=PENDING`이면 `AI 분석중...`을 표시한다.
- `analysisStatus=FALLBACK`이면 `기본 키워드 분석 결과`를 표시한다.
- `needsHumanCheck=true`이면 `조리 시작` 버튼 문구를 `확인 후 조리 시작`으로 변경한다.
- 기존 주문 상태 변경 기능은 유지한다.

### 구현한 기능

#### 1. KDS Web 타입 확장

Backend KDS API 응답의 `aiAnalysis`를 받을 수 있도록 TypeScript 타입을 추가했다.

추가 타입:

- `RiskLevel`: `LOW`, `MEDIUM`, `HIGH`
- `AnalysisStatus`: `PENDING`, `COMPLETED`, `FALLBACK`, `FAILED`
- `OrderAIAnalysis`

주요 파일:

- `kds-web/src/main.tsx`

#### 2. AI 분석 패널 구현

기존 placeholder 영역을 실제 `AIAnalysisPanel` 컴포넌트로 교체했다.

표시 내용:

- 분석 제목
- 위험도 label
- summary
- tags
- warnings
- cookingNotes
- packingNotes
- deliveryNotes

분석 상태별 제목:

- `PENDING`: `AI 분석중`
- `FALLBACK`: `기본 키워드 분석 결과`
- `FAILED`: `AI 분석 실패`
- `COMPLETED`: `AI 분석`

주요 파일:

- `kds-web/src/main.tsx`

#### 3. 위험도별 UI 톤 구현

AI 분석 패널에 위험도/상태별 class를 부여하고 CSS를 추가했다.

표시 톤:

- `PENDING`: 회색 대기 상태
- `LOW`: 초록 계열 낮음 상태
- `MEDIUM`: 주황 계열 주의 상태
- `HIGH`: 붉은 계열 강한 경고 상태
- `FALLBACK`: 기본 키워드 분석임을 표시

주요 파일:

- `kds-web/src/styles.css`

#### 4. 사람 확인 필요 주문 버튼 문구 변경

`order.aiAnalysis.needsHumanCheck=true`인 `NEW` 주문은 버튼 문구를 변경했다.

```text
조리 시작 → 확인 후 조리 시작
```

주요 파일:

- `kds-web/src/main.tsx`

#### 5. 문서 업데이트

KDS Web README에 AI 분석 표시 범위를 추가했다.

주요 파일:

- `kds-web/README.md`

### 생성/수정한 주요 파일

- `kds-web/src/main.tsx`
- `kds-web/src/styles.css`
- `kds-web/README.md`
- `project-progress-log.md`

### 검증 결과

KDS Web build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
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

Mock Delivery API 회귀 테스트:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest -q
.venv/bin/python -m ruff check app tests
```

결과:

```text
3 passed, 1 warning
All checks passed!
```

브라우저 통합 검증:

1. Backend를 실행했다.
2. `견과류 알레르기`, `양상추 제외`, `벨 누르지 말아주세요` 요청이 들어간 주문 webhook을 전송했다.
3. KDS Web을 실행했다.
4. 브라우저에서 `http://127.0.0.1:5173/kds`를 열었다.

확인 결과:

```json
{
  "columns": ["신규1", "조리중0", "완료0"],
  "aiPanelClass": "ai-panel high",
  "aiTitle": "기본 키워드 분석 결과",
  "risk": "위험",
  "tags": ["배달요청", "알레르기위험", "재료제외", "조리요청"],
  "warnings": [
    "알레르기 또는 위험 요청이 있으므로 반드시 사람 확인 필요",
    "재료 제외 요청이 있으므로 조리 전 확인 필요"
  ],
  "button": "확인 후 조리 시작",
  "error": null
}
```

브라우저 screenshot capture도 수행했다.

### 트러블슈팅

#### 1. KDS 카드에 AI 분석 정보가 과하게 표시되는 문제

문제:

- KDS는 정신없는 주방에서 빠르게 확인해야 하는 화면인데, Step 6 최초 구현은 AI 분석 summary, tags, warnings, 조리/포장/배달 notes를 모두 표시했다.
- tags는 조리자가 바로 행동하는 데 꼭 필요하지 않고, summary와 notes/warnings 사이에 중복이 있었다.
- 배달 요청은 주방 KDS에서 처리할 정보가 아니므로 표시 우선순위가 낮다.

원인:

- AI 분석 결과를 검증/디버깅하기 쉬운 방향으로 그대로 노출했다.
- 실제 KDS 사용 맥락인 빠른 조리 판단, 위험 확인, 재료 제외 확인에 맞춰 충분히 압축하지 않았다.

해결:

- KDS 카드에서 배달 요청 블록을 제거했다.
- AI tags badge 표시를 제거했다.
- AI summary 표시를 제거했다. summary에는 배달 요청이 섞일 수 있고, 조리 notes/warnings와 중복될 수 있기 때문이다.
- AI 패널은 경고와 조리/포장 notes만 표시하도록 축소했다.
- 조리 관련 정보가 없을 때만 `조리 관련 특이사항 없음`을 짧게 표시한다.

검증:

- 브라우저 DOM 확인 결과 `배달 요청` 블록이 사라졌다.
- `.tag` 요소가 0개임을 확인했다.
- `문 앞`, `벨 누르지` 같은 배달 문장이 카드 텍스트에 남지 않는 것을 확인했다.
- 위험도, 경고, 조리 notes, `확인 후 조리 시작` 버튼은 유지되는 것을 확인했다.

검증 요약:

```json
{
  "requestBlocks": ["고객 요청"],
  "hasTags": 0,
  "hasDeliveryBlock": false,
  "hasDeliverySentence": false,
  "risk": "위험",
  "button": "확인 후 조리 시작",
  "error": null
}
```

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `deeporder-backend/.pytest_cache`
- `deeporder-backend/.ruff_cache`
- `deeporder-backend/app/__pycache__`
- `deeporder-backend/app/services/__pycache__`
- `deeporder-backend/tests/__pycache__`
- `mock-delivery-api/.pytest_cache`
- `mock-delivery-api/.ruff_cache`
- `mock-delivery-api/app/__pycache__`
- `mock-delivery-api/tests/__pycache__`
- `kds-web/dist`
- `kds-web/tsconfig.tsbuildinfo`

실행했던 Backend, KDS dev server, 브라우저 세션도 종료했다.

### 현재 남은 이슈

- KDS Web 자동화 테스트 파일은 아직 없다.
- `FAILED` 상태를 실제 실패 데이터로 브라우저 검증하지는 않았다.
- 실제 Gemini API 호출 결과를 KDS에 표시하는 통합 검증은 아직 하지 않았다.

### 다음 작업 결정

다음 작업은 `Step 7-1. Store/Menu/Option 데이터 모델과 API`로 바로 넘어가기 전에,
KDS AI 조리 요청사항 분석 계약을 먼저 재설계하는 것으로 결정했다.

결정 이유:

- 현재 코드베이스는 실행/테스트 상태가 안정적이다.
- KDS 분석 작업은 기존 Step 5/6 기반 코드가 있어 바로 착수 가능하다.
- Mock Delivery AI 주문 생성은 문서 기준으로 구현할 준비는 되었지만, Store/Menu/Option 모델부터 새로 쌓아야 하는 큰 작업이다.
- KDS 분석 계약을 먼저 확정해야 이후 Step 7에서 생성할 `ORDER_CREATED` payload의 `selectedOptions`, `mergedAllergens`, `excludedItems`를 어떤 방식으로 소비할지 명확해진다.

이번 작업 범위:

```text
Backend/KDS - AI 조리 요청사항 분석 재설계
```

예상 작업:

- `OrderAIAnalysis`에 `kitchenActions`, `packingActions`, `ignoredRequests` 기반 필드 추가
- Gemini/fallback 분석 결과를 `summary/tags/warnings` 중심에서 `kitchenActions` 중심으로 변경
- 고객 요청 원문은 분석 카드 안에 한 번만 표시
- 상세옵션으로 이미 표시되는 정보는 AI 분석 결과에 반복하지 않음
- 알레르기/제외/조리 요청을 액션 카드로 표시
- 알레르기 카드는 붉은색, 일반 조리요청 카드는 초록색으로 표시
- 배달 요청은 KDS 주방 화면에서 제외
- 테스트와 브라우저 검증 후 작업 내역 기록

## Backend/KDS - AI 조리 요청사항 분석 재설계 완료

진행일: 2026-06-03

### 작업 목적

KDS에서 고객 요청, AI 요약, 경고 문장, 조리 메모가 중복 표시되는 문제를 해결하고,
주방 작업자가 빠르게 확인할 수 있는 `조리 요청사항 분석` 카드로 재구성했다.

핵심 방향:

```text
긴 설명/중복 문장 제거
알레르기/제외/조리 요청을 action card로 표시
고객 요청 원문은 분석 카드 안에 한 번만 표시
배달 요청은 주방 KDS 화면에서 제외
```

### Backend 변경

- `OrderAIAnalysis`에 다음 JSON 필드를 추가했다.
  - `kitchen_actions`
  - `packing_actions`
  - `ignored_requests`
- `OrderAIAnalysisOut` 응답에 다음 camelCase 필드를 추가했다.
  - `kitchenActions`
  - `packingActions`
  - `ignoredRequests`
- Gemini AI Request Analyzer 프롬프트를 action 기반 JSON 스키마로 변경했다.
- AI 응답 모델에 다음 필드를 추가했다.
  - `kitchenActions`
  - `packingActions`
  - `ignoredRequests`
- fallback analyzer를 원문 복사 방식에서 action 추출 방식으로 변경했다.
- fallback analyzer가 다음 요청을 구조화하도록 했다.
  - `알레르기: 견과류`
  - `제외: 양상추`
  - `조리: 국물 많이`
  - `조리: 바싹 튀김`
  - 배달 요청은 `ignoredRequests`로 분류
- 상세옵션으로 이미 표시되는 `덜 맵게` 같은 옵션은 고객 요청 분석 action으로 반복하지 않도록 했다.
- 기존 `summary`, `tags`, `cookingNotes`, `warnings` 필드는 호환용으로 유지하되, KDS는 새 action 필드를 우선 사용하도록 설계했다.

### KDS Web 변경

- 기존 고객 요청 박스 표시를 제거했다.
- `AIAnalysisPanel`을 `조리 요청사항 분석` 카드로 변경했다.
- `kitchenActions`를 액션 칩으로 표시하도록 변경했다.
- 고객 요청 원문은 분석 카드 안의 `원문:` 줄에 한 번만 표시하도록 변경했다.
- 액션 타입별 색상을 적용했다.
  - `ALLERGY`, `SAFETY_CHECK`: 붉은색
  - `COOKING_REQUEST`, `TASTE_ADJUSTMENT`: 초록색
  - `EXCLUDE_INGREDIENT`: 주황색
- 위험도 텍스트 배지(`위험`, `주의`, `낮음`)는 제거했다.
- 분석 박스 자체의 위험도 배경색도 제거하고 중립 배경으로 통일했다.
- 의미 색상은 액션 카드에만 남겼다.
- `matchedMenuItemIds` 기반으로 메뉴 아이템 행에 알레르기 위험 스타일을 적용할 수 있도록 했다.
- KDS 화면에서 배달 요청과 긴 warning 문장이 노출되지 않도록 했다.

### 문서 변경

- 루트에 구현 지시서를 두 개로 분리 정리했다.
  - `mock-delivery-ai-order-generation-implementation-guide.md`
  - `kds-ai-action-analysis-implementation-guide.md`
- `docs/api.md`의 `aiAnalysis` 예시를 `kitchenActions` 기반으로 업데이트했다.
- `kds-web/README.md`의 KDS AI 표시 설명을 action card 기준으로 업데이트했다.

### 검증 결과

Backend 테스트 및 lint:

```bash
cd deeporder-backend
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
2 passed, 1 warning
All checks passed!
```

KDS Web build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
```

위험도 배지 제거 후 KDS Web build도 재실행했다.

결과:

```text
tsc -b && vite build 통과
```

Mock Delivery API 회귀 테스트 및 lint:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
3 passed, 1 warning
All checks passed!
```

브라우저 통합 검증:

1. Backend를 실행했다.
2. KDS Web을 실행했다.
3. 다음 고객 요청을 포함한 webhook 주문을 전송했다.

```plain text
양상추는 빼주시고 견과류 알레르기 있어요.
```

4. KDS Web에서 렌더링 결과를 확인했다.

확인 결과:

```json
{
  "actionChips": [
    {
      "text": "알레르기: 견과류",
      "className": "action-chip danger"
    },
    {
      "text": "제외: 양상추",
      "className": "action-chip exclude"
    }
  ],
  "originalRequest": "원문: 양상추는 빼주시고 견과류 알레르기 있어요.",
  "hasCustomerRequestBlock": false,
  "hasDeliveryText": false,
  "hasLongWarning": false,
  "button": "확인 후 조리 시작",
  "error": null
}
```

추가 UI 조정:

- 우측 위험도 배지 텍스트는 과한 중복 정보로 판단해 제거했다.
- 분석 박스 배경색도 위험도별로 바꾸지 않고 중립색으로 통일했다.
- 최종적으로 색상 정보는 `알레르기: 견과류`, `제외: 양상추`, `조리: 국물 많이` 같은 액션 카드에만 남겼다.

### 트러블슈팅

#### 1. 한국어 조사 때문에 제외 대상이 부정확해질 수 있는 문제

문제:

- fallback analyzer에서 `양상추는 빼주시고`를 분석할 때 정규식이 잘못 잡히면 대상이 `양상추는`처럼 조사까지 포함될 수 있었다.

해결:

- 조사 포함 패턴과 조사 없는 패턴을 분리했다.
- `양상추는 빼주시고`가 `제외: 양상추`로 추출되도록 수정했다.

#### 2. KDS 원문 라벨이 붙어 보이는 문제

문제:

- 브라우저 DOM 검증에서 원문 줄이 `원문양상추...` 또는 `원문:양상추...`처럼 붙어 보였다.

해결:

- 원문 라벨을 `원문:`으로 명확히 바꾸고, 라벨 뒤 공백을 명시적으로 추가했다.
- 최종 DOM 검증에서 `원문: 양상추는 빼주시고 견과류 알레르기 있어요.`로 확인했다.

#### 3. 검증용 서버 종료 명령에서 여러 PID 처리 문제

문제:

- 검증용 Backend/Vite 서버 종료 중 `kill`에 여러 PID가 한 번에 잘못 전달되어 zsh 경고가 발생했다.

해결:

- 포트별 LISTEN PID를 `lsof -tiTCP:$port -sTCP:LISTEN`으로 다시 조회하고 `xargs kill` 방식으로 종료했다.
- 이후 8000/5173 포트가 비어 있음을 확인했다.

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `deeporder-backend/.pytest_cache`
- `deeporder-backend/.ruff_cache`
- `deeporder-backend/app/__pycache__`
- `deeporder-backend/app/services/__pycache__`
- `deeporder-backend/tests/__pycache__`
- `mock-delivery-api/.pytest_cache`
- `mock-delivery-api/.ruff_cache`
- `mock-delivery-api/app/__pycache__`
- `mock-delivery-api/tests/__pycache__`
- `kds-web/dist`
- `kds-web/tsconfig.tsbuildinfo`

검증용 Backend, KDS dev server, 브라우저 세션도 종료했다.

### 현재 남은 이슈

- 실제 Gemini API 호출 결과로 action 기반 응답을 받는 통합 검증은 아직 하지 않았다.
- `matchedMenuItemIds` 기반 메뉴 위험 표시는 프론트 스타일과 연결해두었지만, 현재 Mock Delivery payload에는 메뉴별 `mergedAllergens`가 아직 없어 실제 매칭 데이터 검증은 Step 7 이후 가능하다.
- KDS Web 전용 자동화 테스트 파일은 아직 없다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 7-1. Store/Menu/Option 데이터 모델과 API
```

예상 작업:

- Mock Delivery API에 Store/Menu/OptionGroup/Option 모델 추가
- Store/Menu/OptionGroup/Option Pydantic schema 추가
- Store/Menu/OptionGroup/Option API 구현
- MAIN/SET에만 OptionGroup을 허용하는 검증 추가
- SIDE/DRINK에 OptionGroup 생성 시 실패하도록 처리

## Step 7-1. Store/Menu/Option 데이터 모델과 API 시작

진행일: 2026-06-03

### 작업 목적

Mock Delivery API에 AI 주문 생성을 위한 메뉴 카탈로그 기반을 추가한다.

이번 Step의 범위:

```text
Store
Menu
OptionGroup
Option
```

이번 Step에서 구현할 것:

- Store/Menu/OptionGroup/Option SQLAlchemy 모델
- Store/Menu/OptionGroup/Option Pydantic schema
- Store/Menu/OptionGroup/Option REST API
- MAIN/SET 메뉴에만 OptionGroup 생성 허용
- SIDE/DRINK 메뉴에 OptionGroup 생성 시 400 오류 반환
- linkedMenuId가 같은 store의 메뉴인지 검증

이번 Step에서 아직 구현하지 않을 것:

- Console 메뉴/옵션 관리 화면
- Seed 치킨집 데이터
- order_validator
- order_builder
- fallback_order_generator
- Gemini 주문 생성 provider
- AI generate/generate-and-send API

## Step 7-1. Store/Menu/Option 데이터 모델과 API 완료

진행일: 2026-06-03

### 작업 목적

Mock Delivery API에 AI 주문 생성을 위한 메뉴 카탈로그 기반을 추가했다.

이번 Step에서는 주문 생성 AI 자체가 아니라, AI 주문 생성이 사용할 Store/Menu/OptionGroup/Option 데이터를 저장하고 관리하는 API를 구현했다.

### 구현 내용

#### 1. SQLAlchemy 모델 추가

`mock-delivery-api/app/models.py`에 다음 모델과 enum을 추가했다.

- `Store`
- `Menu`
- `OptionGroup`
- `Option`
- `MenuType`
  - `MAIN`
  - `SET`
  - `SIDE`
  - `DRINK`
- `OptionSelectionType`
  - `RADIO`
  - `CHECKBOX`
- `OptionEffect`
  - `ADD`
  - `EXCLUDE`
  - `REPLACE`
  - `NOTE`
  - `NONE`

주요 제약:

- `Store.store_id`는 unique/index 처리했다.
- `Menu`는 store별 `menu_id` unique 제약을 가진다.
- `OptionGroup`은 store/menu별 `group_id` unique 제약을 가진다.
- `Option`은 store/group별 `option_id` unique 제약을 가진다.

#### 2. Pydantic schema 추가

`mock-delivery-api/app/schemas.py`에 다음 schema를 추가했다.

- `StoreCreate`
- `StoreResponse`
- `MenuCreate`
- `MenuUpdate`
- `MenuResponse`
- `QuantityRule`
- `OptionGroupCreate`
- `OptionGroupUpdate`
- `OptionGroupResponse`
- `OptionCreate`
- `OptionUpdate`
- `OptionResponse`

검증:

- `QuantityRule`은 `min <= default <= max`를 검증한다.
- `OptionGroupCreate`는 `maxSelect >= minSelect`를 검증한다.
- `required=true`이면 `minSelect >= 1`이어야 한다.

#### 3. Catalog API 추가

`mock-delivery-api/app/catalog.py`를 추가하고 `app.main`에 라우터를 연결했다.

추가한 API:

```text
GET /api/mock/stores
POST /api/mock/stores
GET /api/mock/stores/{store_id}/menus
POST /api/mock/stores/{store_id}/menus
GET /api/mock/stores/{store_id}/menus/{menu_id}
PUT /api/mock/stores/{store_id}/menus/{menu_id}
DELETE /api/mock/stores/{store_id}/menus/{menu_id}
POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups
PUT /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}
DELETE /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}
POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options
PUT /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}
DELETE /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}
```

동작:

- Store 생성 시 순차 store ID 형식을 생성한다.
- Menu 생성 시 store별 `MENU_001`, `MENU_002` 형식의 ID를 생성한다.
- OptionGroup 생성 시 menu별 `GROUP_001` 형식의 ID를 생성한다.
- Option 생성 시 group별 `OPTION_001` 형식의 ID를 생성한다.
- delete API는 실제 삭제 대신 `available=false` 처리한다.
- 메뉴 상세 응답은 `optionGroups`와 `options`를 포함한다.

#### 4. 핵심 검증 규칙 구현

- `MAIN`, `SET` 메뉴만 OptionGroup을 가질 수 있다.
- `SIDE`, `DRINK` 메뉴에 OptionGroup을 생성하면 400 오류를 반환한다.
- `linkedMenuId`는 같은 store의 `available=true` 메뉴만 허용한다.
- 존재하지 않는 Store/Menu/OptionGroup/Option은 404를 반환한다.

### 문서 변경

- `docs/api.md`에 Catalog API 목록과 요청 예시를 추가했다.
- `mock-delivery-api/README.md`에 Store/Menu catalog setup 예시를 추가했다.

### 테스트 추가

`mock-delivery-api/tests/test_mock_orders.py`에 다음 테스트를 추가했다.

- Store 생성
- MAIN 메뉴 생성
- SIDE 메뉴 생성
- MAIN 메뉴에 OptionGroup 생성
- Option 생성
- linkedMenuName 응답 확인
- 메뉴 상세에서 OptionGroup/Option nested 응답 확인
- DRINK 메뉴에 OptionGroup 생성 시 400 오류 확인

### 검증 결과

Mock Delivery API 테스트 및 lint:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
5 passed, 1 warning
All checks passed!
```

DeepOrder Backend 회귀 테스트 및 lint:

```bash
cd deeporder-backend
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
2 passed, 1 warning
All checks passed!
```

KDS Web build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
```

### 트러블슈팅

이번 Step에서 별도 트러블슈팅이 필요한 문제는 없었다.

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `deeporder-backend/.pytest_cache`
- `deeporder-backend/.ruff_cache`
- `deeporder-backend/app/__pycache__`
- `deeporder-backend/app/services/__pycache__`
- `deeporder-backend/tests/__pycache__`
- `mock-delivery-api/mock_delivery.db`
- `mock-delivery-api/.pytest_cache`
- `mock-delivery-api/.ruff_cache`
- `mock-delivery-api/app/__pycache__`
- `mock-delivery-api/tests/__pycache__`
- `kds-web/dist`
- `kds-web/tsconfig.tsbuildinfo`

### 현재 남은 이슈

- Console 메뉴/옵션 관리 화면은 아직 없다.
- Seed 치킨집 데이터는 아직 없다.
- Store/Menu/Option API는 구현됐지만, AI 주문 생성에 연결되는 `order_validator`, `order_builder`는 아직 없다.
- linkedMenuId 해제 업데이트는 아직 명시적인 clear 동작을 제공하지 않는다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 7-2. Console 메뉴/옵션 관리 화면
```

예상 작업:

- Mock Delivery Console에서 Store 목록/선택 UI 추가
- Store별 Menu 목록 화면 추가
- Menu 생성/수정/비활성화 폼 추가
- MAIN/SET 메뉴에 OptionGroup/Option 관리 UI 추가
- SIDE/DRINK 메뉴에서는 OptionGroup 관리 UI 숨김

## Step 7-2. Console 메뉴/옵션 관리 화면 시작

진행일: 2026-06-03

### 작업 목적

Step 7-1에서 구현한 Store/Menu/OptionGroup/Option API를 Mock Delivery Console에서 직접 관리할 수 있도록 한다.

이번 Step에서 구현할 것:

- Console에서 Store 생성/목록/선택
- 선택 Store의 Menu 목록 조회
- Menu 생성
- Menu 상세 선택
- MAIN/SET 메뉴에 OptionGroup 생성
- OptionGroup에 Option 생성
- SIDE/DRINK 메뉴에서는 OptionGroup 생성 UI를 숨김

이번 Step에서 아직 구현하지 않을 것:

- 메뉴/옵션 수정 전용 폼 고도화
- Seed 치킨집 데이터
- AI 주문 생성 화면

## Step 7-2. Console 메뉴/옵션 관리 화면 완료

진행일: 2026-06-03

### 작업 목적

Step 7-1에서 구현한 Store/Menu/OptionGroup/Option API를 Mock Delivery Console에서 직접 사용할 수 있도록 관리 화면을 추가했다.

### 구현 내용

#### 1. Console HTML 확장

`mock-delivery-api/app/templates/console.html`에 `메뉴/옵션 관리` 섹션을 추가했다.

추가한 화면 요소:

- Store 생성 폼
- Store 목록/선택 영역
- Menu 생성 폼
- Menu 목록/선택 영역
- Menu 상세 영역
- OptionGroup 생성 폼
- Option 생성 폼
- Store -> Menu -> Option 순서가 보이는 3단 관리 구조
- Store/Menu 개수 표시
- 선택된 Store/Menu 상태 표시
- MAIN/SET 메뉴에서만 Option 편집 영역 표시
- SIDE/DRINK 메뉴에서는 Option 편집 영역 숨김 및 안내 문구 표시

기존 주문 생성/전송, payload preview, webhook log 화면은 유지했다.

#### 2. Console 스타일 추가

`mock-delivery-api/app/static/console.css`에 카탈로그 관리 UI 스타일을 추가했다.

추가한 스타일:

- 3열 catalog grid
- Store/Menu list item
- 선택된 list item active 스타일
- Menu detail box
- OptionGroup card
- Option row
- label 기반 form field 레이아웃
- Menu type, selection type, option effect 한글 표시
- 알레르기 meta pill 강조
- Option 편집 카드 분리
- 반응형 1열 전환

#### 3. Console JavaScript 확장

`mock-delivery-api/app/static/console.js`에서 Catalog API를 호출하도록 확장했다.

추가한 동작:

- Console 로드 시 Store 목록 조회
- Store 생성
- Store 선택 시 Menu 목록 조회
- Menu 생성
- Menu 선택 시 상세/OptionGroup/Option 렌더링
- MAIN/SET 메뉴 선택 시 OptionGroup/Option 생성 폼 표시
- SIDE/DRINK 메뉴 선택 시 OptionGroup/Option 생성 폼 숨김
- Option 생성 시 같은 store의 SIDE/DRINK 메뉴를 linkedMenu 후보로 표시

#### 4. 테스트 보강

`mock-delivery-api/tests/test_mock_orders.py`의 Console 렌더링 테스트를 보강했다.

추가 확인:

- `메뉴/옵션 관리` 문구 렌더링
- `Store 추가` 버튼 렌더링
- `Menu 추가` 버튼 렌더링
- `OptionGroup 추가` 버튼 렌더링

#### 5. 문서 업데이트

`mock-delivery-api/README.md`에 Console이 Store/Menu/OptionGroup/Option catalog data를 관리할 수 있음을 추가했다.

### 브라우저 검증

검증용 Mock Delivery API를 `http://127.0.0.1:8011`에서 실행했다.

브라우저에서 다음 흐름을 확인했다.

1. Console 열기
2. Store 생성
3. MAIN 메뉴 `양념치킨` 생성
4. SIDE 메뉴 `치킨무` 생성
5. MAIN 메뉴에 OptionGroup `요청사항` 생성
6. Option `치킨무 X` 생성
7. MAIN 메뉴 선택 시 OptionGroup/Option이 상세에 표시되는지 확인
8. SIDE 메뉴 선택 시 OptionGroup/Option 생성 폼이 숨겨지는지 확인

검증 결과:

```json
{
  "hasCatalog": true,
  "hasStore": true,
  "hasMenu": true,
  "mainMenuDetailHasOption": true,
  "sideMenuGroupFormHidden": true,
  "sideMenuOptionFormHidden": true,
  "linkedOptions": ["linkedMenu 없음", "치킨무"]
}
```

이후 사용자 피드백을 반영해 Console UI를 다시 정리하고, 깨끗한 DB 상태에서 `http://127.0.0.1:8012/console`로 재검증했다.

재검증은 API 직접 호출이 아니라 Console 화면의 실제 form submit handler를 타도록 진행했다.

재검증 흐름:

1. 새 DB 상태에서 Console 열기
2. Store `검증 치킨집` 생성
3. MAIN 메뉴 `양념치킨` 생성
4. SIDE 메뉴 `치킨무` 생성
5. MAIN 메뉴에 OptionGroup `요청사항` 생성
6. Option `치킨무 X` 생성
7. MAIN 메뉴 상세에서 알레르기, OptionGroup, Option 표시 확인
8. SIDE 메뉴 선택 시 Option 편집 영역 숨김 확인

재검증 결과:

```json
{
  "storeCount": "1",
  "menuCount": "2",
  "selectedStore": "STORE_FLAT",
  "selectedMenu": "양념치킨 선택",
  "detailHasAllergens": true,
  "detailHasOption": true,
  "optionEditorHiddenForMain": false,
  "optionFormHiddenForMain": false,
  "linkedMenuOptions": ["linkedMenu 없음", "치킨무"],
  "sideMenuOptionEditorHidden": true,
  "sideMenuGroupFormHidden": true,
  "sideMenuOptionFormHidden": true
}
```

브라우저에서 `.catalog-panel` 스크린샷도 캡처해 시각적으로 화면 구성이 무너지지 않는지 확인했다.

### 검증 결과

Mock Delivery API 테스트 및 lint:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
5 passed, 1 warning
All checks passed!
```

DeepOrder Backend 회귀 테스트 및 lint:

```bash
cd deeporder-backend
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
2 passed, 1 warning
All checks passed!
```

KDS Web build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
```

### 트러블슈팅

#### 1. 8001 포트가 이미 사용 중인 문제

문제:

- Console 브라우저 검증을 위해 `mock-delivery-api`를 8001 포트로 실행하려 했지만, 이미 사용 중이라 서버가 뜨지 않았다.

해결:

- 기존 프로세스를 임의 종료하지 않고 검증용으로 8011 포트를 사용했다.
- 브라우저에서 `http://127.0.0.1:8011/console`로 접속해 검증했다.
- 검증 후 8011 LISTEN 프로세스를 종료했다.

#### 2. 브라우저 자동화 중 reload로 execution context가 사라진 문제

문제:

- 브라우저 검증 중 `location.reload()`를 포함한 evaluate가 navigation으로 인해 execution context를 잃었다.

해결:

- 데이터 생성은 API 호출로 유지하고, reload 이후 별도 evaluate로 DOM 상태를 다시 확인했다.
- 이후 메뉴 선택 동작도 DOM click 후 별도 상태 확인으로 나눠 검증했다.

#### 3. Console UI가 실제 관리 화면으로 보기 어려운 문제

문제:

- 최초 구현은 API 입력 필드를 단순히 나열한 형태라 Store/Menu/Option의 관계가 한눈에 보이지 않았다.
- select, checkbox, input이 서로 어긋나 보였고, 현재 선택 상태와 다음 작업이 명확하지 않았다.
- 사용자가 보기에는 동작 여부를 판단하기 어려운 화면이었다.

해결:

- `Store -> Menu -> Option` 순서가 드러나는 3단 관리 구조로 재정리했다.
- Store/Menu 개수와 선택된 Store/Menu 상태를 상단에 표시했다.
- 모든 입력 필드에 label을 붙이고, Menu type/Option effect/Selection type을 한글 표시로 바꿨다.
- MAIN/SET 메뉴일 때만 Option 편집 카드를 보여주고, SIDE/DRINK 메뉴는 Option 편집을 숨기도록 명확히 분리했다.
- Menu 상세에 알레르기, 옵션 그룹, 옵션을 meta pill/card 형태로 표시했다.

#### 4. 검증 기준이 부족했던 문제

문제:

- 최초 완료 보고에서는 API/DOM 상태 위주로 확인했고, 실제 화면 품질까지 충분히 검증하지 못했다.
- 이전 검증에서 생성된 DB 데이터가 남아 있어 재검증 결과에 불필요한 Store/Menu가 섞였다.

해결:

- `mock_delivery.db`를 삭제해 깨끗한 상태에서 서버를 다시 실행했다.
- Console의 실제 form submit handler를 통해 Store/Menu/OptionGroup/Option 생성 흐름을 다시 검증했다.
- 브라우저 캡처를 통해 화면 구성이 깨지지 않는지도 확인했다.

### 정리한 생성물

검증 과정에서 생성된 로컬 파일은 작업물에 포함되지 않도록 삭제했다.

- `deeporder-backend/deeporder.db`
- `deeporder-backend/.pytest_cache`
- `deeporder-backend/.ruff_cache`
- `deeporder-backend/app/__pycache__`
- `deeporder-backend/app/services/__pycache__`
- `deeporder-backend/tests/__pycache__`
- `mock-delivery-api/mock_delivery.db`
- `mock-delivery-api/.pytest_cache`
- `mock-delivery-api/.ruff_cache`
- `mock-delivery-api/app/__pycache__`
- `mock-delivery-api/tests/__pycache__`
- `kds-web/dist`
- `kds-web/tsconfig.tsbuildinfo`

검증용 브라우저 세션과 8011/8012 서버도 종료했다.

### 현재 남은 이슈

- 메뉴/옵션 수정 전용 UI는 아직 없다. 현재는 생성/목록/상세 확인 중심이다.
- OptionGroup/Option 비활성화 버튼은 아직 Console에 없다.
- Seed 치킨집 데이터는 아직 없다.
- Console AI 주문 테스트 화면은 아직 없다.

### 다음 Step

다음으로 진행할 작업:

```text
Step 7-3. Seed 치킨집 데이터
```

예상 작업:

- 샘플 치킨집 Store/Menu/OptionGroup/Option seed 데이터 작성
- 서버 시작 시 또는 Console 버튼으로 seed 로딩할 수 있는 기능 구현
- MAIN/SET/SIDE/DRINK 샘플 메뉴 구성
- 알레르기 정보와 옵션 effect가 포함된 샘플 데이터 구성

## Step 7-2. Console 메뉴/옵션 관리 화면 UX 재설계 보완

진행일: 2026-06-05

### 보완 배경

기존 Step 7-2 Console 화면은 기능 입력 필드를 나열한 수준에 가까웠다.

사용자 관점에서 문제가 있었다.

- 현재 무엇을 입력하고 있는지 판단하기 어려웠다.
- Store/Menu/OptionGroup/Option을 추가한 뒤 무엇이 반영되었는지 즉시 보이지 않았다.
- 수직 입력 폼 위주라 넓은 화면을 제대로 활용하지 못했다.

특히 “입력 후 무엇이 추가되었는지, 반영되었는지 볼 수 없음”이 가장 큰 문제였으므로, 입력 폼 중심이 아니라 결과 확인 중심으로 재설계했다.

### 구현 내용

`mock-delivery-api/app/templates/console.html`의 `메뉴/옵션 관리` 영역을 재구성했다.

변경한 화면 구조:

```text
왼쪽: Store/Menu 목록과 선택
오른쪽: Menu 추가 폼, 선택 메뉴 상세, OptionGroup/Option 편집
```

구체적인 변경:

- `catalog-layout` 좌우 분할 구조 추가
- `catalog-sidebar`에 Store 목록과 Menu 목록 배치
- `catalog-workspace`에 Menu 추가 폼과 선택 메뉴 상세 배치
- `catalog-feedback`을 추가해 생성 완료/오류 메시지를 카탈로그 영역 상단에 표시
- Store/Menu 개수를 `0개`, `1개`처럼 명확히 표시
- 추가된 Store/Menu가 목록에 즉시 나타나고 선택 상태가 보이도록 구성
- 선택된 Menu의 상세에 가격, 타입, 알레르기, 옵션 그룹, 옵션이 즉시 표시되도록 구성
- MAIN/SET 메뉴에서만 Option 편집 영역 표시
- SIDE/DRINK 메뉴 선택 시 Option 편집 영역을 숨기고 안내 문구 표시

`mock-delivery-api/app/static/console.css`를 재정리했다.

추가/변경한 스타일:

- 좌우 분할 레이아웃
- Store/Menu 결과 목록 카드
- 선택된 목록 항목 강조
- 방금 추가된 항목 `is-new` 강조 애니메이션
- 선택 메뉴 상세 카드
- 옵션 그룹/옵션 결과 카드
- Menu 추가 폼은 수평 배치, Option 편집 폼은 작업 카드로 분리
- 모바일/좁은 화면에서는 1열로 전환

`mock-delivery-api/app/static/console.js`를 보강했다.

추가한 동작:

- `catalogFeedback` 메시지 업데이트
- `recentlyCreated` 상태 추가
- Store/Menu/OptionGroup/Option 생성 후 방금 추가된 항목 강조
- Menu 목록에 내부 enum 대신 한글 타입 표시
- OptionGroup/Option 상세에 생성 결과 즉시 표시

### 브라우저 검증

검증용 Mock Delivery API를 `http://127.0.0.1:8013`에서 실행했다.

깨끗한 DB 상태에서 Console의 실제 form submit handler를 사용해 검증했다.

검증 흐름:

1. Console 초기 진입
2. Store `검증 치킨집` 생성
3. MAIN 메뉴 `양념치킨` 생성
4. SIDE 메뉴 `치킨무` 생성
5. MAIN 메뉴에 OptionGroup `요청사항` 생성
6. Option `치킨무 X` 생성
7. SIDE 메뉴 선택

검증 결과:

```json
{
  "layoutColumns": "433.828px 842.172px",
  "hasSidebar": true,
  "hasWorkspace": true,
  "afterStore": {
    "feedback": "Store 추가 완료: 검증 치킨집 (STORE_FLAT)",
    "storeCount": "1개",
    "newStoreHighlighted": true
  },
  "afterMainMenu": {
    "feedback": "Menu 추가 완료: 양념치킨 (MENU_001)",
    "menuCount": "1개",
    "selectedMenu": "양념치킨 선택",
    "newMenuHighlighted": true,
    "detailIncludesAllergens": true
  },
  "afterOption": {
    "feedback": "Option 추가 완료: 치킨무 X (OPTION_001)",
    "menuCount": "2개",
    "detailIncludesOption": true,
    "optionHighlighted": true,
    "linkedMenuOptions": ["linkedMenu 없음", "치킨무"],
    "optionEditorHidden": false
  },
  "afterSideSelect": {
    "selectedMenu": "치킨무 선택",
    "optionEditorHidden": true
  }
}
```

`.catalog-panel` 스크린샷을 캡처해 좌우 배치가 유지되고 결과 목록/상세 영역이 보이는 것도 확인했다.

### 검증 결과

Mock Delivery API 테스트 및 lint:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
5 passed, 1 warning
All checks passed!
```

KDS Web build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
```

### 트러블슈팅

#### 1. 기존 Console 렌더링 테스트가 옛 버튼 문구에 의존한 문제

문제:

- UI를 재설계하면서 Store 생성 버튼 문구를 `Store 추가`에서 `추가`로 단순화했다.
- 기존 테스트는 `Store 추가` 문자열을 직접 검증하고 있어 실패했다.

해결:

- 테스트 기준을 단일 버튼 문구가 아니라 새 화면 구조가 렌더링되는지 확인하도록 수정했다.
- `왼쪽에서 Store와 Menu를 선택`, `Menu 추가`, `선택 메뉴 구성`, `OptionGroup 추가`를 확인하도록 변경했다.

#### 2. 입력 결과가 보이지 않는 UI 구조 문제

문제:

- 기존 화면은 사용자가 입력한 결과가 어디에 반영되었는지 즉시 판단하기 어려웠다.

해결:

- Store/Menu 목록을 왼쪽에 항상 노출했다.
- 선택 메뉴 상세를 오른쪽에 고정해 Menu/OptionGroup/Option 생성 결과가 즉시 보이도록 했다.
- 생성 직후 `catalog-feedback` 메시지와 `is-new` 강조로 방금 추가된 항목을 표시했다.

## Step 7-2. Console 메뉴/옵션 관리 화면 3열 보드 재수정

진행일: 2026-06-05

### 보완 배경

2열 보완 후에도 실제 사용자 화면에서는 여전히 Store와 Menu가 위아래로 쌓여 보여 수직 지향 UI처럼 느껴졌다.

원인:

- Store/Menu가 같은 왼쪽 영역 내부에 수직으로 쌓여 있었다.
- 920px 이하에서 전체 catalog layout이 너무 빨리 1열로 접혔다.
- 브라우저가 기존 `/static/console.css`를 캐시하면 최신 CSS가 반영되지 않은 것처럼 보일 수 있었다.

### 구현 내용

`mock-delivery-api/app/templates/console.html`:

- `Store`, `Menu`, `선택 메뉴 구성`을 독립 컬럼으로 분리했다.
- Menu 추가 폼을 Menu 컬럼으로 이동했다.
- 선택 메뉴 구성 컬럼은 메뉴 상세와 OptionGroup/Option 편집만 담당하도록 정리했다.
- CSS/JS static URL에 query version을 추가해 브라우저 캐시 가능성을 끊었다.

```html
<link rel="stylesheet" href="/static/console.css?v=20260605-ux3" />
<script src="/static/console.js?v=20260605-ux3"></script>
```

`mock-delivery-api/app/static/console.css`:

- 데스크톱에서 `Store | Menu | 선택 메뉴 구성` 3열 보드로 표시한다.
- 중간 폭에서는 `Store | Menu`를 같은 행에 유지하고, 선택 메뉴 구성만 아래로 내려간다.
- 760px 이하의 정말 좁은 화면에서만 1열로 접는다.

레이아웃 기준:

```text
desktop: 300px | 360px | 1fr
medium: Store | Menu, 아래에 선택 메뉴 구성
mobile: 1열
```

### 브라우저 검증

검증용 Mock Delivery API를 `http://127.0.0.1:8015`에서 실행했다.

1600px viewport 검증 결과:

```json
{
  "cssHref": "http://127.0.0.1:8015/static/console.css?v=20260605-ux3",
  "layoutColumns": "300px 360px 822px",
  "storeRect": { "x": 43, "y": 353, "width": 300 },
  "menuRect": { "x": 359, "y": 353, "width": 360 },
  "workspaceRect": { "x": 735, "y": 353, "width": 822 },
  "sameRow": true
}
```

1000px viewport 검증 결과:

```json
{
  "layoutColumns": "399.109px 498.891px",
  "storeMenuSameRow": true,
  "workspaceBelow": true
}
```

즉, 큰 화면에서는 3열, 중간 화면에서는 Store/Menu 2열과 선택 구성 영역 하단 배치로 동작한다.

### 검증 결과

Mock Delivery API 테스트 및 lint:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
5 passed, 1 warning
All checks passed!
```

### 트러블슈팅

#### 1. 실제 화면에서 여전히 수직으로 보인 문제

문제:

- Store/Menu가 같은 sidebar 안에서 위아래로 배치되어 있어, 전체적으로는 개선됐더라도 사용자 체감상 수직 폼처럼 보였다.

해결:

- Store 컬럼, Menu 컬럼, 선택 메뉴 구성 컬럼을 분리한 3열 보드로 변경했다.
- Menu 추가 폼을 Menu 컬럼 안으로 이동해 “입력한 Menu가 바로 아래 목록에 추가된다”는 관계를 명확히 했다.

#### 2. 반응형 기준이 너무 빨리 1열로 접힌 문제

문제:

- 기존 `@media (max-width: 920px)` 기준 때문에 사용자가 보는 중간 폭 화면에서 전체 catalog가 수직으로 접힐 수 있었다.

해결:

- 전체 1열 전환 기준을 `760px`로 낮췄다.
- `1180px` 이하에서는 Store/Menu는 같은 행으로 유지하고 선택 메뉴 구성만 아래로 이동하도록 했다.

#### 3. 정적 파일 캐시 가능성

문제:

- HTML은 바뀌었지만 CSS가 캐시되면 화면이 이전 레이아웃처럼 보일 수 있다.

해결:

- `console.css`와 `console.js` URL에 version query를 추가했다.

## Step 7-2. Console Store 추가 오류 수정

진행일: 2026-06-05

### 문제

Console에서 Store를 추가하면 다음 오류가 표시됐다.

```text
Unexpected token 'I', "Internal S"... is not valid JSON
```

이 오류는 실제 원인을 보여주는 메시지가 아니었다.

원인:

- 서버가 `500 Internal Server Error` plain text 응답을 반환했다.
- Console JS의 `readJson()`이 모든 응답을 무조건 `response.json()`으로 파싱했다.
- 그 결과 실제 서버 오류 대신 JSON 파싱 오류가 화면에 표시됐다.

추가로 확인한 실제 서버 원인:

- 기존 로컬 `mock_delivery.db`에 오래된 `stores` 테이블이 있을 수 있다.
- SQLAlchemy `create_all()`은 기존 테이블에 새 컬럼을 추가하지 않는다.
- `stores.platform`, `stores.available`, timestamp 컬럼 등이 없는 DB에서 Store 생성 시 서버 오류가 발생할 수 있다.

### 구현 내용

#### 1. SQLite 개발용 스키마 보정 추가

`mock-delivery-api/app/database.py`에 `_ensure_sqlite_dev_schema()`를 추가했다.

역할:

- SQLite 사용 시 기존 로컬 DB의 catalog table 컬럼을 확인한다.
- 누락된 additive column을 `ALTER TABLE ... ADD COLUMN`으로 보정한다.
- Alembic을 아직 도입하지 않은 Mock API prototype 단계에서 로컬 테스트 DB가 깨지는 것을 막는다.

보정 대상:

- `stores`
- `menus`
- `option_groups`
- `options`

주의:

- SQLite는 기존 row가 있는 테이블에 `DEFAULT CURRENT_TIMESTAMP` 컬럼을 추가할 수 없다.
- 따라서 보정용 timestamp default는 상수값 `'1970-01-01 00:00:00'`을 사용했다.
- 새 DB는 기존 SQLAlchemy 모델 정의에 따라 `CURRENT_TIMESTAMP` server default를 사용한다.

#### 2. Console 에러 처리 개선

`mock-delivery-api/app/static/console.js`의 `readJson()`을 수정했다.

변경 전:

```text
모든 응답을 response.json()으로 파싱
```

변경 후:

```text
content-type이 application/json인지 확인
JSON 오류면 detail 표시
plain text 오류면 HTTP status와 본문 표시
정상 응답이 JSON이 아니면 명시적 오류 표시
```

이제 서버가 plain text 500을 반환하더라도 `Unexpected token` 대신 다음과 같은 형태로 표시된다.

```text
요청 실패: HTTP 500 Internal Server Error
```

#### 3. Static cache version 갱신

프론트 JS가 바뀌었으므로 static query version을 갱신했다.

```html
<link rel="stylesheet" href="/static/console.css?v=20260605-ux4" />
<script src="/static/console.js?v=20260605-ux4"></script>
```

### 테스트 보강

`mock-delivery-api/tests/test_mock_orders.py`에 레거시 DB 보정 테스트를 추가했다.

테스트 내용:

- 오래된 `stores` 테이블을 직접 생성한다.
- 기존 row가 이미 들어있는 상태를 만든다.
- `_ensure_sqlite_dev_schema()`를 실행한다.
- `platform`, `available`, `created_at`, `updated_at` 컬럼이 추가되는지 확인한다.
- 기존 row에도 기본값이 채워지는지 확인한다.
- 보정 후 새 Store row 삽입이 가능한지 확인한다.

### 수동 검증

실제 레거시 DB를 만들어 서버를 실행했다.

레거시 DB 생성:

```sql
CREATE TABLE stores (
  id INTEGER PRIMARY KEY,
  store_id VARCHAR(64),
  store_name VARCHAR(120)
);

INSERT INTO stores (store_id, store_name)
VALUES ('STORE_FLAT', '오래된 매장');
```

서버 실행 후 Store 추가 API 호출:

```bash
curl -i -X POST http://127.0.0.1:8017/api/mock/stores \
  -H 'Content-Type: application/json' \
  -d '{"storeName":"레거시 DB 검증"}'
```

결과:

```text
HTTP/1.1 201 Created
{"storeId":"STORE_002","storeName":"레거시 DB 검증","platform":"MOCK_DELIVERY","available":true}
```

브라우저 Console에서도 Store 추가를 검증했다.

검증 결과:

```json
{
  "feedback": "Store 추가 완료: 브라우저 검증 매장 (STORE_003)",
  "feedbackIsError": false,
  "status": "Store가 추가되었습니다. STORE_003",
  "storeCount": "3개",
  "hasUnexpectedToken": false,
  "layoutColumns": "300px 360px 822px"
}
```

### 검증 결과

Mock Delivery API 테스트 및 lint:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
6 passed, 1 warning
All checks passed!
```

KDS Web build:

```bash
npm --workspace kds-web run build
```

결과:

```text
tsc -b && vite build 통과
```

### 트러블슈팅

#### 1. `Unexpected token` 오류가 실제 원인을 가린 문제

문제:

- 서버 500 응답이 JSON이 아닌 plain text였는데, 프론트에서 JSON으로 파싱해 엉뚱한 오류가 표시됐다.

해결:

- `readJson()`에서 content-type을 확인하고 JSON/plain text 오류를 분리 처리했다.

#### 2. 레거시 SQLite DB 스키마 문제

문제:

- 기존 row가 있는 오래된 `stores` 테이블에 timestamp 컬럼을 `DEFAULT CURRENT_TIMESTAMP`로 추가하려 하면 SQLite가 `Cannot add a column with non-constant default` 오류를 낸다.

해결:

- 개발용 스키마 보정에서는 timestamp default를 상수값으로 추가했다.
- 해당 조건을 테스트로 고정했다.

## Step 7-2. OptionGroup 필수 선택값 UX 수정

진행일: 2026-06-05

### 문제

Console에서 OptionGroup을 추가할 때 다음 오류가 발생했다.

```json
[
  {
    "type": "value_error",
    "loc": ["body"],
    "msg": "Value error, required option group must have minSelect >= 1.",
    "input": {
      "groupName": "음료",
      "selectionType": "RADIO",
      "required": true,
      "minSelect": 0,
      "maxSelect": 1
    }
  }
]
```

원인:

- 백엔드 검증은 올바르다. 필수 옵션 그룹이면 최소 선택 수가 1 이상이어야 한다.
- 하지만 Console UI는 `필수` 체크박스를 켜도 `minSelect` 값을 0으로 둔 채 제출할 수 있었다.
- 사용자가 잘못된 조합을 쉽게 만들 수 있는 UI였다.

### 구현 내용

`mock-delivery-api/app/static/console.js`를 수정했다.

추가한 동작:

- `groupRequiredInput` change 이벤트 추가
- `groupMinInput` input 이벤트 추가
- `필수=true`이고 `minSelect < 1`이면 자동으로 `minSelect=1`로 조정
- 제출 직전에도 `minSelect`와 `maxSelect`를 한 번 더 보정
- `maxSelect < minSelect`이면 `maxSelect`를 `minSelect`로 맞춤
- 자동 보정 시 `catalogFeedback`에 안내 메시지 표시

정적 파일 캐시 회피를 위해 version query도 갱신했다.

```html
<link rel="stylesheet" href="/static/console.css?v=20260605-ux5" />
<script src="/static/console.js?v=20260605-ux5"></script>
```

### 브라우저 검증

검증용 Mock Delivery API를 `http://127.0.0.1:8018`에서 실행했다.

재현 조건:

```json
{
  "groupName": "음료",
  "selectionType": "RADIO",
  "required": true,
  "minSelect": 0,
  "maxSelect": 1
}
```

검증 결과:

```json
{
  "feedback": "OptionGroup 추가 완료: 음료 (GROUP_001)",
  "feedbackIsError": false,
  "detailText": "세트 메뉴 ... 음료 ... GROUP_001 · 단일 선택 · 필수 1-1",
  "hasValidationError": false
}
```

### 검증 결과

Mock Delivery API 테스트 및 lint:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

결과:

```text
6 passed, 1 warning
All checks passed!
```

### 트러블슈팅

#### 1. 백엔드 검증 오류를 사용자가 직접 마주한 문제

문제:

- 필수 옵션 그룹의 유효성 규칙을 백엔드에만 두고 프론트에서 보정하지 않아 사용자가 raw validation error를 보게 됐다.

해결:

- 프론트에서 `필수=true`일 때 최소 선택 수를 자동으로 1 이상으로 조정했다.
- 제출 직전에도 같은 보정을 적용해 수동 입력/스크립트 변경 모두 방어했다.

## Step 7-2 보강. v0 기반 Console 메뉴/옵션 관리 UI 교체 및 CRUD 완성

진행일: 2026-06-05

### 구현 내용

`mock-delivery-console-ui-replacement-plan.md`를 체크리스트로 사용해 메뉴/옵션 관리 영역을 보강했다.

백엔드:

- `PUT /api/mock/stores/{store_id}` 추가
- `DELETE /api/mock/stores/{store_id}` 추가
- 단일 OptionGroup 복제 API 추가
- Menu 전체 OptionGroup 복제 API 추가
- Catalog JSON export API 추가
- Catalog JSON import API 추가
- `OptionSelectionType.QUANTITY` 추가
- `OptionEffect`에 `ADD_ITEM`, `EXCLUDE_ITEM`, `REPLACE_ITEM`, `CHANGE_TASTE`, `LINK_MENU` 추가
- 복제 시 새 groupId/optionId가 Store 범위에서 생성되도록 ID 생성 범위 조정

Console UI:

- Store/Menu/OptionGroup/Option 생성/수정/비활성화 흐름 연결
- 항목 클릭 시 입력폼에 기존 값이 채워지고 저장 버튼이 update 모드로 전환되도록 구현
- 선택 메뉴 상세에서 OptionGroup과 Option이 즉시 보이도록 유지
- OptionGroup 선택 버튼과 Option 선택 버튼을 분리해 각각 수정 폼에 연결
- 선택 OptionGroup 복제와 전체 옵션 구성 복제 버튼 추가
- JSON Export/Import 영역 추가
- API 오류 메시지는 `readJson()`을 통해 raw JSON parse error 대신 설명 가능한 문구로 표시

### 검증 결과

Mock Delivery API 테스트:

```bash
cd mock-delivery-api
.venv/bin/python -m pytest tests/test_mock_orders.py
```

결과:

```text
8 passed, 1 warning
```

브라우저 검증:

```text
검증 URL: http://127.0.0.1:8011/console
도구: Playwright CLI
```

확인한 흐름:

- Store 생성 후 목록과 Store ID 입력에 즉시 반영
- 새로고침 후 생성한 Store/Menu/OptionGroup/Option 데이터 유지 확인
- 후라이드치킨/양념치킨 Menu 생성
- 후라이드치킨에 `음료` OptionGroup 생성
- `required=true`일 때 `minSelect=1`로 보정되어 `필수 1-1` 표시 확인
- `콜라 355ml / ADD_ITEM / 1,000원` Option 생성
- OptionGroup 클릭 시 그룹 수정 폼 채움 확인
- Option 클릭 시 옵션 수정 폼 채움 확인
- 후라이드치킨의 `음료` OptionGroup을 양념치킨으로 복제
- 양념치킨 상세에서 `GROUP_002`와 `콜라 355ml` 옵션 표시 확인
- JSON Export 결과에 Store/Menu/OptionGroup/Option 계층 출력 확인

브라우저에서 직접 누르지 않은 항목:

- JSON Import 버튼으로 화면 갱신 확인
- 전체 옵션 구성 복제 버튼 확인
- 실제 프로세스 종료 후 재시작 확인

위 항목은 API 테스트 또는 구현 연결은 완료했지만, 별도 브라우저 수동 검증은 아직 남아 있다.

### 트러블슈팅

#### 1. 루트에서 pytest 실행 시 StaticFiles 경로 오류

문제:

- 루트에서 `./mock-delivery-api/.venv/bin/python -m pytest mock-delivery-api/tests/test_mock_orders.py`를 실행하면 `Directory 'app/static' does not exist` 오류가 발생했다.

원인:

- `mock-delivery-api/app/main.py`의 `StaticFiles(directory="app/static")`가 현재 작업 디렉터리를 `mock-delivery-api`로 가정한다.

해결:

- 테스트를 `cd mock-delivery-api && .venv/bin/python -m pytest tests/test_mock_orders.py` 방식으로 실행했다.

재발 방지:

- 루트 실행을 공식화하려면 StaticFiles 경로를 파일 기준 절대 경로로 바꾸거나 테스트 실행 스크립트를 추가해야 한다.

#### 2. 복제된 OptionGroup ID가 원본과 같아지는 문제

문제:

- 다른 메뉴로 OptionGroup을 복제하면 대상 메뉴에서 `GROUP_001`처럼 원본과 같은 표시 ID가 나올 수 있었다.

원인:

- 기존 ID 생성이 menu/group 범위에서 번호를 계산했다.

해결:

- groupId와 optionId 생성 범위를 Store 단위로 조정했다.
- 복제 테스트에서 복제 groupId가 원본 groupId와 달라지는 것을 확인하도록 했다.

#### 3. Option 클릭 편집 구조 문제

문제:

- 처음에는 OptionGroup 카드 전체가 button이고, 그 안에 Option 행이 들어가 옵션만 독립적으로 클릭하기 어려웠다.

원인:

- OptionGroup 선택과 Option 선택을 같은 버튼 구조 안에 넣었다.

해결:

- OptionGroup 선택 버튼과 Option 선택 버튼을 형제 관계로 분리했다.
- Playwright snapshot에서 그룹 버튼과 옵션 버튼이 별도로 잡히는 것을 확인했다.

#### 4. favicon.ico 404

문제:

- Playwright console에 favicon.ico 404가 1건 표시됐다.

원인:

- 브라우저가 기본 favicon을 요청했지만 `/favicon.ico`가 없다.

해결:

- 기능 오류가 아니므로 이번 작업 범위에서는 수정하지 않았다.
