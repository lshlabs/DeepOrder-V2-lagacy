# Backend Boundary Audit

작업 기록: `mock-delivery-api`와 `deeporder-backend`를 통합하지 않고 유지하는 전제에서, 현재 코드가 역할 경계를 제대로 지키는지와 mock webhook payload가 향후 실제 플랫폼 payload로 교체 가능한지 감사한 결과 문서이다.

## 1. 결론 요약

### 1.1 전체 판단

현재 구조는 서비스 경계 자체는 대체로 지켜지고 있다.

- `mock-delivery-api`는 catalog, mock 주문 생성, webhook 전송, 전송 로그, 콘솔용 API에 집중한다.
- `deeporder-backend`는 webhook 수신, idempotency, 내부 주문 저장, KDS 조회, 상태 변경, AI 분석에 집중한다.

즉, 지금 당장 두 서비스를 통합하지 않는 판단은 타당하다.

### 1.2 다만 바로 보이는 핵심 문제

서비스 경계는 유지되지만, payload 경계는 아직 약하다.

가장 큰 이유는 다음과 같다.

- `mock-delivery-api`가 `deeporder-backend`가 기대하는 webhook body shape를 직접 만들어 전송한다.
- `deeporder-backend`는 현재 단일 mock payload shape를 곧바로 내부 주문 모델로 저장한다.
- platform별 adapter, normalizer, signature 검증, event type 확장 지점이 아직 분리되어 있지 않다.

즉 현재 구조는 다음 상태에 가깝다.

```text
서비스 분리: 비교적 양호
payload 계약 분리: 아직 미흡
real platform adapter 준비도: 낮음 ~ 중간
```

추가 메모:

- 이후 리팩토링으로 `NormalizedOrderEvent`, `PlatformAdapter`, `MockDeliveryAdapter`, `adapter registry`, `order_ingestion service`가 도입되었다.
- 따라서 "payload 경계가 전혀 없다"는 상태에서는 벗어났다.
- 다만 실제 platform 교체 가능성 기준으로는 여전히 `signature validation`, `event type 확장`, `real adapter 추가 지점`이 남아 있다.
- `raw headers persistence`는 이번 단계에서 "현재는 저장하지 않는다, 추후 필요 시 allowlist만 검토한다"로 정책 결정이 내려졌다.
- `adapter version persistence`도 이번 단계에서 "현재는 저장하지 않는다, 실제 플랫폼/contract drift가 생기면 재검토한다"로 정책 결정이 내려졌다.

### 1.3 지금 바로 수정해야 할지

현재 단계에서는 코드 수정 없이 문서화가 먼저 맞다.

당장 수정이 필요한 “명백한 역할 침범”은 크지 않다. 다만 이후 실제 플랫폼 연동을 염두에 두면 아래는 리팩토링 후보로 명확하다.

- `mock-delivery-api`의 DeepOrder 전용 payload 빌더
- `deeporder-backend`의 mock payload 고정 수신 schema
- `deeporder-backend`의 adapter 없는 직접 정규화 구조

## 2. 현재 서비스별 책임

## 2.1 `mock-delivery-api` 책임

현재 코드 기준 책임:

- mock external platform 역할
- Store/Menu/Option catalog 관리
- 콘솔용 admin API 제공
- mock 주문 생성
- mock 주문 또는 console generated order를 webhook payload로 변환
- `deeporder-backend`로 webhook 전송
- 전송 성공/실패 로그 기록

근거 파일:

- `mock-delivery-api/app/catalog.py`
- `mock-delivery-api/app/console_api.py`
- `mock-delivery-api/app/mock_orders.py`
- `mock-delivery-api/app/sample_orders.py`
- `mock-delivery-api/app/models.py`

### 감사 결과

잘 지켜지는 점:

- KDS 조회 API를 제공하지 않는다.
- 주문 상태 변경 API를 제공하지 않는다.
- AI 요청사항 분석을 수행하지 않는다.
- 내부 KDS용 주문 상태 모델을 직접 관리하지 않는다.

주의할 점:

- `mock-delivery-api/app/console_api.py`의 `_generated_order_to_mock_payload()`는 DeepOrder webhook receiver가 기대하는 shape를 정확히 맞춰 payload를 생성한다.
- 이 부분은 “외부 플랫폼 시뮬레이터”로 볼 수도 있지만, 동시에 `deeporder-backend` 수신 계약을 너무 직접 알고 있는 구조이기도 하다.

## 2.2 `deeporder-backend` 책임

현재 코드 기준 책임:

- 외부 webhook 수신
- `eventId` 기반 idempotency 처리
- external payload의 raw 보존
- 내부 주문 저장
- KDS 조회 API 제공
- 주문 상태 변경 API 제공
- 주문 요청사항 AI 분석

근거 파일:

- `deeporder-backend/app/routers/order_webhooks.py`
- `deeporder-backend/app/routers/kds_orders.py`
- `deeporder-backend/app/routers/order_status.py`
- `deeporder-backend/app/models.py`
- `deeporder-backend/app/schemas.py`
- `deeporder-backend/app/services/ai_request_analyzer.py`
- `deeporder-backend/app/services/fallback_request_analyzer.py`

### 감사 결과

잘 지켜지는 점:

- mock catalog를 관리하지 않는다.
- mock 주문 생성기를 직접 가지지 않는다.
- 콘솔용 catalog/admin API를 직접 제공하지 않는다.

주의할 점:

- 실제 플랫폼 확대 기준으로는 `signature validation`, `event type 확장`, `real adapter 추가`가 여전히 남아 있다.
- 다만 webhook receiver, KDS 조회, 내부 상태 변경 API는 현재 파일 단위로 분리되었다.

현재 경계 원칙:

- 외부 payload의 `id`, `orderId`, `eventId`는 내부 DB primary key와 분리한다.
- adapter는 외부 payload를 정규화 DTO로 변환하는 역할까지만 가진다.
- `Order`, `OrderItem`, `WebhookEvent`, `OrderAIAnalysis` 생성은 ingestion/service 레이어가 명시적으로 담당한다.
- `raw_payload`는 보존하지만 이를 내부 Entity와 1:1 동일시하지 않는다.

## 3. API 경로 분류표

현재 코드 기준 실제 경로는 다음과 같다.

| 경로 | 현재 위치 | 성격 | 판단 |
| --- | --- | --- | --- |
| `POST /api/mock/stores` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `GET /api/mock/stores` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `PUT /api/mock/stores/{store_id}` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `DELETE /api/mock/stores/{store_id}` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `GET /api/mock/stores/{store_id}/menus` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `POST /api/mock/stores/{store_id}/menus` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `GET /api/mock/stores/{store_id}/menus/{menu_id}` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `PUT /api/mock/stores/{store_id}/menus/{menu_id}` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `DELETE /api/mock/stores/{store_id}/menus/{menu_id}` | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups` 등 catalog 하위 경로 | `mock-delivery-api/app/catalog.py` | Mock Platform API / Admin Console API | 유지 |
| `GET /api/mock/catalog/export` | `mock-delivery-api/app/catalog.py` | Admin Console API | 유지 |
| `POST /api/mock/catalog/import` | `mock-delivery-api/app/catalog.py` | Admin Console API | 유지 |
| `PATCH /api/mock/stores/{store_id}` | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `POST /api/mock/menus`, `PATCH /api/mock/menus/{menu_id}` 등 | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `GET /api/mock/catalog/export-flat` | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `POST /api/mock/catalog/import-flat` | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `GET /api/mock/api-configs*` | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `POST /api/mock/stores/{store_id}/orders/generate` | `mock-delivery-api/app/console_api.py` | Admin Console API / Legacy-like helper | 유지하되 mock generated order임을 명확히 문서화 |
| `POST /api/mock/orders/send` | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `GET /api/mock/order-records` | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `DELETE /api/mock/order-records` | `mock-delivery-api/app/console_api.py` | Admin Console API | 유지 |
| `POST /api/mock/orders/sample` | `mock-delivery-api/app/mock_orders.py` | Legacy/Test API | 정리 후보 |
| `POST /api/mock/orders/send` | `mock-delivery-api/app/mock_orders.py` | Mock Platform API / Legacy/Test API | 유지 가능하나 console 경로와 역할 중복 주의 |
| `GET /api/mock/webhook-logs` | `mock-delivery-api/app/mock_orders.py` | Mock Platform API / Legacy/Test API | 유지 가능 |
| `POST /api/external/orders/webhook` | `deeporder-backend/app/routers/order_webhooks.py` | External Webhook API | 유지 핵심 |
| `GET /api/kds/orders` | `deeporder-backend/app/routers/kds_orders.py` | KDS API | 유지 핵심 |
| `PATCH /api/orders/{order_id}/status` | `deeporder-backend/app/routers/order_status.py` | Internal Order API / KDS API | 유지 핵심 |

### API 구조에서 보이는 특징

- `mock-delivery-api` 내부에는 `catalog.py`와 `console_api.py`가 모두 `/api/mock` prefix를 사용한다.
- `console_api.py`와 `mock_orders.py` 모두 주문 전송 책임을 가진다.
- `deeporder-backend`는 현재 external webhook, internal order status, KDS read API가 라우터 파일 단위로 분리되어 있다.
- 따라서 코드 구조상 boundary 설명력은 이전보다 좋아졌다.

## 4. 데이터 모델 경계 분석

## 4.1 `mock-delivery-api` 데이터

DB: `mock_delivery.db`

모델:

- `Store`
- `Menu`
- `OptionGroup`
- `Option`
- `ApiConfig`
- `ConsoleOrderRecord`
- `MockOrder`
- `MockWebhookLog`

의미:

- mock platform 운영 데이터
- 콘솔 관리 데이터
- mock 주문 원본 데이터
- webhook 송신 이력 데이터

### 판단

이 데이터들은 대체로 mock platform / console domain에 머문다.

다만 `ConsoleOrderRecord.payload`와 `MockOrder.payload`는 주문 데이터를 별도로 저장하고, 이후 webhook으로도 다시 전송된다. 따라서 “주문 원본 데이터의 중복 저장”은 있다.

이 중복은 곧바로 경계 위반은 아니지만, 추적 경로를 복잡하게 만든다.

## 4.2 `deeporder-backend` 데이터

DB: `deeporder.db`

모델:

- `WebhookEvent`
- `Order`
- `OrderItem`
- `OrderAIAnalysis`

의미:

- 외부 webhook 이벤트 원본
- 정규화된 내부 주문
- KDS 조회용 주문 아이템
- 내부 AI 분석 결과

### 판단

이 데이터들은 internal order / KDS domain에 비교적 잘 머문다.

좋은 점:

- `WebhookEvent.raw_payload` 보존
- `Order.raw_payload` 보존
- `Order.platform`, `Order.external_order_id`로 외부 order identity 유지

주의할 점:

- `Order`가 사실상 현재 mock payload shape를 전제로 직접 생성된다.
- `Normalized Order`라는 중간 명시 모델 없이 바로 DB 모델로 들어간다.

## 4.3 중복/혼재 지점

| 지점 | 설명 | 판단 |
| --- | --- | --- |
| `mock-delivery-api.MockOrder.payload` | mock generated payload 저장 | 허용 가능하지만 legacy 성격 강함 |
| `mock-delivery-api.ConsoleOrderRecord.payload` | console generated payload 저장 | 운영 추적용이지만 webhook payload와 다름 |
| `mock-delivery-api.MockWebhookLog.request_payload` | 실제 전송 payload 저장 | 타당 |
| `deeporder-backend.WebhookEvent.raw_payload` | 수신 payload 저장 | 타당 |
| `deeporder-backend.Order.raw_payload` | 주문 엔티티에도 raw payload 저장 | 추적엔 유리하나 중복 저장 |

핵심은 “주문 데이터가 여러 단계에서 중복 저장”된다는 점이지, `mock-delivery-api`가 내부 KDS 상태를 직접 갖고 있다는 문제는 아니다.

## 5. 경계 위반 의심 지점

## 5.1 `mock-delivery-api/app/console_api.py` `_generated_order_to_mock_payload`

- 파일: `mock-delivery-api/app/console_api.py`
- 함수: `_generated_order_to_mock_payload`

문제 이유:

- `GeneratedOrderOut`을 `MockOrderPayload`로 직접 변환한다.
- 결과 payload가 사실상 `deeporder-backend`의 `OrderWebhookIn`과 동일한 shape다.
- mock platform 고유 payload라기보다 DeepOrder receiver 전용 payload builder에 가깝다.

권장 조치:

- 지금은 유지 가능
- 다만 향후에는 “mock external payload”와 “DeepOrder accepted webhook contract”를 분리 문서화해야 한다.
- 장기적으로는 mock platform payload -> adapter/normalizer -> internal normalized order 흐름으로 재구성 필요

## 5.2 `deeporder-backend/app/schemas.py` `OrderWebhookIn`

- 파일: `deeporder-backend/app/schemas.py`
- 클래스: `OrderWebhookIn`, `WebhookOrderIn`, `WebhookOrderItemIn`

문제 이유:

- 현재 webhook receiver가 단일 payload schema만 수용한다.
- 실제 플랫폼별 payload 차이를 받을 adapter 계층이 없다.
- `platform: str` 필드는 있지만 schema 분기나 adapter 분기는 없다.

권장 조치:

- 현 단계에서는 유지
- 향후 `platform`별 raw payload adapter 분기 지점 도입 필요

## 5.3 `deeporder-backend/app/orders.py` `receive_order_webhook`

- 파일: `deeporder-backend/app/orders.py`
- 함수: `receive_order_webhook`

문제 이유:

- 수신, idempotency, raw event 저장, 취소 처리, order persistence, AI task enqueue까지 한 함수에 몰려 있다.
- adapter/normalizer abstraction이 없다.
- 현재는 mock payload가 바뀌면 이 함수와 schema를 같이 수정해야 한다.

권장 조치:

- `External Payload -> Adapter -> Normalized Order -> Persistence` 흐름으로 분리하는 리팩토링 후보

## 5.4 `mock-delivery-api/app/mock_orders.py` 레거시 sample order 흐름

- 파일: `mock-delivery-api/app/mock_orders.py`
- 함수: `create_sample_order`, `_resolve_order_payload`
- 연관 파일: `mock-delivery-api/app/sample_orders.py`

문제 이유:

- sample order 생성은 현재 UI 기준 핵심 흐름이 아니다.
- `STORE_001`, `mock_order_*`, `mock_evt_*` 형식이 아직 살아 있다.
- 실제 운영 경계보다 legacy/test helper 성격이 강하다.

권장 조치:

- 바로 삭제는 보류 가능
- 문서상 `Legacy/Test API`로 명확히 분류하고, 이후 제거 후보로 관리

## 5.5 `mock-delivery-api` 라우트 중복 성격

- 파일: `mock-delivery-api/app/catalog.py`
- 파일: `mock-delivery-api/app/console_api.py`

문제 이유:

- 둘 다 `/api/mock` prefix 아래에서 catalog/admin 성격이 섞여 있다.
- 동일 서비스 안의 문제라 역할 침범은 아니지만, mock platform API와 admin console API 경계가 라우트 계층에서 분리되지 않았다.

권장 조치:

- 장기적으로 `/api/mock/platform/*`와 `/api/mock/admin/*` 수준의 재분리 검토 가능

## 6. 통합하지 않는 이유

현재 통합을 보류하는 이유는 정당하다.

- 실제 외부 배달 플랫폼 API 대체 가능성을 유지해야 한다.
- `외부 플랫폼 -> webhook -> 내부 주문/KDS` 경계를 유지해야 한다.
- PoC 설명력 측면에서 mock external platform과 internal order system을 분리해두는 편이 낫다.
- 이후 실제 배민, 쿠팡이츠, 요기요 payload가 들어왔을 때 `mock-delivery-api`를 제거하거나 대체하더라도 `deeporder-backend`는 같은 역할을 유지해야 한다.

즉, 지금 문제는 “서비스를 왜 둘로 나눴느냐”가 아니라 “둘 사이 payload 계약이 실제 플랫폼 대응 가능한 수준으로 느슨한가”이다.

## 7. Webhook Payload Flow

현재 흐름은 코드 기준으로 다음과 같다.

```text
mock order 생성
-> mock/platform payload 생성
-> webhook 전송
-> deeporder-backend webhook 수신
-> eventId idempotency 처리
-> 내부 Order / OrderItem 저장
-> AI 분석 enqueue
-> KDS 조회 모델 반영
```

## 7.1 단계: Mock Order 생성

위치:

- 파일: `mock-delivery-api/app/console_api.py`
- 함수: `generate_order`

입력:

- `store_id`
- catalog DB의 `Store`, `Menu`, `OptionGroup`, `Option`

출력:

- `GeneratedOrderOut`

비고:

- console용 generated order shape다.
- webhook payload shape와 동일하지 않다.
- `orderId`는 `_next_record_id(db, "ORDER")`로 생성된다.

레거시 별도 생성 위치:

- 파일: `mock-delivery-api/app/sample_orders.py`
- 함수: `create_sample_order_payload`

비고:

- legacy/test 성격의 mock payload 생성기다.
- `mock_evt_*`, `mock_order_*` 형식 사용

## 7.2 단계: Webhook Payload 생성

위치:

- 파일: `mock-delivery-api/app/console_api.py`
- 함수: `_generated_order_to_mock_payload`

입력:

- `GeneratedOrderOut`

출력:

- `MockOrderPayload`

비고:

- `eventId`를 새로 생성한다.
- `order.orderId`는 console generated order의 `orderId`를 재사용한다.
- `orderNumber`도 `orderId`로 채운다.
- 선택 옵션은 `"groupName: optionName"` 문자열 배열로 평탄화된다.

평가:

- 현재 구조는 mock platform 고유 payload를 만드는 것처럼 보이지만
- 실제로는 DeepOrder receiver가 요구하는 구조에 직접 맞춘 payload builder다

## 7.3 단계: Webhook 전송

위치:

- 파일: `mock-delivery-api/app/console_api.py`
- 함수: `send_order`
- 파일: `mock-delivery-api/app/mock_orders.py`
- 함수: `send_order_to_deeporder`

현재 전송 계약:

```text
POST {WEBHOOK_URL}
Headers:
- Content-Type: application/json
- Authorization: Bearer {api_key}  (console active config에 있을 때만)

Body:
- MockOrderPayload JSON

Success condition:
- HTTP 2xx

Failure handling:
- response text 또는 HTTP exception string을 로그/record에 저장
- retry 없음
- timeout 10s
```

비고:

- signature/header 인증 없음
- retry 없음
- `mock_orders.py` 경로와 `console_api.py` 경로가 일부 중복된 전송 역할을 가진다

## 7.4 단계: Webhook 수신

위치:

- 파일: `deeporder-backend/app/orders.py`
- 함수: `receive_order_webhook`
- 경로: `POST /api/external/orders/webhook`

수신 schema:

- `deeporder-backend/app/schemas.py`
- `OrderWebhookIn`

처리:

- `eventId`로 `WebhookEvent` 중복 검사
- raw payload를 `WebhookEvent.raw_payload`에 저장
- `platform + payload.order.orderId`로 기존 주문 조회
- `ORDER_CANCELLED`면 상태 취소 처리
- 신규면 `Order`, `OrderItem`, `OrderAIAnalysis(PENDING)` 생성
- commit 후 AI background task enqueue

## 7.5 단계: 정규화 / 내부 반영

현재는 명시적 adapter가 없다.

실제 흐름:

```text
External Payload
-> OrderWebhookIn
-> receive_order_webhook()
-> Order / OrderItem DB rows
-> OrderAIAnalysis row
-> KDS View (`GET /api/kds/orders`)
```

즉 현재는 아래 구조가 아니다.

```text
External Payload
-> Platform Adapter
-> Normalized Order
-> Internal Order Model
-> KDS View Model
```

현재는 adapter와 normalized order 중간층 없이 바로 internal DB model로 들어간다.

## 8. Current Mock Payload Contract

## 8.1 Current Mock Delivery Payload

현재 mock webhook payload 최소 구조:

```json
{
  "eventId": "EVENT_xxx or mock_evt_xxx",
  "eventType": "ORDER_CREATED or ORDER_CANCELLED",
  "platform": "MOCK_DELIVERY",
  "storeId": "STORE_FLAT",
  "order": {
    "orderId": "ORDER_xxx or mock_order_xxx",
    "orderNumber": "ORDER_xxx or M-xxxxxx",
    "customerRequest": "...",
    "deliveryRequest": "...",
    "orderedAt": "ISO datetime",
    "items": [
      {
        "name": "...",
        "quantity": 1,
        "options": ["..."],
        "unitPrice": 12000,
        "totalPrice": 12000
      }
    ]
  }
}
```

## 8.2 DeepOrder Webhook Receiver Contract

`deeporder-backend`가 현재 기대하는 계약:

- body는 `OrderWebhookIn` shape여야 함
- `eventId` 필수
- `eventType`은 현재 `ORDER_CREATED`, `ORDER_CANCELLED`만 허용
- `platform` 문자열 필요
- `storeId` 필요
- `order.orderId`, `order.orderNumber`, `items[]` 필요

현재는 mock payload가 곧 receiver contract다.

## 8.3 idempotency 전략

현재 전략:

- 이벤트 중복 판별: `WebhookEvent.event_id == payload.eventId`
- 주문 중복 판별: `Order.platform + Order.external_order_id`

장점:

- event replay와 order duplicate를 분리해 본다.

제약:

- 플랫폼별 `eventId` 정책이 다르면 확장 전략이 추가로 필요하다.
- `eventType + occurredAt + platformOrderId` 조합 같은 대체 전략은 아직 없다.

## 8.4 raw payload 보존

현재 raw payload 보존은 있다.

- `deeporder-backend.WebhookEvent.raw_payload`
- `deeporder-backend.Order.raw_payload`
- `mock-delivery-api.MockWebhookLog.request_payload`

이 점은 실제 플랫폼 대응 준비도 측면에서 긍정적이다.

## 9. Adapter Readiness

### 9.1 현재 구조 평가

- mock 전용 payload에 강하게 맞춰져 있다.
- 실제 platform payload 추가는 가능하지만 “adapter 추가만으로 끝나는 구조”는 아직 아니다.
- 현재는 schema와 receiver 함수를 직접 건드려야 할 가능성이 높다.

### 9.2 실제 플랫폼 payload가 다를 경우 수정 지점

질문에 대한 현재 답:

1. 실제 배민 payload가 현재 mock payload와 다르면 어디를 수정해야 하는가?
   - `deeporder-backend/app/schemas.py`
   - `deeporder-backend/app/orders.py`
   - 필요 시 `mock-delivery-api`의 payload builder

2. 실제 쿠팡이츠 payload가 다른 구조라면 adapter를 추가할 수 있는가?
   - 가능은 하지만 현재 전용 adapter 슬롯은 없다.
   - 새 service/module을 도입해야 자연스럽다.

3. 현재 webhook endpoint가 mock payload에만 강하게 묶여 있지는 않은가?
   - 그렇다. 현재는 사실상 그렇다.

4. `platform_type` 또는 source 필드로 플랫폼을 구분하고 있는가?
   - `platform` 문자열 필드는 있다.
   - 하지만 분기 처리 로직은 없다.

5. 원본 raw payload를 저장하고 있는가?
   - 예.

6. 정규화 실패 시 원본 이벤트를 재처리할 수 있는가?
   - raw payload는 남지만, 재처리 API/재시도 흐름은 없다.

7. `eventId`가 플랫폼마다 다를 경우 idempotency key 전략을 바꿀 수 있는가?
   - 가능은 하지만 현재 구현은 `eventId` 단일 전략에 고정돼 있다.

8. header signature 검증이 추가될 경우 어디에 들어가야 하는가?
   - 현재 적절한 계층이 없다.
   - `receive_order_webhook` 앞단 dependency 또는 middleware/adapter 계층이 필요하다.

9. 주문 취소/변경/상태 업데이트 이벤트를 payload type별로 처리할 수 있는가?
   - 현재는 `ORDER_CREATED`, `ORDER_CANCELLED`만 부분 지원한다.
   - 확장 구조는 미약하다.

10. `mock-delivery-api` 제거 후 실제 platform adapter를 붙일 수 있는가?
   - 가능은 하다.
   - 다만 현재는 adapter layer를 먼저 도입하는 편이 훨씬 안전하다.

## 10. Future Real Platform Payload Strategy

이상적인 방향은 다음이다.

```text
mock_delivery payload
baemin payload
coupang_eats payload
yogiyo payload
-> platform-specific adapter
-> normalized order schema
-> internal order persistence
-> kds view
```

권장 추가 지점:

- `deeporder-backend/app/adapters/` 또는 `app/platforms/`
- `mock_delivery.py`
- `baemin.py`
- `coupang_eats.py`
- `yogiyo.py`

그리고 내부적으로는 다음 중간 schema가 필요하다.

```text
Normalized Order Schema
- platform
- external_event_id
- external_order_id
- store_id
- order_number
- customer_request
- delivery_request
- occurred_at / ordered_at
- items[]
- event_type
- raw_payload
```

현재는 이 중간층이 문서로도, 코드로도 없다.

## 11. Risks

- mock payload와 internal order model이 너무 강하게 결합되어 있다.
- webhook receiver가 adapter 없이 단일 payload schema만 받는다.
- `mock-delivery-api`의 generated order와 webhook payload가 분리되어 있지만, 최종적으로는 DeepOrder 수신 계약에 직접 맞춰진다.
- `eventId` 기반 idempotency가 실제 플랫폼별 전략 차이를 아직 반영하지 못한다.
- signature/authentication 확장 지점이 없다.
- `mock_orders.py`의 sample flow는 legacy/test 성격이 강하고 현재 구조 이해를 흐릴 수 있다.

## 12. 권장 다음 작업

### 12.1 지금 바로 수정할 항목

없음.

이번 단계에서는 코드 수정이 아니라 문서화와 경계 인식 정리가 우선이다.

### 12.2 문서만 보강할 항목

- `mock-delivery-api`는 “mock external platform”이라는 설명을 README에 더 명확히 적기
- `deeporder-backend`는 “internal order/KDS backend”라는 설명을 README에 더 명확히 적기
- sample order API를 `Legacy/Test API`로 문서 분류하기

### 12.3 장기적으로 adapter화할 항목

- `deeporder-backend` webhook receiver 앞단의 platform adapter 계층
- normalized order schema 정의
- signature 검증 지점
- event type 확장 구조
- raw payload 재처리 흐름

## 13. 최종 판단

최종적으로 현재 구조는 다음처럼 평가할 수 있다.

```text
mock-delivery-api는 외부 배달 플랫폼 시뮬레이터로 남기고,
deeporder-backend는 내부 주문/KDS 백엔드로 유지하는 방향이 맞다.

다만 현재는 payload 계약이 mock 전용에 가깝고,
real platform adapter를 바로 꽂기 좋은 구조까지는 아직 아니다.
```

즉 다음 단계의 핵심은 백엔드 통합이 아니라:

- 역할 경계 유지
- payload 계약 분리
- adapter/normalizer 구조 설계

이 세 가지다.
