# Platform Adapter Design

작업 기록: `mock-delivery-api`와 실제 외부 플랫폼 payload를 동일한 내부 주문 모델로 수용하기 위해, adapter/normalizer 경계를 어디에 둘지 설계한 문서이다.

## 1. 목표

이 설계의 목표는 단순하다.

```text
mock payload와 internal order model 사이에 명확한 경계를 만든다.
실제 외부 플랫폼 payload가 들어와도 수정 범위를 adapter 계층으로 제한한다.
```

즉 다음은 하지 않는다.

- `mock-delivery-api` 제거
- 서비스 통합
- `deeporder-backend`에 mock admin/catalog 로직 혼합

대신 다음을 설계한다.

- platform adapter 경계
- normalized order schema
- receiver -> adapter -> persistence 흐름

## 2. 이상적인 목표 구조

```text
Mock Delivery Payload
Baemin Payload
Coupang Eats Payload
Yogiyo Payload
        ↓
Platform Adapter
        ↓
Normalized Order Schema
        ↓
Internal Order Model
        ↓
KDS View
```

## 3. 현재 구조와 문제

현재 구조:

```text
Mock Payload
-> deeporder-backend webhook schema
-> Order DB model
-> KDS View
```

현재 문제:

- adapter가 없다
- normalized schema가 없다
- receiver schema가 사실상 mock payload를 정답으로 본다
- 실제 payload가 바뀌면 receiver와 persistence가 같이 흔들린다

## 4. 권장 경계

권장 계층은 다음과 같다.

### 4.1 Receiver Layer

책임:

- HTTP request 수신
- platform 식별
- raw body / headers 확보
- signature 검증 호출
- adapter 선택

하지 말아야 할 일:

- platform-specific 필드명 직접 해석
- internal order DB 생성

### 4.2 Adapter Layer

책임:

- platform별 raw payload 파싱
- 필드명 변환
- 이벤트 타입 매핑
- store/order identity 추출
- normalized schema 생성

예상 위치:

```text
deeporder-backend/app/adapters/
  base.py
  mock_delivery.py
  baemin.py
  coupang_eats.py
  yogiyo.py
```

### 4.3 Normalizer Contract

adapter의 출력은 모두 동일한 normalized schema여야 한다.

즉 adapter는:

```text
raw payload -> NormalizedOrderEvent
```

만 수행한다.

### 4.4 Persistence Layer

책임:

- normalized event를 internal DB model로 저장
- idempotency 처리
- 상태 전이 반영
- KDS projection 준비

즉:

```text
NormalizedOrderEvent -> Order / OrderItem / WebhookEvent / AI rows
```

## 5. Suggested Module Split

권장 코드 구조:

```text
deeporder-backend/app/
  receivers/
    webhooks.py
  adapters/
    base.py
    mock_delivery.py
    baemin.py
    coupang_eats.py
    yogiyo.py
  normalization/
    schemas.py
  services/
    order_ingestion.py
    ai_request_analyzer.py
  repositories/
    orders.py
```

최소 버전에서는 `repositories/`까지는 없어도 된다.
하지만 아래 분리는 필요하다.

- receiver
- adapter
- normalized schema
- ingestion service

## 5.1 현재 구현 상태

현재 repository에 반영된 파일:

```text
deeporder-backend/app/normalization/__init__.py
deeporder-backend/app/normalization/schemas.py
deeporder-backend/app/adapters/__init__.py
deeporder-backend/app/adapters/base.py
deeporder-backend/app/adapters/mock_delivery.py
deeporder-backend/app/adapters/registry.py
deeporder-backend/app/routers/__init__.py
deeporder-backend/app/routers/order_webhooks.py
deeporder-backend/app/routers/kds_orders.py
deeporder-backend/app/routers/order_status.py
deeporder-backend/app/services/order_ingestion.py
deeporder-backend/tests/test_order_ingestion.py
deeporder-backend/tests/test_mock_delivery_adapter.py
deeporder-backend/tests/test_order_webhook.py
```

현재 구현된 adapter 목록:

- `MockDeliveryAdapter`

아직 미구현인 adapter 목록:

- `BaeminAdapter`
- `CoupangEatsAdapter`
- `YogiyoAdapter`

## 6. Adapter Interface

권장 인터페이스 예시:

```text
class PlatformAdapter:
    platform_name: str

    def can_handle(self, request) -> bool
    def validate_signature(self, headers, body) -> None
    def parse_event(self, headers, body) -> NormalizedOrderEvent
```

mock adapter 예시 역할:

- `platform == MOCK_DELIVERY` 확인
- 현재 mock payload shape 파싱
- `NormalizedOrderEvent` 반환

baemin adapter 예시 역할:

- 배민 전용 headers/body 파싱
- 배민 필드명을 normalized schema로 변환

현재 구현 기준:

- `PlatformAdapter.can_handle(headers, body)`
- `PlatformAdapter.validate_signature(headers, raw_body, body)`
- `PlatformAdapter.parse_event(headers, body) -> NormalizedOrderEvent`

현재 signature validation 규약:

- `PlatformAdapter.validate_signature()`는 adapter별 인증/서명 검증 확장 지점이다.
- 기본 예외 타입은 `app/adapters/base.py`의 `SignatureValidationError`다.
- 기본 실패 응답 규약은 `401 Unauthorized`다.
- `MockDeliveryAdapter`는 local mock platform이므로 명시적 no-op override를 둔다.
- 실제 signed platform adapter는 `validate_signature()`를 override해서 검증 실패 시 `SignatureValidationError`를 raise 해야 한다.

## 7. Normalized Order -> Internal Model Mapping

normalized event 이후에는 platform 차이를 잊어야 한다.

매핑 기준:

- `sourcePlatform` -> `Order.platform`
- `sourceOrderId` -> `Order.external_order_id`
- `sourceStoreId` -> `Order.store_id`
- `sourceOrderNumber` -> `Order.order_number`
- `customerRequest` -> `Order.customer_request`
- `deliveryRequest` -> `Order.delivery_request`
- `rawPayload` -> `WebhookEvent.raw_payload`, `Order.raw_payload`

추가 권장:

- `rawHeaders`도 별도 저장 가능성 검토
- adapter name / adapter version 기록 검토

현재 구현 상태:

- `NormalizedOrderEvent`는 도입되었다.
- `order_ingestion.py`는 `NormalizedOrderEvent`를 입력으로 받아 기존 `Order`, `OrderItem`, `WebhookEvent`, `OrderAIAnalysis`를 생성한다.
- `OrderItem.options` 저장은 현재 문자열 리스트를 유지한다.
  즉 normalized option object를 DB에 그대로 저장하지는 않는다.
- `raw_headers`는 adapter/normalization 경계에서만 보존하고, 현재는 DB에 저장하지 않는다.

## 7.1 External Payload Boundary Rules

외부 payload와 내부 ORM Entity 사이에는 다음 경계를 유지한다.

- 외부 플랫폼의 `id`, `orderId`, `eventId`, item id는 내부 DB primary key로 사용하지 않는다.
- adapter는 외부 payload를 `NormalizedOrderEvent`로 변환할 뿐, `Order`, `OrderItem`, `WebhookEvent`, `OrderAIAnalysis` 같은 내부 Entity를 직접 만들지 않는다.
- adapter는 내부 Entity의 `id`, `created_at`, `updated_at`, relationship field를 직접 결정하지 않는다.
- 내부 Entity 생성, 내부 id 부여, 관계 연결은 `order_ingestion` service가 담당한다.
- `raw_payload`는 감사/디버깅용으로 저장하지만 내부 모델과 직접 동일시하지 않는다.

현재 구현 기준:

- `MockDeliveryAdapter`는 `NormalizedOrderEvent`만 반환한다.
- `order_ingestion.py`가 명시적 필드 매핑으로 `WebhookEvent`, `Order`, `OrderItem`, `OrderAIAnalysis`를 생성한다.
- `OrderItem` 관계 연결도 ingestion/service 레이어에서 수행한다.

현재 raw headers 정책:

```text
현 단계에서는 raw headers persistence를 추가하지 않는다.
실제 플랫폼 signed webhook 도입 전까지는 raw payload 보존만 유지한다.
```

향후 재검토 원칙:

- 전체 raw headers 저장은 기본 선택지로 두지 않는다.
- 실제 필요가 생기면 allowlist된 audit header만 저장하는 방향을 우선 검토한다.

현재 adapter version 정책:

```text
현 단계에서는 adapter version persistence를 추가하지 않는다.
```

판단 근거:

- 현재 구현 adapter는 `MockDeliveryAdapter` 1개뿐이다.
- payload contract variation이 아직 없고, version metadata가 실제 분기나 장애 분석에 쓰이지 않는다.
- DB schema 변경 없이도 현재는 `platform + raw_payload + git history`로 추적이 가능하다.

향후 조건:

- 실제 platform adapter가 2개 이상으로 늘어나는 경우
- 동일 platform adapter가 복수 payload contract version을 지원하게 되는 경우
- replay / audit / incident 분석에서 adapter revision 추적이 필요한 경우

위 조건이 생기면 다음 필드 중 하나 이상을 저장 대상으로 재검토한다.

- `adapter_name`
- `adapter_version`
- `payload_contract_version`

## 8. Platform별 수정 범위 예측

### 8.1 Baemin payload 도입 시

이상적 수정 범위:

- `app/adapters/baemin.py` 추가
- 필요 시 adapter registry 업데이트
- 테스트 추가

수정되면 안 되는 곳:

- KDS API
- internal order query
- AI analysis service

### 8.2 Coupang Eats payload 도입 시

이상적 수정 범위:

- `app/adapters/coupang_eats.py` 추가
- 테스트 추가

수정되면 안 되는 곳:

- `Order` DB model 구조 전체
- KDS view model

### 8.3 Yogiyo payload 도입 시

이상적 수정 범위:

- `app/adapters/yogiyo.py` 추가
- adapter registry 업데이트

수정되면 안 되는 곳:

- receiver 핵심 흐름
- AI 분석 파이프라인

## 9. Mock Adapter의 위치

`mock-delivery-api`는 계속 외부 mock platform 역할을 맡는다.

따라서 `deeporder-backend` 안의 mock 관련 책임은 다음까지만 허용된다.

- `mock_delivery` payload를 해석하는 adapter

허용되지 않는 것:

- mock catalog 관리
- mock 주문 생성
- mock console admin API

즉 `deeporder-backend` 안에 들어오는 mock 관련 코드는 “수신 adapter”까지만 허용된다.

## 10. 단계별 다음 작업

1. `ORDER_CANCELLED` end-to-end 검증 보강
2. raw headers 저장 여부 결정
3. signature validation 실구현 시 확장 지점 고정
4. platform별 adapter 추가 시 registry 테스트 패턴 확장
5. 필요 시 receiver / ingestion / status query 파일 분리

## 10.0 Registry 테스트 패턴

adapter registry 테스트는 각 adapter의 세부 파싱 테스트와 분리해서 유지한다.

권장 검증 패턴:

- supported payload를 넣었을 때 기대 adapter 인스턴스를 반환하는지 확인
- unsupported payload를 넣었을 때 `UnsupportedPlatformError`를 반환하는지 확인
- 새 platform adapter를 추가할 때는 registry 테스트에 supported case 1개와 unsupported/ambiguity case 1개 이상을 같이 추가

현재 구현 파일:

```text
deeporder-backend/tests/test_adapter_registry.py
```

## 10.1 현재 receiver 흐름

현재 `deeporder-backend/app/routers/order_webhooks.py`의 webhook receiver 흐름:

```text
Request 수신
-> raw body 읽기
-> JSON body 파싱
-> headers dict 추출
-> adapter registry에서 adapter 선택
-> adapter.validate_signature()
-> adapter.parse_event()
-> ingest_order_event()
-> AI background task enqueue
```

## 10.2 현재 ingestion service 흐름

현재 `deeporder-backend/app/services/order_ingestion.py` 흐름:

```text
NormalizedOrderEvent
-> eventId 중복 검사
-> WebhookEvent 저장
-> 주문 중복 검사
-> ORDER_CREATED / ORDER_CANCELLED 분기
-> Order / OrderItem / OrderAIAnalysis 생성
-> WebhookResponse 반환
```

## 11. 결론

다음 작업의 중심은 백엔드 통합이 아니다.

다음 작업의 중심은:

```text
Webhook Payload Contract 확정
Platform Adapter 경계 설계
Normalized Order Schema 도입
```

이 세 가지다.

이 경계가 먼저 생겨야 나중에 `mock-delivery-api`를 유지하든 교체하든, `deeporder-backend`가 실제 외부 플랫폼을 수용할 수 있다.
