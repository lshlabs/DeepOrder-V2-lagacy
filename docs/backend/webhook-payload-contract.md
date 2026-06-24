# Webhook Payload Contract

작업 기록: mock payload를 정답 schema로 간주하지 않고, 실제 외부 배달 플랫폼 webhook으로 교체 가능한 수신 계약을 정의하기 위해 작성한 계약 문서이다.

## 1. 목적

이 문서의 목적은 다음과 같다.

- 현재 `mock-delivery-api`가 생성하는 webhook payload를 하나의 임시 외부 플랫폼 payload로 정의한다.
- `deeporder-backend`가 외부 플랫폼으로부터 받아야 하는 최소 수신 계약을 분리해서 정의한다.
- 향후 배민, 쿠팡이츠, 요기요 등 실제 payload가 들어와도 수정 범위가 adapter 계층에 머물도록 기준을 만든다.

핵심 원칙:

```text
mock payload는 정답 schema가 아니다.
mock payload는 외부 플랫폼 payload의 한 종류일 뿐이다.
```

## 2. Current Mock Delivery Payload

현재 `mock-delivery-api`가 전송하는 payload는 다음 shape를 가진다.

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

현재 특성:

- `platform`은 `MOCK_DELIVERY`
- `eventId`는 mock 쪽에서 생성
- `orderId`는 console generated order를 재사용하거나 sample generator가 생성
- 선택 옵션은 문자열 배열로 평탄화됨
- signature 검증 없음
- header 기반 인증 계약 없음

## 3. DeepOrder Webhook Receiver Contract

`deeporder-backend`가 외부 플랫폼으로부터 기대해야 하는 계약은 mock payload의 현재 shape와 분리해서 생각해야 한다.

현재 권장 수신 계약은 다음 수준이다.

### 3.1 Transport Contract

```text
Method: POST
Content-Type: application/json
Authentication: optional today, extensible later
Signature: not required today, pluggable later
```

### 3.2 Envelope Contract

외부 payload는 최소한 다음 메타 정보를 식별 가능해야 한다.

```text
platform
event type
external event id or equivalent idempotency material
store identity
order identity
raw payload
```

### 3.3 Receiver Responsibility

receiver는 다음을 해야 한다.

- raw payload 수신
- platform 판별
- adapter 선택
- normalized order 변환
- idempotency 판단
- internal persistence
- KDS projection 반영

receiver가 하면 안 되는 것:

- mock payload shape를 정답으로 가정
- 단일 mock schema에만 맞는 필드명에 직접 결합
- adapter 없이 raw payload를 바로 internal DB model로 저장

## 4. Normalized Order Schema

platform별 payload를 내부 저장 모델로 넣기 전, 하나의 중간 표준 구조가 필요하다.

권장 normalized schema는 다음과 같다.

```text
NormalizedOrderEvent
- sourcePlatform
- sourceEventId
- sourceEventType
- sourceOccurredAt
- sourceStoreId
- sourceOrderId
- sourceOrderNumber
- customerRequest
- deliveryRequest
- orderChannel
- fulfillmentType
- currency
- items[]
- rawPayload
- rawHeaders
```

`items[]`는 다음 기준을 가진다.

```text
NormalizedOrderItem
- externalLineId
- name
- quantity
- unitPrice
- totalPrice
- options[]
- notes[]
```

`options[]`는 다음 기준을 가진다.

```text
NormalizedOrderOption
- groupName
- optionName
- optionType
- additionalPrice
- rawOption
```

## 4.1 External Payload vs Internal Entity Boundary

다음 원칙을 유지한다.

```text
외부 플랫폼 payload의 id/orderId/eventId는 내부 DB primary key로 사용하지 않는다.
Adapter는 외부 payload를 NormalizedOrderEvent로 변환할 뿐, 내부 Entity의 id, created_at, updated_at, relationship field를 직접 결정하지 않는다.
내부 Entity 생성, 내부 id 부여, 관계 연결은 order_ingestion service가 담당한다.
raw_payload는 보존하되 내부 모델과 직접 동일시하지 않는다.
```

구체 규칙:

- 외부 `eventId`는 `WebhookEvent.event_id` 같은 외부 식별자 필드로 보존한다.
- 외부 `orderId`는 `Order.external_order_id` 같은 외부 식별자 필드로 보존한다.
- 외부 item id가 있더라도 내부 `OrderItem.id`에 넣지 않는다.
- 외부 `createdAt`, `updatedAt` 같은 시간 필드는 내부 row 생성 시간과 분리한다.
- 외부 발생 시각은 `ordered_at`, `source_occurred_at` 같은 별도 필드로 저장한다.

이 schema의 목적:

- mock payload와 internal DB model 사이의 중간 경계
- platform별 필드명 차이 흡수
- 실제 플랫폼별 adapter 결과를 한 곳으로 수렴

현재 구현 상태:

- `deeporder-backend/app/normalization/schemas.py`에
  - `NormalizedOrderEvent`
  - `NormalizedOrderItem`
  - `NormalizedOrderOption`
  가 구현되어 있다.
- 현재 mock adapter는 이 schema를 실제로 반환한다.

## 5. Idempotency Strategy

현재 `eventId` 단일 전략은 mock 환경에서는 충분하지만, 실제 플랫폼 연동을 고려하면 더 일반화가 필요하다.

권장 전략:

```text
Primary:
- sourcePlatform + sourceEventId

Fallback candidates:
- sourcePlatform + sourceOrderId + sourceEventType + sourceOccurredAt
```

문서상 정책:

- `sourceEventId`가 있으면 최우선 사용
- 플랫폼이 명시적 event id를 주지 않으면 fallback key 조합 허용
- raw payload는 재처리 가능성을 위해 반드시 저장

## 6. Raw Payload Preservation

원본 payload 보존은 필수다.

보존 이유:

- 정규화 실패 시 재처리
- adapter 버그 수정 후 replay
- 플랫폼별 계약 변경 추적
- signature 검증 실패 분석

권장 저장 대상:

- raw JSON body
- request headers
- receivedAt
- sourcePlatform
- adapter version

현재 구현 상태:

- `raw_payload`는 `NormalizedOrderEvent`에 포함되고, 이후 `WebhookEvent.raw_payload`, `Order.raw_payload`로 저장된다.
- `raw_headers`는 `NormalizedOrderEvent`에 포함되지만, 현재 DB에는 저장되지 않는다.
- 즉 header 보존은 메모리 경계까지는 구현되었고, persistence는 의도적으로 미구현 상태다.

현재 결정:

```text
현 단계에서는 raw headers를 DB에 저장하지 않는다.
```

결정 이유:

- 현재 mock 환경에는 signature 계약이 없고, header 자체의 운영 가치가 낮다.
- `WebhookEvent`, `Order` 모델에 header 저장 컬럼이 없으며, 이번 단계 원칙은 DB schema 대규모 변경을 피하는 것이다.
- request header에는 Authorization, Cookie, User-Agent, proxy 계열 값처럼 저장 가치보다 노이즈와 민감정보 리스크가 큰 항목이 섞일 수 있다.
- 현재 디버깅/재처리 기준의 핵심 보존 대상은 `raw_payload`이며, header까지 영속화하지 않아도 현재 mock 운영 시나리오에는 충분하다.

향후 재검토 기준:

```text
실제 signed platform 연동이 시작되면
전체 raw headers 저장이 아니라 allowlist header persistence만 검토한다.
```

우선 검토 대상 allowlist 예시:

- platform signature header
- request id / trace id
- source platform 식별용 custom header
- webhook delivery attempt id

## 6.1 Adapter Version Policy

현재 결정:

```text
현 단계에서는 adapter version을 DB에 저장하지 않는다.
```

결정 이유:

- 현재 운영 adapter는 `MockDeliveryAdapter` 1개뿐이며, mock payload contract도 단일 경로로 고정돼 있다.
- `WebhookEvent`, `Order` 어느 쪽에도 adapter version을 저장할 필드가 없고, 이번 단계에서는 DB schema 확장을 하지 않는다.
- 현재 replay/debug에는 `platform + raw_payload + 코드 이력` 조합으로 충분하다.
- mock-only 단계에서 adapter version을 저장해도 실제 운영 판단에 쓰일 곳이 없다.

향후 재검토 조건:

```text
다중 실제 platform adapter가 도입되거나,
같은 platform 안에서 payload contract version drift가 생기기 시작하면
adapter_name / adapter_version / payload_contract_version 중 최소 하나는 저장을 재검토한다.
```

권장 우선순위:

1. `adapter_name`
2. `adapter_version`
3. `payload_contract_version`

현재 판단:

```text
adapter version 저장은 지금 단계의 필수 항목이 아니다.
다만 실제 외부 플랫폼 도입 전에는 재검토가 필요한 운영 준비 항목이다.
```

## 7. Signature / Authentication Strategy

현재는 미구현이어도, 확장 위치는 미리 고정해야 한다.

권장 위치:

```text
HTTP Request
-> signature/auth validation layer
-> platform adapter
-> normalized order
```

주의:

- signature 검증은 internal order persistence 이후에 두면 안 된다.
- platform별 header 규칙은 adapter 앞단 또는 adapter 초기 단계에서 처리해야 한다.

현재 구현 상태:

- receiver는 `adapter.validate_signature(headers, raw_body, body)`를 호출한다.
- 공통 예외 규약으로 `app/adapters/base.py`의 `SignatureValidationError`를 사용한다.
- 기본 HTTP 응답 규약은 `401 Unauthorized` + `Webhook signature validation failed.` 이다.
- 현재 `MockDeliveryAdapter`는 서명 검증이 없는 local mock platform으로 명시적으로 no-op override를 둔다.
- 즉 호출 지점과 실패 규약은 고정되었고, 실제 플랫폼별 검증 로직은 아직 없다.

실제 adapter 구현 규칙:

```text
1. receiver는 모든 webhook request에서 validate_signature()를 먼저 호출한다.
2. adapter는 signature/auth 규칙이 필요 없으면 명시적으로 no-op override를 둘 수 있다.
3. adapter는 검증 실패 시 SignatureValidationError를 raise 한다.
4. parse_event() 이전에 validate_signature()가 성공해야 한다.
```

예시:

```python
from app.adapters.base import PlatformAdapter, SignatureValidationError


class ExampleSignedAdapter(PlatformAdapter):
    platform_name = "EXAMPLE_SIGNED"

    def can_handle(self, headers, body) -> bool:
        return headers.get("x-example-platform") == "example-signed"

    def validate_signature(self, headers, raw_body, body) -> None:
        signature = headers.get("x-example-signature")
        if not signature or signature != "expected":
            raise SignatureValidationError("Missing or invalid webhook signature.")
```

현재 mock 정책:

```text
MockDeliveryAdapter는 local development 전용 unsigned webhook sender를 허용한다.
따라서 validate_signature()는 명시적 no-op이다.
```

## 8. Event Type Strategy

현재 mock 환경은 `ORDER_CREATED`, `ORDER_CANCELLED` 위주다.

실제 확장을 고려한 권장 event type 범위:

- `ORDER_CREATED`
- `ORDER_UPDATED`
- `ORDER_CANCELLED`
- `ORDER_ACCEPTED`
- `ORDER_REJECTED`
- `ORDER_READY`
- `DELIVERY_STATUS_UPDATED`

정책:

- internal model은 platform event type을 그대로 저장
- business handling은 normalized event type 기준으로 분기

## 9. Current Gaps

현재 코드 기준 gap:

- `deeporder-backend` receiver가 mock payload shape에 직접 결합된 정도는 크게 줄었다.
- raw headers persistence가 없다.
- signature 검증 실구현은 아직 없다.
- event type 확장 구조가 약하다.
- `ORDER_CANCELLED` end-to-end 자동 검증이 아직 부족하다.

## 9.1 현재 구현된 Mock Delivery Adapter 계약

구현 파일:

```text
deeporder-backend/app/adapters/mock_delivery.py
```

현재 adapter가 처리하는 것:

- `platform == MOCK_DELIVERY`
- `eventId`, `eventType`, `storeId`, `order.*`, `order.items[]` 파싱
- string option을 `NormalizedOrderOption`으로 정규화
- `raw_payload`, `raw_headers` 포함한 `NormalizedOrderEvent` 반환

string option 정규화 규칙:

```text
"맵기: 보통"
-> group_name="맵기"
-> option_name="보통"

"치즈 추가"
-> group_name=None
-> option_name="치즈 추가"
```

## 10. Open Questions

- 실제 배민 webhook에 `eventId`가 있는가
- 실제 쿠팡이츠 payload에서 store 식별자가 어떤 이름인가
- 옵션 구조가 문자열인지 객체 배열인지
- 취소/변경 이벤트가 full snapshot인지 delta인지
- platform별 인증 방식이 header signature인지 bearer token인지

## 11. 결론

`deeporder-backend`가 받아야 하는 것은 “mock payload”가 아니라 “외부 플랫폼 이벤트”다.

따라서 앞으로의 설계 기준은 다음과 같이 고정한다.

```text
External Payload
-> Receiver Contract
-> Platform Adapter
-> Normalized Order Schema
-> Internal Order Model
-> KDS View
```
