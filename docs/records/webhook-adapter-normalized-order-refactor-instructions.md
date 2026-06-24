작업 기록: `deeporder-backend`에 webhook receiver, platform adapter, normalized order 경계를 도입하기 위한 1차 구현 지시서.

# Codex 구현 지시서: DeepOrder Webhook Adapter / Normalized Order 1차 리팩토링

## 0. 작업 목적

현재 DeepOrder는 다음 흐름으로 동작한다.

```text
mock-delivery-api
→ webhook JSON 전송
→ deeporder-backend
→ Order / OrderItem 저장
→ KDS 표시
```

현재 문제는 `deeporder-backend`가 사실상 `mock-delivery-api`가 보내는 payload shape를 정답처럼 알고 있다는 점이다.

하지만 추후 실제 배민/쿠팡이츠/요기요 같은 외부 플랫폼 API 또는 webhook을 받게 되면, 각 플랫폼의 payload 구조는 현재 mock payload와 다를 수 있다.

따라서 이번 작업의 목적은 다음이다.

```text
mock payload를 internal order model에 직접 연결하지 않고,
Platform Adapter와 Normalized Order Schema를 사이에 둔다.
```

최종 목표 구조는 다음과 같다.

```text
External Platform Payload
→ Webhook Receiver
→ Platform Adapter
→ NormalizedOrderEvent
→ Order Ingestion Service
→ Internal Order Model
→ KDS View
```

이번 작업은 기능 추가가 아니라 **구조 정리 작업**이다.

---

## 1. 중요한 작업 원칙

반드시 지킬 것:

* `mock-delivery-api`와 `deeporder-backend`를 통합하지 않는다.
* `mock-delivery-api`는 계속 외부 Mock Delivery Platform 역할을 유지한다.
* `mock-delivery-api` 코드는 이번 작업에서 수정하지 않는다.
* 기존 mock 주문 생성 → webhook 전송 → KDS 표시 흐름은 깨지면 안 된다.
* 기존 API 경로는 유지한다.
* DB schema 대규모 변경은 하지 않는다.
* 실제 Baemin/CoupangEats/Yogiyo adapter는 구현하지 않는다.
* 이번 작업에서는 `MockDeliveryAdapter`만 구현한다.
* 현재 동작을 유지하면서 코드 경계를 나누는 것이 목표다.

---

## 2. 참고 문서

작업 전에 반드시 아래 문서를 읽고 작업 방향을 맞춘다.

```text
docs/backend/platform-adapter-design.md
docs/backend/webhook-payload-contract.md
docs/backend/backend-boundary-audit.md
```

문서가 없거나 일부만 있다면, 현재 repository에 존재하는 문서를 기준으로 진행하고 누락된 문서는 작업 결과에 기록한다.

---

## 3. 현재 구조에서 바꾸려는 점

현재 예상 구조:

```text
deeporder-backend/app/orders.py

receive_order_webhook()
  - OrderWebhookIn schema로 mock payload 수신
  - eventId 중복 검사
  - Order / OrderItem 직접 생성
  - AIAnalysis 직접 생성
  - AI background task enqueue
```

목표 구조:

```text
receive_order_webhook()
  - raw body / headers 수신
  - adapter 선택
  - signature validation 호출
  - adapter.parse_event()로 NormalizedOrderEvent 생성
  - order_ingestion service에 전달
```

즉, `receive_order_webhook()`는 최대한 얇은 receiver가 되어야 한다.

---

# Phase 1. 현재 코드 파악

## 1.1 확인할 파일

먼저 아래 파일을 확인한다.

```text
deeporder-backend/app/orders.py
deeporder-backend/app/schemas.py
deeporder-backend/app/models.py
deeporder-backend/app/services/ai_request_analyzer.py
deeporder-backend/app/services/fallback_request_analyzer.py
```

있다면 추가로 확인한다.

```text
deeporder-backend/app/database.py
deeporder-backend/app/main.py
deeporder-backend/app/config.py
deeporder-backend/tests/
```

## 1.2 확인할 기존 동작

현재 다음 API가 어떻게 동작하는지 파악한다.

```text
POST /api/external/orders/webhook
GET /api/kds/orders
PATCH /api/orders/{order_id}/status
```

## 1.3 체크리스트

* [x] `receive_order_webhook()` 함수 위치를 확인했다.
* [x] 현재 webhook request schema를 확인했다.
* [x] 현재 `Order`, `OrderItem`, `WebhookEvent`, `OrderAIAnalysis` 모델을 확인했다.
* [x] 현재 idempotency 기준을 확인했다.
* [x] 현재 `ORDER_CREATED`, `ORDER_CANCELLED` 처리 흐름을 확인했다.
* [x] 현재 AI analysis enqueue 흐름을 확인했다.
* [x] KDS 조회 API가 어떤 DB 필드를 사용하는지 확인했다.

## 1.4 Phase 1 확인 결과

현재 기준 확인 결과는 다음과 같다.

### Receiver 위치

- `receive_order_webhook()` 위치:
  `deeporder-backend/app/orders.py`
- 현재 endpoint:
  `POST /api/external/orders/webhook`

### 현재 webhook request schema

- 위치:
  `deeporder-backend/app/schemas.py`
- 현재 수신 모델:
  `OrderWebhookIn`
- 현재 구조:
  - `eventId`
  - `eventType`
  - `platform`
  - `storeId`
  - `order.orderId`
  - `order.orderNumber`
  - `order.customerRequest`
  - `order.deliveryRequest`
  - `order.orderedAt`
  - `order.items[]`

즉 현재 receiver는 raw body가 아니라 이미 mock payload shape에 가까운 Pydantic schema를 직접 받는다.

### 현재 모델 확인

- `WebhookEvent`:
  `deeporder-backend/app/models.py`
- `Order`:
  `deeporder-backend/app/models.py`
- `OrderItem`:
  `deeporder-backend/app/models.py`
- `OrderAIAnalysis`:
  `deeporder-backend/app/models.py`

현재 저장 구조:

- `WebhookEvent.raw_payload`에 수신 payload 저장
- `Order.raw_payload`에 주문 raw payload 저장
- `Order.platform`, `Order.external_order_id`로 외부 주문 식별
- `OrderItem.options`는 `list[str]` JSON으로 저장

### 현재 idempotency 기준

위치:

- `deeporder-backend/app/orders.py`

현재 기준:

- 이벤트 중복:
  `WebhookEvent.event_id == payload.eventId`
- 주문 중복:
  `Order.platform == payload.platform`
  and
  `Order.external_order_id == payload.order.orderId`

즉 event 중복과 order 중복을 별도로 판단한다.

### 현재 이벤트 처리 흐름

`ORDER_CREATED`:

- `WebhookEvent` 생성
- 기존 주문 중복 검사
- 신규 주문이면 `Order`, `OrderItem`, `OrderAIAnalysis(PENDING)` 생성
- commit 후 AI background task enqueue

`ORDER_CANCELLED`:

- 기존 주문이 있으면 `Order.status = CANCELLED`
- event는 기록
- 새 주문 생성은 하지 않음

### 현재 AI enqueue 흐름

- enqueue 위치:
  `deeporder-backend/app/orders.py`
- 호출 대상:
  `app.services.ai_request_analyzer.analyze_order_request`
- 방식:
  `background_tasks.add_task(analyze_order_request, order.id)`

### 현재 KDS 조회 API 확인

- endpoint:
  `GET /api/kds/orders`
- 위치:
  `deeporder-backend/app/orders.py`

현재 조회 조건:

- query param `storeId`
- `Order.store_id == storeId`

현재 응답에 사용되는 주요 필드:

- `Order.id`
- `Order.platform`
- `Order.store_id`
- `Order.external_order_id`
- `Order.order_number`
- `Order.status`
- `Order.customer_request`
- `Order.delivery_request`
- `Order.ordered_at`
- `Order.items`
- `Order.ai_analysis`

### Phase 1 판단

현재 구조는 기능적으로는 동작하지만, 다음 문제가 분명하다.

- receiver가 mock payload shape를 직접 안다.
- adapter 계층이 없다.
- normalized schema가 없다.
- persistence 로직이 receiver에 직접 붙어 있다.

따라서 다음 Phase에서

- `normalization/`
- `adapters/`
- `services/order_ingestion.py`

를 도입하는 방향은 현재 코드 구조와 정확히 맞물린다.

---

# Phase 2. Normalized Schema 추가

## 2.1 새 디렉터리/파일 추가

다음 파일을 추가한다.

```text
deeporder-backend/app/normalization/__init__.py
deeporder-backend/app/normalization/schemas.py
```

## 2.2 정의할 schema

`schemas.py`에 다음 개념을 추가한다.

```text
NormalizedOrderEvent
NormalizedOrderItem
NormalizedOrderOption
```

가능하면 Pydantic 모델로 정의한다.
현재 프로젝트는 Pydantic v2를 사용하므로 기존 스타일(`model_validate`, `ConfigDict`)에 맞춘다.

## 2.3 권장 필드

### NormalizedOrderEvent

```text
source_platform: str
source_event_id: str | None
source_event_type: str
source_occurred_at: datetime | None
source_store_id: str
source_order_id: str
source_order_number: str | None
customer_request: str | None
delivery_request: str | None
order_channel: str | None
fulfillment_type: str | None
currency: str | None
items: list[NormalizedOrderItem]
raw_payload: dict
raw_headers: dict | None
```

### NormalizedOrderItem

```text
external_line_id: str | None
name: str
quantity: int
unit_price: int | None
total_price: int | None
options: list[NormalizedOrderOption]
notes: list[str]
```

### NormalizedOrderOption

```text
group_name: str | None
option_name: str
option_type: str | None
additional_price: int | None
raw_option: dict | str | None
```

## 2.4 주의사항

* 기존 DB 모델을 바꾸지 않는다.
* 이 schema는 DB 저장 전 중간 구조다.
* 현재 mock payload에 없는 값은 `None`으로 허용한다.
* `raw_payload`는 반드시 보존한다.
* `raw_headers`는 가능하면 보존한다.

## 2.5 체크리스트

* [x] `app/normalization/` 디렉터리를 추가했다.
* [x] `NormalizedOrderEvent`를 정의했다.
* [x] `NormalizedOrderItem`을 정의했다.
* [x] `NormalizedOrderOption`을 정의했다.
* [x] 현재 mock payload를 표현할 수 있다.
* [x] 실제 플랫폼 payload가 들어와도 adapter가 이 schema로 변환할 수 있는 구조다.

## 2.6 Phase 2 구현 결과

추가한 파일:

```text
deeporder-backend/app/normalization/__init__.py
deeporder-backend/app/normalization/schemas.py
```

구현 내용:

- `NormalizedOrderOption`
- `NormalizedOrderItem`
- `NormalizedOrderEvent`

현재 구현 기준:

- Pydantic v2 스타일을 사용했다.
- DB 모델과 분리된 중간 schema다.
- mock payload에 없는 필드는 `None` 허용으로 열어 두었다.
- `raw_payload`는 필수 보존 필드로 두었다.
- `raw_headers`는 `dict[str, Any] | None`으로 두었다.
- `extra="allow"`를 사용해 초기 adapter 실험 단계에서 플랫폼별 부가 필드를 임시로 담을 수 있게 했다.

현재 schema가 표현할 수 있는 것:

- `mock-delivery-api`의 현재 webhook payload 메타 정보
- item 단위 가격/수량 정보
- 문자열 option을 정규화한 option 구조
- 향후 실제 플랫폼의 line id, channel, fulfillment, currency 같은 확장 필드

Phase 2 판단:

- 이제 webhook receiver가 바로 DB 모델로 저장하지 않고,
  먼저 `NormalizedOrderEvent`로 수렴할 수 있는 기반이 생겼다.
- 다음 단계는 이 schema를 반환하는 adapter 계층을 도입하는 것이다.

---

# Phase 3. Adapter Interface 추가

## 3.1 새 디렉터리/파일 추가

다음 파일을 추가한다.

```text
deeporder-backend/app/adapters/__init__.py
deeporder-backend/app/adapters/base.py
```

## 3.2 PlatformAdapter 정의

`base.py`에 `PlatformAdapter`를 정의한다.

권장 형태:

```python
from abc import ABC, abstractmethod

class PlatformAdapter(ABC):
    platform_name: str

    @abstractmethod
    def can_handle(self, headers: dict, body: dict) -> bool:
        ...

    def validate_signature(self, headers: dict, raw_body: bytes | None, body: dict) -> None:
        return None

    @abstractmethod
    def parse_event(self, headers: dict, body: dict) -> NormalizedOrderEvent:
        ...
```

프로젝트 스타일에 맞게 `Protocol`을 써도 된다.

## 3.3 책임

Adapter가 해야 하는 일:

* platform 식별
* platform-specific payload 파싱
* event type 매핑
* id 추출
* 주문/아이템/옵션 변환
* `NormalizedOrderEvent` 반환

Adapter가 하지 말아야 하는 일:

* DB 저장
* KDS 상태 변경
* AI 분석 실행
* mock 주문 생성
* mock catalog 관리

## 3.4 체크리스트

* [x] `app/adapters/base.py`를 추가했다.
* [x] `PlatformAdapter` 인터페이스를 만들었다.
* [x] `can_handle()` 메서드가 있다.
* [x] `validate_signature()` 메서드가 있다.
* [x] `parse_event()` 메서드가 있다.
* [x] adapter가 DB 모델에 직접 의존하지 않는다.

## 3.5 Phase 3 구현 결과

추가한 파일:

```text
deeporder-backend/app/adapters/__init__.py
deeporder-backend/app/adapters/base.py
```

구현 내용:

- `PlatformAdapter` 추상 인터페이스 추가
- `can_handle(headers, body)`
- `validate_signature(headers, raw_body, body)`
- `parse_event(headers, body)`

현재 설계 기준:

- adapter는 DB 모델을 모른다.
- adapter의 출력은 `NormalizedOrderEvent`다.
- signature 검증은 기본 no-op으로 두고, 실제 플랫폼 adapter에서 override 가능하게 했다.
- receiver는 이후 이 인터페이스만 의존하면 된다.

Phase 3 판단:

- 이제 `MockDeliveryAdapter`를 첫 구현체로 추가할 준비가 되었다.
- 다음 단계에서는 현재 mock payload를 이 인터페이스를 통해 `NormalizedOrderEvent`로 변환하면 된다.

---

# Phase 4. MockDeliveryAdapter 추가

## 4.1 새 파일 추가

```text
deeporder-backend/app/adapters/mock_delivery.py
```

## 4.2 역할

현재 `mock-delivery-api`가 보내는 payload를 받아서 `NormalizedOrderEvent`로 변환한다.

현재 mock payload 예시:

```json
{
  "eventId": "EVENT_...",
  "eventType": "ORDER_CREATED",
  "platform": "MOCK_DELIVERY",
  "storeId": "STORE_FLAT",
  "order": {
    "orderId": "ORDER_...",
    "orderNumber": "ORDER_...",
    "customerRequest": "string | null",
    "deliveryRequest": "string | null",
    "orderedAt": "ISO datetime | null",
    "items": [
      {
        "name": "string",
        "quantity": 1,
        "options": ["string"],
        "unitPrice": 12000,
        "totalPrice": 12000
      }
    ]
  }
}
```

## 4.3 변환 규칙

### Event

```text
payload.platform -> source_platform
payload.eventId -> source_event_id
payload.eventType -> source_event_type
payload.order.orderedAt -> source_occurred_at
payload.storeId -> source_store_id
payload.order.orderId -> source_order_id
payload.order.orderNumber -> source_order_number
payload.order.customerRequest -> customer_request
payload.order.deliveryRequest -> delivery_request
payload 전체 -> raw_payload
headers -> raw_headers
```

### Item

```text
item.name -> name
item.quantity -> quantity
item.unitPrice -> unit_price
item.totalPrice -> total_price
item.options -> options
```

### Option

현재 mock payload의 `options`는 문자열 배열이다.

예:

```json
["맵기: 보통", "추가: 치즈"]
```

가능하면 다음처럼 변환한다.

```text
"맵기: 보통"
→ group_name: "맵기"
→ option_name: "보통"
→ raw_option: "맵기: 보통"
```

만약 `:`가 없으면:

```text
group_name: None
option_name: 원본 문자열
raw_option: 원본 문자열
```

## 4.4 에러 처리

* 필수 필드가 없으면 명확한 예외를 발생시킨다.
* 예외 타입은 프로젝트의 기존 HTTPException 처리 방식에 맞춘다.
* adapter 내부에서 DB commit을 하면 안 된다.

## 4.5 체크리스트

* [x] `MockDeliveryAdapter`를 만들었다.
* [x] `platform == MOCK_DELIVERY`를 처리한다.
* [x] 현재 mock payload를 `NormalizedOrderEvent`로 변환한다.
* [x] item 변환을 처리한다.
* [x] string option을 `NormalizedOrderOption`으로 변환한다.
* [x] raw_payload를 보존한다.
* [x] raw_headers를 보존한다.
* [x] DB 모델에 직접 의존하지 않는다.
* [x] mock 주문 생성이나 catalog 관리를 하지 않는다.

## 4.6 Phase 4 구현 결과

추가한 파일:

```text
deeporder-backend/app/adapters/mock_delivery.py
```

수정한 파일:

```text
deeporder-backend/app/adapters/__init__.py
```

구현 내용:

- `MockDeliveryAdapter` 추가
- `platform == "MOCK_DELIVERY"` 기준으로 처리 여부 판단
- 현재 mock payload를 `NormalizedOrderEvent`로 변환
- item 배열을 `NormalizedOrderItem`으로 변환
- string option을 `NormalizedOrderOption`으로 변환
- `raw_payload`, `raw_headers` 보존

option 변환 규칙:

- `"맵기: 보통"` 형태면
  - `group_name="맵기"`
  - `option_name="보통"`
- `:`가 없으면
  - `group_name=None`
  - `option_name=원본 문자열`

에러 처리:

- 필수 필드 누락
- 빈 문자열
- 잘못된 `items` 구조
- 음수 가격
- 잘못된 `orderedAt`

에 대해 `HTTP 422` 기반 예외를 발생시킨다.

Phase 4 판단:

- 이제 current mock payload를 receiver 밖에서 해석할 수 있다.
- 다음 단계는 adapter registry를 추가해서 receiver가 payload를 직접 해석하지 않도록 준비하는 것이다.

---

# Phase 5. Adapter Registry 추가

## 5.1 새 파일 추가

```text
deeporder-backend/app/adapters/registry.py
```

## 5.2 역할

headers/body를 받아 처리 가능한 adapter를 선택한다.

초기에는 `MockDeliveryAdapter`만 등록한다.

예상 형태:

```python
ADAPTERS = [
    MockDeliveryAdapter(),
]

def get_adapter(headers: dict, body: dict) -> PlatformAdapter:
    for adapter in ADAPTERS:
        if adapter.can_handle(headers, body):
            return adapter
    raise UnsupportedPlatformError(...)
```

프로젝트 예외 처리 스타일에 맞게 구현한다.

## 5.3 체크리스트

* [x] `registry.py`를 만들었다.
* [x] `MockDeliveryAdapter`를 등록했다.
* [x] `get_adapter()` 또는 유사 함수를 만들었다.
* [x] 처리 불가능한 payload에 대한 에러가 있다.
* [x] 향후 Baemin/CoupangEats adapter를 추가하기 쉬운 구조다.

## 5.4 Phase 5 구현 결과

추가한 파일:

```text
deeporder-backend/app/adapters/registry.py
```

수정한 파일:

```text
deeporder-backend/app/adapters/__init__.py
```

구현 내용:

- `ADAPTERS` registry 추가
- 현재는 `MockDeliveryAdapter()` 1개만 등록
- `get_adapter(headers, body)` 추가
- 처리 가능한 adapter가 없으면 `UnsupportedPlatformError` 발생

현재 예외 처리 기준:

- 상태코드: `422`
- 메시지: `Unsupported external platform payload.`

Phase 5 판단:

- 이제 receiver는 payload 구조를 직접 해석하지 않고 registry를 통해 adapter를 선택할 수 있다.
- 다음 단계에서는 저장 로직을 `order_ingestion` service로 분리해서 receiver를 더 얇게 만들 수 있다.

---

# Phase 6. Order Ingestion Service 분리

## 6.1 새 파일 추가

```text
deeporder-backend/app/services/order_ingestion.py
```

## 6.2 역할

`NormalizedOrderEvent`를 받아 기존 DB 모델에 저장한다.

이 서비스는 기존 `receive_order_webhook()` 안에 있던 저장 관련 책임을 가져온다.

처리해야 하는 것:

* idempotency 처리
* `WebhookEvent` 저장
* `ORDER_CREATED` 처리
* `ORDER_CANCELLED` 처리
* 기존 주문 중복 확인
* `Order` 생성
* `OrderItem` 생성
* `OrderAIAnalysis(PENDING)` 생성
* AI background task enqueue 준비

## 6.3 입력/출력

입력:

```text
db session
normalized_event
background_tasks 또는 AI enqueue에 필요한 객체
```

출력:

기존 webhook endpoint 응답과 최대한 동일하게 유지한다.

예:

```text
received / duplicated / cancelled / already_exists 등 기존 응답 구조 유지
```

현재 프로젝트의 실제 응답 구조를 확인하고 맞춘다.

## 6.4 주의사항

* 이번 작업에서 DB schema는 바꾸지 않는다.
* 기존 KDS API가 기대하는 `Order`, `OrderItem` 저장 형태를 유지한다.
* `Order.platform`에는 `normalized_event.source_platform`을 넣는다.
* `Order.external_order_id`에는 `normalized_event.source_order_id`를 넣는다.
* `WebhookEvent.event_id`에는 가능하면 `normalized_event.source_event_id`를 사용한다.
* `source_event_id`가 없는 경우 fallback 전략은 간단히 문서화만 하고, 이번 작업에서 복잡하게 구현하지 않아도 된다.
* raw payload는 기존처럼 저장한다.
* raw headers 저장 컬럼이 없다면 DB 변경하지 말고 우선 저장하지 않거나 문서에 TODO로 남긴다.

## 6.5 체크리스트

* [x] `order_ingestion.py`를 만들었다.
* [x] `NormalizedOrderEvent`를 입력으로 받는다.
* [x] 기존 idempotency 처리와 동일한 결과를 유지한다.
* [x] 기존 `ORDER_CREATED` 처리와 동일한 결과를 유지한다.
* [x] 기존 `ORDER_CANCELLED` 처리와 동일한 결과를 유지한다.
* [x] `Order` 저장 결과가 기존 KDS 조회와 호환된다.
* [x] `OrderItem` 저장 결과가 기존 KDS 조회와 호환된다.
* [x] `OrderAIAnalysis` 생성 흐름이 유지된다.
* [x] AI background task enqueue 흐름이 유지된다.
* [x] mock payload를 직접 참조하지 않는다.

## 6.6 Phase 6 구현 결과

추가한 파일:

```text
deeporder-backend/app/services/order_ingestion.py
```

수정한 파일:

```text
deeporder-backend/app/orders.py
```

구현 내용:

- `ingest_order_event(db, event)` service 추가
- 입력은 `NormalizedOrderEvent`
- 반환은 `WebhookResponse`와 AI enqueue 정보가 담긴 `IngestionResult`
- 기존 webhook 저장 로직을 service로 이동

유지한 동작:

- `eventId` 기반 이벤트 중복 처리
- `platform + external_order_id` 기반 주문 중복 처리
- `ORDER_CANCELLED` 처리
- `ORDER_CREATED` 처리
- `WebhookEvent`, `Order`, `OrderItem`, `OrderAIAnalysis(PENDING)` 생성
- commit 이후 AI task enqueue 흐름

현재 receiver 상태:

- 아직 raw body / adapter registry를 쓰지는 않는다.
- 다만 persistence는 더 이상 receiver 내부에 직접 있지 않다.
- receiver는 현재 `OrderWebhookIn`을 `NormalizedOrderEvent`로 한 번 감싼 뒤 ingestion service에 넘긴다.

Phase 6 판단:

- 저장 로직은 이제 mock payload가 아니라 normalized event 기준으로 동작한다.
- 다음 단계에서는 receiver를 `Request` 기반으로 바꾸고,
  registry + adapter를 통해 `NormalizedOrderEvent`를 생성하도록 바꾸면 된다.

---

# Phase 7. Webhook Receiver 단순화

## 7.1 수정 대상

```text
deeporder-backend/app/orders.py
```

## 7.2 목표

`receive_order_webhook()`가 직접 mock payload를 해석하지 않도록 줄인다.

기대 흐름:

```text
receive_order_webhook(request, db, background_tasks)
  1. raw body 읽기
  2. JSON body 파싱
  3. headers dict 생성
  4. adapter = get_adapter(headers, body)
  5. adapter.validate_signature(headers, raw_body, body)
  6. normalized_event = adapter.parse_event(headers, body)
  7. result = ingest_order_event(db, normalized_event, background_tasks)
  8. return result
```

## 7.3 주의사항

FastAPI에서 request body를 읽는 방식은 기존 schema binding과 충돌할 수 있다.
필요하면 endpoint 인자를 기존 `OrderWebhookIn`에서 `Request` 기반으로 바꾼다.

예상:

```python
from fastapi import Request

async def receive_order_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    body = await request.json()
```

프로젝트 스타일에 맞춰 동기/비동기 처리 방식을 조정한다.

## 7.4 유지해야 하는 API

아래 경로는 바꾸면 안 된다.

```text
POST /api/external/orders/webhook
```

## 7.5 체크리스트

* [x] endpoint path가 유지된다.
* [x] 기존 mock payload를 계속 받을 수 있다.
* [x] receiver에서 `payload.order.orderId` 같은 직접 참조가 줄어들었다.
* [x] adapter 선택이 receiver 안에서 이루어진다.
* [x] signature validation 호출 지점이 생겼다.
* [x] persistence는 `order_ingestion` service가 담당한다.
* [x] 기존 응답 형태가 크게 바뀌지 않았다.

## 7.6 Phase 7 구현 결과

수정한 파일:

```text
deeporder-backend/app/orders.py
```

구현 내용:

- webhook endpoint를 `Request` 기반 receiver로 전환
- `raw_body = await request.body()`
- `body = await request.json()`
- headers dict 추출
- `get_adapter(headers, body)`로 adapter 선택
- `adapter.validate_signature(...)` 호출
- `adapter.parse_event(...)`로 `NormalizedOrderEvent` 생성
- `ingest_order_event(...)` 호출

현재 receiver 역할:

- transport-level request 수신
- JSON object 여부 확인
- headers 수집
- adapter 선택
- signature validation 호출
- normalized event 생성
- ingestion service 호출

현재 receiver가 더 이상 직접 하지 않는 것:

- `payload.platform` 직접 해석
- `payload.order.orderId` 직접 참조
- `Order`, `OrderItem`, `WebhookEvent` 직접 생성

Phase 7 판단:

- 이제 webhook receiver는 현재 목표 구조에 맞게 상당히 얇아졌다.
- 다음 단계는 KDS / status API 영향 확인과 adapter 검증 테스트 보강이다.

---

# Phase 8. 기존 KDS / Status API 영향 확인

## 8.1 확인 대상

```text
GET /api/kds/orders
PATCH /api/orders/{order_id}/status
```

## 8.2 원칙

이 두 API는 이번 작업에서 기능 변경 대상이 아니다.

수정이 필요하더라도 adapter 리팩토링 때문에 깨진 부분만 최소 수정한다.

## 8.3 체크리스트

* [x] `GET /api/kds/orders`가 기존처럼 동작한다.
* [x] 새 ingest 흐름으로 저장된 주문이 KDS 조회에 나온다.
* [x] `PATCH /api/orders/{order_id}/status`가 기존처럼 동작한다.
* [x] 주문 상태 변경 후 KDS 조회 결과가 정상이다.

## 8.4 Phase 8 확인 결과

검증에 사용한 기준:

- `deeporder-backend/tests/test_order_webhook.py`
- 실행 명령:

```bash
cd deeporder-backend
.venv/bin/python -m pytest tests/test_order_webhook.py
```

실행 결과:

- `2 passed`

확인된 항목:

- `POST /api/external/orders/webhook` 이후 저장된 주문이 `GET /api/kds/orders?storeId=STORE_001`에 정상 노출된다.
- 응답의 `orders[0].status == "NEW"`가 유지된다.
- `orders[0].items[0].name == "제육덮밥"`으로 item 저장/조회 호환이 유지된다.
- `aiAnalysis` 응답 구조도 기존처럼 유지된다.
- `PATCH /api/orders/{order_id}/status` 호출 후 `status == "COOKING"` 응답이 정상 반환된다.

이번 Phase 판단:

- adapter/normalized/ingestion 분리 이후에도 KDS 조회 API와 상태 변경 API는 기존 계약을 유지한다.
- 현재 단계에서 KDS/Status API는 기능 회귀 없이 통과했다.

---

# Phase 9. 테스트 또는 수동 검증

## 9.1 가능하면 자동 테스트 추가

테스트 디렉터리가 있다면 adapter 단위 테스트를 추가한다.

예상 테스트:

```text
deeporder-backend/tests/test_mock_delivery_adapter.py
```

검증:

* mock payload를 넣으면 `NormalizedOrderEvent`가 생성된다.
* `source_platform == "MOCK_DELIVERY"`
* `source_event_id`가 eventId와 같다.
* `source_order_id`가 order.orderId와 같다.
* item name/quantity/price가 유지된다.
* string option이 normalized option으로 변환된다.
* raw_payload가 보존된다.

## 9.2 webhook integration test 가능 시 추가

가능하다면 다음 흐름을 테스트한다.

```text
POST /api/external/orders/webhook
→ 200 응답
→ Order 저장 확인
→ OrderItem 저장 확인
→ KDS 조회 가능
```

## 9.3 테스트 인프라가 없으면 수동 검증 절차 작성

테스트를 추가하기 어렵다면 문서에 수동 검증 절차를 남긴다.

예:

```text
1. deeporder-backend 실행
2. mock-delivery-api 실행
3. mock-delivery-console에서 주문 생성
4. 주문 전송
5. deeporder-backend 로그 확인
6. KDS Web에서 주문 표시 확인
7. 같은 eventId 재전송 시 중복 처리 확인
8. 주문 취소 payload 전송 시 취소 처리 확인
```

## 9.4 체크리스트

* [x] adapter 단위 테스트를 추가했거나, 수동 검증 절차를 문서화했다.
* [x] mock order 생성 후 webhook 전송이 정상 동작한다.
* [ ] KDS 화면에 주문이 표시된다.
* [x] 중복 이벤트 처리가 유지된다.
* [x] 취소 이벤트 처리가 유지된다.
* [x] 기존 API 응답이 크게 깨지지 않는다.

## 9.5 Phase 9 검증 결과

추가한 테스트:

```text
deeporder-backend/tests/test_mock_delivery_adapter.py
```

자동 검증 대상:

- `MockDeliveryAdapter.can_handle()`
- `MockDeliveryAdapter.parse_event()`
- mock payload -> `NormalizedOrderEvent` 변환
- item/option 정규화
- raw payload / raw headers 보존

자동 검증 명령:

```bash
cd deeporder-backend
.venv/bin/python -m pytest tests/test_mock_delivery_adapter.py tests/test_order_webhook.py
```

현재 자동 검증으로 확인 가능한 항목:

- adapter 단위 변환 로직
- webhook 수신
- KDS 조회 API
- 상태 변경 API
- 중복 이벤트 처리
- 취소 이벤트 처리

현재 자동 검증만으로는 확인하지 못한 항목:

- 실제 브라우저의 KDS 화면 렌더링

따라서 아래는 아직 남는다.

- `KDS 화면에 주문이 표시된다.`

이 항목은 브라우저 기반 수동 검증 또는 기존 E2E 체크리스트로 마무리할 수 있다.

---

# Phase 10. 문서 업데이트

## 10.1 업데이트 대상

```text
docs/backend/platform-adapter-design.md
docs/backend/webhook-payload-contract.md
```

필요하면 추가:

```text
docs/backend/backend-boundary-audit.md
```

## 10.2 업데이트 내용

`platform-adapter-design.md`에 추가:

```text
구현된 파일 경로
현재 구현된 adapter 목록
현재 receiver 흐름
현재 ingestion service 흐름
아직 미구현인 adapter 목록
다음 작업 후보
```

`webhook-payload-contract.md`에 추가:

```text
현재 MockDeliveryAdapter가 처리하는 payload
NormalizedOrderEvent 실제 필드
raw headers 저장 여부
signature 검증 현재 상태
idempotency 현재 상태
```

## 10.3 체크리스트

* [x] 구현된 파일 경로를 문서에 반영했다.
* [x] `MockDeliveryAdapter`가 첫 adapter임을 문서에 반영했다.
* [x] `NormalizedOrderEvent` 필드를 문서에 반영했다.
* [x] raw headers 저장 여부를 문서에 반영했다.
* [x] signature 검증은 확장 지점만 있고 실제 구현은 아직 없음을 문서에 반영했다.
* [x] 다음 작업 후보를 문서에 남겼다.

## 10.4 Phase 10 문서 업데이트 결과

업데이트한 문서:

```text
docs/backend/platform-adapter-design.md
docs/backend/webhook-payload-contract.md
docs/backend/backend-boundary-audit.md
```

반영한 내용:

- 실제 구현된 파일 경로
- 현재 구현된 adapter 목록
- 현재 receiver 흐름
- 현재 ingestion service 흐름
- `NormalizedOrderEvent` 실제 반영 상태
- `raw_headers`는 schema에는 있으나 DB persistence는 아직 없다는 점
- signature validation 호출 지점은 생겼지만 실제 검증 로직은 아직 없다는 점
- 현재 남은 다음 작업 후보

---

# Phase 11. 최종 완료 기준

작업 완료 후 아래 조건을 모두 만족해야 한다.

## 기능 유지

* [x] `mock-delivery-api`에서 보내는 기존 webhook payload가 계속 수신된다.
* [x] `POST /api/external/orders/webhook`가 계속 동작한다.
* [x] `GET /api/kds/orders`가 계속 동작한다.
* [x] `PATCH /api/orders/{order_id}/status`가 계속 동작한다.
* [x] 주문 생성 후 KDS 표시 흐름이 깨지지 않는다.
* [x] 주문 취소 이벤트가 기존처럼 처리된다.
* [x] eventId 기반 중복 처리가 기존처럼 유지된다.

## 구조 개선

* [x] `NormalizedOrderEvent`가 추가되었다.
* [x] `PlatformAdapter` interface가 추가되었다.
* [x] `MockDeliveryAdapter`가 추가되었다.
* [x] Adapter registry가 추가되었다.
* [x] Order ingestion service가 추가되었다.
* [x] receiver가 platform-specific parsing에서 벗어났다.
* [x] 저장 로직이 mock payload가 아니라 normalized event를 기준으로 동작한다.

## 경계 유지

* [x] `deeporder-backend`에 mock catalog 관리 기능이 들어오지 않았다.
* [x] `deeporder-backend`에 mock 주문 생성 기능이 들어오지 않았다.
* [x] `mock-delivery-api`는 수정하지 않았다.
* [x] 두 서비스를 통합하지 않았다.
* [x] 실제 platform adapter를 추가할 위치가 명확하다.

## 문서화

* [x] 관련 docs가 업데이트되었다.
* [x] 남은 TODO가 문서화되었다.
* [x] 실제 플랫폼 payload 도입 시 수정 범위가 adapter 계층으로 제한되도록 설명되었다.

## 11.1 Phase 11 점검 결과

자동 검증으로 완료된 항목:

- adapter 단위 변환
- 기존 mock webhook payload 수신
- webhook endpoint 동작
- KDS 조회 API 동작
- 상태 변경 API 동작
- 중복 이벤트 처리
- 취소 이벤트 처리

자동 검증 명령:

```bash
cd deeporder-backend
.venv/bin/python -m pytest tests/test_mock_delivery_adapter.py tests/test_order_webhook.py
```

결과:

- `5 passed`

추가 수동 검증으로 완료된 항목:

- `주문 생성 후 KDS 표시 흐름이 깨지지 않는다.`

추가 확인 내용:

- `mock-delivery-console -> mock-delivery-api -> deeporder-backend -> kds-web` 흐름으로 실제 주문 생성 및 전송을 다시 검증했다.
- 주문 전송 성공 후 `kds-web` 화면에서 신규 주문이 표시되는 것을 확인했다.
- 중간에 발생했던 `HTTP 500`은 코드 문제가 아니라 stale `deeporder-backend` 런타임 프로세스 문제였고, 현재 코드 기준 재기동 후 정상 동작을 확인했다.

정리:

- backend refactor 자체와 브라우저 기반 KDS 표시까지 모두 확인 완료했다.
- Phase 11 기준으로 남은 미검증 항목은 없다.

---

# 12. 작업 후 보고 형식

작업이 끝나면 다음 형식으로 결과를 보고한다.

```text
## 작업 요약
- 무엇을 추가했는지
- 무엇을 분리했는지
- 기존 동작 유지 여부

## 변경 파일
- 파일 경로
- 변경 내용

## 검증 결과
- 실행한 테스트
- 수동 검증 결과
- 확인하지 못한 항목

## 남은 TODO
- adapter 관련 TODO
- normalized schema 관련 TODO
- signature/auth 관련 TODO
- 실제 플랫폼 연동 전 필요한 작업
```

---

# 13. 이번 작업의 한 문장 목표

```text
mock payload를 deeporder-backend 내부 주문 모델에 직접 연결하던 구조를 끊고,
Platform Adapter와 Normalized Order Schema를 사이에 두어
실제 외부 배달 플랫폼 payload를 수용할 수 있는 기반을 만든다.
```

---

# 14. 후속 작업 범위

이번 1차 리팩토링 이후 바로 이어서 볼 후속 작업은 다음 다섯 가지다.

```text
1. signature validation 구조 구체화
2. adapter registry 테스트 추가
3. raw headers 저장 여부 결정
4. adapter version 저장 여부 결정
5. orders.py 파일 분리 및 order_ingestion 전용 테스트 추가
```

이 항목들은 이번 문서의 본 구현 범위에는 포함되지 않았거나, 일부 뼈대만 반영된 상태다.

---

# 15. 후속 작업 현재 상태 판정

## 15.1 부분 진행된 항목

### signature validation 구조

현재 상태:

- `PlatformAdapter.validate_signature(headers, raw_body, body)` 인터페이스는 추가되었다.
- webhook receiver에서 `adapter.validate_signature(...)` 호출 지점도 추가되었다.
- 하지만 `MockDeliveryAdapter`는 실제 검증 로직 없이 no-op 상태다.

즉 현재는:

```text
확장 지점만 만들어진 상태
실제 인증/서명 검증 정책은 미구현
```

## 15.2 아직 진행되지 않은 항목

아래 항목은 현재 기준으로 아직 완료되지 않았다.

- adapter registry 테스트
- raw headers 저장 여부 결정
- adapter version 저장 여부 결정
- `orders.py` 파일 분리
- `order_ingestion` 전용 테스트

---

# 16. 후속 작업 1: Signature Validation 구조 구체화

## 16.1 목표

현재 no-op 상태인 signature validation을 실제 외부 플랫폼 연동을 견딜 수 있는 구조로 고정한다.

## 16.2 이번 단계에서 정해야 할 것

- 검증 책임이 receiver가 아니라 adapter에 있다는 점을 유지한다.
- 플랫폼별 인증 방식이 달라도 공통 receiver를 건드리지 않도록 한다.
- 검증 실패 시 어떤 HTTP status / 메시지를 반환할지 정한다.
- raw body 기반 검증이 필요한 플랫폼을 고려해 현재 `raw_body` 전달 방식을 유지한다.

## 16.3 이번 단계에서 아직 하지 않을 것

- 실제 Baemin/CoupangEats/Yogiyo signature 검증 구현
- 비밀키 관리 체계 도입
- 운영 secret rotation 구현

## 16.4 체크리스트

* [x] signature validation 실패 시 예외 규약을 문서화한다.
* [x] `MockDeliveryAdapter`의 validate 정책을 명시한다.
* [x] 실제 플랫폼 adapter가 override할 수 있는 확장 규칙을 문서화한다.
* [x] 필요 시 테스트용 dummy signature adapter 예제를 추가한다.

## 16.5 진행 결과

이번 단계에서 반영한 내용:

- `deeporder-backend/app/adapters/base.py`에 `SignatureValidationError`를 추가했다.
- 기본 실패 규약을 `401 Unauthorized` + `Webhook signature validation failed.` 로 고정했다.
- `MockDeliveryAdapter.validate_signature()`를 명시적 no-op override로 추가했다.
- mock 정책이 “구현 누락”이 아니라 “unsigned local mock sender 허용”임을 코드와 문서에 명시했다.
- 실제 signed platform adapter가 따라야 할 override 규칙과 예제 코드를 문서에 추가했다.
- `MockDeliveryAdapter`의 signature validation no-op 정책을 단위 테스트로 확인했다.

수정한 파일:

```text
deeporder-backend/app/adapters/__init__.py
deeporder-backend/app/adapters/base.py
deeporder-backend/app/adapters/mock_delivery.py
deeporder-backend/tests/test_mock_delivery_adapter.py
docs/backend/webhook-payload-contract.md
docs/backend/platform-adapter-design.md
```

이번 단계에서 의도적으로 하지 않은 것:

- 실제 Baemin/CoupangEats/Yogiyo 서명 검증 구현
- secret 관리/rotation
- DB에 signature 결과 또는 raw headers persistence 추가

판단:

- signature validation은 아직 실플랫폼 로직이 없지만, 최소한 “어디서”, “어떤 예외로”, “어떤 HTTP 규약으로” 실패해야 하는지는 고정되었다.
- 다음 플랫폼 adapter 추가 시 receiver를 수정하지 않고 adapter override만으로 검증 로직을 붙일 수 있다.

---

# 17. 후속 작업 2: Adapter Registry 테스트

## 17.1 목표

registry가 payload별로 올바른 adapter를 선택하고, 처리 불가능한 payload에서 의도한 예외를 반환하는지 고정한다.

## 17.2 필요한 테스트

예상 테스트 파일:

```text
deeporder-backend/tests/test_adapter_registry.py
```

검증 대상:

- `platform == "MOCK_DELIVERY"` payload면 `MockDeliveryAdapter`를 반환한다.
- 지원하지 않는 payload면 `UnsupportedPlatformError`를 발생시킨다.
- 향후 adapter가 늘어나도 registry 테스트 패턴을 재사용할 수 있다.

## 17.3 체크리스트

* [x] `test_adapter_registry.py`를 추가한다.
* [x] supported payload selection 테스트를 추가한다.
* [x] unsupported payload rejection 테스트를 추가한다.
* [x] registry 확장 시 따라야 할 테스트 패턴을 문서에 남긴다.

## 17.4 진행 결과

이번 단계에서 반영한 내용:

- `deeporder-backend/tests/test_adapter_registry.py`를 추가했다.
- `get_adapter()`가 `MOCK_DELIVERY` payload에서 `MockDeliveryAdapter`를 반환하는지 확인하는 테스트를 추가했다.
- 지원하지 않는 `platform` payload에서 `UnsupportedPlatformError`와 `422` 응답 규약이 유지되는지 확인하는 테스트를 추가했다.
- registry 테스트는 adapter별 parse/validation 테스트와 분리해서 유지해야 한다는 패턴을 `docs/backend/platform-adapter-design.md`에 반영했다.

수정한 파일:

```text
deeporder-backend/tests/test_adapter_registry.py
docs/backend/platform-adapter-design.md
```

판단:

- 이제 registry 레벨에서 “무슨 adapter를 선택하는가”와 “선택 불가 시 어떤 예외를 내는가”가 테스트로 고정되었다.
- 이후 실제 platform adapter가 늘어나도 동일한 패턴으로 registry 회귀를 관리할 수 있다.

---

# 18. 후속 작업 3: Raw Headers 저장 여부 결정

## 18.1 목표

현재 `NormalizedOrderEvent.raw_headers`는 메모리 상으로만 존재하고 DB에는 저장되지 않는다.
이 값을 persistence할지, 하지 않을지 명확히 결정한다.

## 18.2 판단 기준

- 실제 플랫폼 signature/debugging에 header 원문이 필요한가
- 개인정보/민감정보가 header에 포함될 수 있는가
- 전체 header 저장 대신 allowlist 저장이 더 적절한가
- `WebhookEvent` 또는 별도 audit 저장소가 더 적합한가

## 18.3 가능한 결론

선택지 A:

```text
DB에 저장하지 않는다.
대신 문서에 이유를 남기고 runtime debug는 access log로 해결한다.
```

선택지 B:

```text
allowlist된 header만 저장한다.
예: signature, request-id, source-platform 관련 header
```

선택지 C:

```text
raw headers 전체를 audit 목적 JSON 컬럼으로 저장한다.
```

현재 기준 권장:

```text
전체 raw headers 저장보다 allowlist 저장 쪽을 먼저 검토한다.
```

## 18.4 체크리스트

* [x] raw headers persistence 필요 여부를 결정한다.
* [x] 저장하지 않으면 그 이유를 문서에 확정한다.
* [x] 저장 정책 기준으로 모델/컬럼 추가 필요 여부를 정한다.
* [x] 전체 저장인지 allowlist 저장인지 결정한다.

## 18.5 진행 결과

이번 단계 결정:

```text
현 단계에서는 raw headers를 DB에 저장하지 않는다.
```

결정 이유:

- 현재 mock webhook에는 signature/auth 계약이 없어서 header 영속화의 운영 가치가 낮다.
- `WebhookEvent`, `Order` 모델 어디에도 header 저장 컬럼이 없고, 이번 단계 원칙은 DB schema 확장을 피하는 것이다.
- request headers는 민감정보 또는 노이즈성 값이 섞일 가능성이 있어, 전체 raw 저장은 기본 선택지로 적절하지 않다.
- 현재 replay/debug 기준의 핵심 보존 대상은 `raw_payload`이며, 현 mock 운영 범위에서는 그것만으로 충분하다.

정책 고정:

- 현재는 `NormalizedOrderEvent.raw_headers`를 runtime/adapter 경계까지만 유지한다.
- `WebhookEvent`나 `Order`에는 raw headers persistence를 추가하지 않는다.
- 실제 외부 signed platform 도입 시점이 오면 전체 raw 저장이 아니라 allowlist header 저장을 먼저 검토한다.

이번 단계에서 업데이트한 문서:

```text
docs/backend/webhook-payload-contract.md
docs/backend/platform-adapter-design.md
docs/backend/backend-boundary-audit.md
```

판단:

- raw headers는 “미결정” 상태가 아니라 “현재는 저장하지 않음”으로 정책이 정리되었다.
- 따라서 이후 실제 플랫폼 도입 전까지는 불필요한 DB 변경 없이 현재 구조를 유지할 수 있다.

---

# 19. 후속 작업 4: Adapter Version 저장 여부 결정

## 19.1 목표

향후 실제 플랫폼 payload 변경 시, 어떤 adapter 규칙으로 해석된 이벤트인지 추적 가능한지 판단한다.

## 19.2 검토 포인트

- 현재 mock 환경에서 adapter version이 실제로 필요한가
- 실제 플랫폼에서 payload version drift가 생길 가능성이 큰가
- 저장 위치가 `WebhookEvent`, `Order`, 별도 audit metadata 중 어디가 적절한가
- version 없이도 adapter name + raw payload로 충분한가

## 19.3 현재 기준 판단

현재 mock-only 단계에서는 필수는 아니다.
다만 실제 외부 플랫폼 도입을 전제로 하면 아래 중 하나는 필요할 가능성이 높다.

```text
adapter_name
adapter_version
payload_contract_version
```

## 19.4 체크리스트

* [x] adapter version 저장 필요성을 결정한다.
* [x] 필요 없다면 현재 단계에서 제외하는 이유를 문서화한다.
* [x] 필요 시 저장 후보 필드와 재검토 조건을 제안한다.
* [x] 실제 플랫폼 도입 전 필수 항목인지 여부를 명시한다.

## 19.5 진행 결과

이번 단계 결정:

```text
현 단계에서는 adapter version을 DB에 저장하지 않는다.
```

결정 이유:

- 현재 운영 adapter는 `MockDeliveryAdapter` 1개뿐이라 version metadata의 운영 효용이 낮다.
- payload contract variation이 아직 없어서 adapter revision을 분기 기준으로 사용할 일이 없다.
- `WebhookEvent`, `Order` 어디에도 관련 필드가 없고, 현재 단계 원칙은 DB schema 확장을 피하는 것이다.
- 현재는 `platform + raw_payload + 코드 이력` 조합으로도 충분히 재현/추적이 가능하다.

정책 고정:

- 지금 단계에서는 `adapter_name`, `adapter_version`, `payload_contract_version` 모두 persistence하지 않는다.
- 다만 실제 플랫폼 adapter가 여러 개로 늘어나거나, 같은 플랫폼 안에서 payload contract drift가 생기면 재검토한다.
- 그 시점이 오면 저장 후보 우선순위는 다음과 같다.

```text
1. adapter_name
2. adapter_version
3. payload_contract_version
```

이번 단계에서 업데이트한 문서:

```text
docs/backend/webhook-payload-contract.md
docs/backend/platform-adapter-design.md
docs/backend/backend-boundary-audit.md
```

판단:

- adapter version 저장 여부는 더 이상 미결정 항목이 아니다.
- 현재는 제외하지만, 실제 외부 플랫폼 도입 전에는 재검토가 필요한 운영 준비 항목으로 정리되었다.

---

# 20. 후속 작업 5: orders.py 파일 분리

## 20.1 목표

현재 `deeporder-backend/app/orders.py`에 다음 책임이 함께 있다.

- webhook receiver
- KDS 조회 API
- 주문 상태 변경 API

이들을 파일 단위로 분리해 책임을 더 명확히 한다.

## 20.2 권장 방향

예상 구조 예시:

```text
deeporder-backend/app/routers/order_webhooks.py
deeporder-backend/app/routers/kds_orders.py
deeporder-backend/app/routers/order_status.py
```

또는 프로젝트 규모를 고려해 더 단순하게:

```text
deeporder-backend/app/webhook_orders.py
deeporder-backend/app/kds_orders.py
deeporder-backend/app/order_status.py
```

현재 repository 구조와 import 복잡도를 보고 최소 변경 방향으로 정한다.

## 20.3 분리 원칙

- API path는 유지한다.
- response schema는 유지한다.
- service import 경로만 정리하고 기능은 바꾸지 않는다.
- `main.py` router include만 최소 수정한다.

## 20.4 체크리스트

* [x] receiver / KDS query / status update를 파일 단위로 분리한다.
* [x] 기존 endpoint path를 유지한다.
* [x] import cycle이 생기지 않도록 정리한다.
* [x] 라우터 분리 후 기존 테스트가 계속 통과한다.

## 20.5 진행 결과

이번 단계에서 반영한 구조:

```text
deeporder-backend/app/routers/__init__.py
deeporder-backend/app/routers/order_webhooks.py
deeporder-backend/app/routers/kds_orders.py
deeporder-backend/app/routers/order_status.py
```

정리한 내용:

- 기존 `app/orders.py`를 제거했다.
- webhook receiver를 `order_webhooks.py`로 분리했다.
- KDS 조회 API를 `kds_orders.py`로 분리했다.
- 주문 상태 변경 API를 `order_status.py`로 분리했다.
- `app/main.py`는 합쳐진 `app.routers.router`만 include하도록 정리했다.

유지한 것:

- `POST /api/external/orders/webhook`
- `GET /api/kds/orders`
- `PATCH /api/orders/{order_id}/status`

위 세 endpoint path와 response contract는 그대로 유지했다.

검증:

```bash
cd deeporder-backend
.venv/bin/python -m pytest tests/test_adapter_registry.py tests/test_mock_delivery_adapter.py tests/test_order_webhook.py
```

결과:

- `8 passed`

판단:

- external webhook boundary와 internal KDS/status API boundary가 파일 단위로 분리되었다.
- 현재 단계의 분리 목적은 달성되었고, 기능 회귀 없이 통과했다.

---

# 21. 후속 작업 6: Order Ingestion 전용 테스트

## 21.1 목표

현재 `order_ingestion.py`는 webhook integration test로 간접 검증만 되고 있다.
service 레벨의 직접 테스트를 추가해 receiver와 무관하게 persistence 규칙을 고정한다.

## 21.2 필요한 테스트

예상 테스트 파일:

```text
deeporder-backend/tests/test_order_ingestion.py
```

검증 대상:

- 신규 `ORDER_CREATED` 저장
- duplicate event 처리
- duplicate order 처리
- `ORDER_CANCELLED` 처리
- `OrderItem.options` formatting
- `OrderAIAnalysis(PENDING)` 생성

## 21.3 체크리스트

* [x] `test_order_ingestion.py`를 추가한다.
* [x] 신규 주문 저장 테스트를 추가한다.
* [x] duplicate event 처리 테스트를 추가한다.
* [x] duplicate order 처리 테스트를 추가한다.
* [x] cancel 처리 테스트를 추가한다.
* [x] AI analysis row 생성 테스트를 추가한다.

## 21.4 진행 결과

추가한 파일:

```text
deeporder-backend/tests/test_order_ingestion.py
```

추가한 검증:

- 신규 `ORDER_CREATED` 저장
- `OrderItem.options` formatting
- `OrderAIAnalysis(PENDING)` row 생성
- duplicate event 처리
- duplicate order 처리
- `ORDER_CANCELLED` 처리

테스트 방식:

- webhook receiver를 통하지 않고 `ingest_order_event(db, event)`를 직접 호출한다.
- 각 테스트 시작 시 DB 테이블을 drop/create 해서 service 레벨 persistence 규칙을 독립적으로 검증한다.

검증 명령:

```bash
cd deeporder-backend
.venv/bin/python -m pytest tests/test_order_ingestion.py tests/test_adapter_registry.py tests/test_mock_delivery_adapter.py tests/test_order_webhook.py
```

결과:

- `12 passed`

판단:

- 이제 `order_ingestion.py`는 webhook integration test뿐 아니라 service 단위 테스트로도 직접 고정되었다.
- 이후 receiver나 router 구조가 바뀌어도 persistence 규칙 회귀를 더 빨리 잡을 수 있다.

---

# 22. 후속 작업 우선순위

현재 기준 권장 순서는 다음과 같다.

1. adapter registry 테스트 추가
2. order_ingestion 전용 테스트 추가
3. signature validation 구조 구체화
4. raw headers 저장 여부 결정
5. adapter version 저장 여부 결정
6. orders.py 파일 분리

이 순서를 권장하는 이유:

- 먼저 테스트를 보강하면 이후 분리 작업의 회귀를 막기 쉽다.
- signature / header / version 결정은 실제 외부 플랫폼 연동 정책과 붙어 있으므로 테스트 보강 다음에 판단하는 편이 안전하다.
- 파일 분리는 가장 마지막에 해도 기능상 리스크가 적다.

---

# 23. 현재 문서 기준 후속 작업 요약

```text
이미 진행된 것
- ORDER_CANCELLED end-to-end 테스트
- duplicate eventId 재전송 테스트

부분 진행된 것
- signature validation 구조: 인터페이스/호출 지점만 있음

아직 안 된 것
- adapter registry 테스트
- raw headers 저장 여부 결정
- adapter version 저장 여부 결정
- orders.py 파일 분리
- order_ingestion 전용 테스트
```
