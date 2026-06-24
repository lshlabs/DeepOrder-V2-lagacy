현재 `mock-delivery-api`와 `deeporder-backend`를 통합하려던 방향을 보류한다.

이유는 다음과 같다.

`mock-delivery-api`는 현재 실제 배달 플랫폼 API, 예를 들어 배민/쿠팡이츠/요기요 같은 API를 제공받기 어려운 상황에서 만든 임의의 주문 생성기이자, 가짜 외부 배달 플랫폼 시뮬레이터이다.

따라서 이 서비스를 `deeporder-backend`에 바로 통합해버리면, DeepOrder의 중요한 설계 의도인 “외부 플랫폼 → Webhook → 내부 주문/KDS 시스템” 경계가 흐려질 수 있다.

현재 구조는 다음 의미를 가진다.

```text
mock-delivery-api
= 실제 배달 플랫폼을 대체하는 Mock External Platform

deeporder-backend
= 외부 플랫폼 webhook을 수신하고 주문을 정규화하여 KDS에 제공하는 Internal Order/KDS Backend
```

이 경계는 추후 실제 배민/쿠팡이츠 같은 외부 API를 제공받았을 때도 중요하다.
실제 플랫폼이 들어오면 `mock-delivery-api`를 제거하거나 대체하고, `deeporder-backend`는 동일하게 webhook 수신, idempotency 처리, 주문 정규화, KDS 제공 역할을 유지할 수 있어야 한다.

따라서 지금은 통합 구현을 진행하지 않는다.

대신 작업 방향을 다음으로 선회한다.

```text
목표:
mock-delivery-api와 deeporder-backend의 역할 구분이 현재 코드에서 제대로 지켜지고 있는지 검사한다.
```

구체적으로 다음을 확인해라.

## 1. mock-delivery-api 역할 검사

`mock-delivery-api`가 아래 역할에만 머물고 있는지 확인한다.

* Mock Delivery Platform 역할
* Store/Menu/Option catalog 관리
* Mock 주문 생성
* Mock 주문 전송
* Webhook payload 생성
* DeepOrder Backend로 webhook 전송
* 전송 로그 기록
* 콘솔에서 사용하는 mock/admin API 제공

확인할 것:

* `mock-delivery-api`가 KDS 주문 상태를 직접 관리하고 있지 않은지
* `mock-delivery-api`가 DeepOrder 내부 주문 모델을 직접 알고 있지 않은지
* `mock-delivery-api`가 KDS 조회 API 역할을 하고 있지 않은지
* `mock-delivery-api`가 AI 요청사항 분석을 직접 수행하고 있지 않은지
* `mock-delivery-api`가 내부 주문 저장소 역할까지 맡고 있지 않은지

## 2. deeporder-backend 역할 검사

`deeporder-backend`가 아래 역할에 집중하고 있는지 확인한다.

* 외부 webhook 수신
* eventId 기반 idempotency 처리
* platform payload 정규화
* 내부 주문 저장
* KDS 조회 API
* 주문 상태 변경 API
* AI 요청사항 분석
* KDS Web/App이 사용할 내부 API 제공

확인할 것:

* `deeporder-backend`가 mock 주문 생성기 역할을 직접 수행하고 있지 않은지
* `deeporder-backend`가 mock catalog 관리까지 맡고 있지 않은지
* `deeporder-backend`가 외부 플랫폼 시뮬레이터 역할을 하고 있지 않은지
* 테스트용 주문 생성 API가 운영 도메인 API처럼 섞여 있지 않은지

## 3. 경계가 섞인 부분 탐지

아래 유형의 코드가 있는지 찾아라.

* `mock-delivery-api`에서 KDS 상태를 직접 변경하는 코드
* `mock-delivery-api`에서 내부 order table/model에 직접 의존하는 코드
* `deeporder-backend`에서 mock order를 직접 생성하는 코드
* `deeporder-backend`에서 mock catalog를 관리하는 코드
* webhook을 우회해서 주문을 직접 저장하는 테스트성 API
* mock 전용 필드가 내부 주문 모델에 강하게 박혀 있는 부분
* console API와 KDS API가 같은 라우터/서비스에 섞여 있는 부분
* 실제 외부 플랫폼 adapter로 교체하기 어려운 강한 결합

## 4. API 경로 검사

현재 API 경로를 조사해서 다음 기준으로 분류하라.

```text
mock-delivery-api
- /api/mock/*
- /api/stores/*
- /api/menus/*
- /api/options/*
- /api/send/*
- /api/logs/*

deeporder-backend
- /api/external/orders/webhook
- /api/kds/*
- /api/orders/*
- /api/ai/*
```

실제 경로가 다르다면 현재 코드 기준으로 정리해라.

그리고 각 API가 다음 중 어느 성격인지 표로 정리하라.

```text
Mock Platform API
Admin Console API
External Webhook API
Internal Order API
KDS API
AI API
Legacy/Test API
```

## 5. 데이터 저장소 검사

현재 두 서비스의 DB와 모델을 확인하라.

확인할 것:

* `mock-delivery-api` DB에는 mock platform 운영 데이터만 들어가는지
* `deeporder-backend` DB에는 내부 주문/KDS/AI 분석 데이터만 들어가는지
* 두 DB 사이에 중복 저장되는 데이터가 있는지
* 주문 ID, eventId, storeId, platformOrderId 관계가 명확한지
* mock 데이터와 내부 정규화 주문 데이터의 경계가 명확한지

## 6. 최종 산출물

코드를 바로 수정하지 말고, 먼저 분석 결과 문서를 작성하라.

문서 위치는 다음으로 제안한다.

```text
docs/backend/backend-boundary-audit.md
```

문서에는 다음 내용을 포함해라.

```text
# Backend Boundary Audit

## 1. 결론 요약
- 현재 역할 구분이 잘 지켜지는지
- 통합을 보류하는 것이 맞는지
- 당장 수정해야 할 혼재 지점이 있는지

## 2. 현재 서비스별 책임
- mock-delivery-api 책임
- deeporder-backend 책임

## 3. API 경로 분류표
- 경로
- 현재 위치
- 성격
- 유지/이동/정리 판단

## 4. 데이터 모델 경계 분석
- mock platform 데이터
- internal order 데이터
- 중복/혼재 지점

## 5. 경계 위반 의심 지점
- 파일 경로
- 함수/클래스/라우터 이름
- 왜 문제가 되는지
- 권장 조치

## 6. 통합하지 않는 이유
- 실제 외부 배달 플랫폼 API 대체 가능성 유지
- webhook 경계 유지
- 외부 플랫폼 시뮬레이터와 내부 주문 시스템 분리
- PoC 설명력 유지

## 7. 권장 다음 작업
- 지금 바로 수정할 항목
- 문서만 보강할 항목
- 장기적으로 adapter화할 항목
```

## 7. 작업 원칙

* 현재 단계에서는 통합 구현을 하지 않는다.
* 파일 이동도 하지 않는다.
* DB 마이그레이션도 하지 않는다.
* 먼저 역할 경계와 혼재 여부만 검사한다.
* 문제 지점이 발견되면 바로 수정하지 말고 문서에 정리한다.
* 단, 명백한 README/문서 표현 오류 정도는 별도 제안으로 표시한다.

최종 목표는 다음이다.

```text
mock-delivery-api는 외부 배달 플랫폼 시뮬레이터로 남기고,
deeporder-backend는 내부 주문/KDS 백엔드로 유지한다.

다만 현재 코드에서 두 역할이 섞여 있다면,
그 지점을 찾아 문서화하고 이후 리팩토링 계획을 세운다.
```

추가로 중요한 작업을 포함한다.

현재는 `mock-delivery-api`가 JSON 형태로 mock 주문을 생성하고, 이를 webhook payload로 만들어 `deeporder-backend`에 전송한다.

하지만 추후 실제 배민/쿠팡이츠/요기요 같은 외부 배달 플랫폼 API 또는 webhook을 제공받게 되면, 실제 플랫폼이 보내는 데이터 양식은 현재 mock payload와 다를 가능성이 높다.

예를 들어 다음 항목이 플랫폼마다 다를 수 있다.

```text id="jehj88"
eventId 위치
orderId 이름
storeId 또는 merchantId 이름
메뉴 구조
옵션 구조
수량 표현 방식
가격 표현 방식
고객 요청사항 필드
배달/포장 구분 필드
주문 취소 이벤트 양식
주문 상태 이벤트 양식
timestamp 형식
signature/header 인증 방식
중복 이벤트 처리 기준
```

따라서 이번 역할 경계 감사 작업에는 다음 관점도 반드시 포함한다.

```text id="rqb94q"
목표:
현재 mock webhook payload가 어떻게 생성되고,
어디에서 전송되고,
deeporder-backend에서 어디로 수신되며,
어떤 내부 주문 모델로 정규화되는지 전체 흐름을 문서화한다.
```

## 8. Webhook Payload / Adapter Contract 감사 추가

다음 흐름을 코드 기준으로 추적하고 문서화하라.

```text id="9oqwd3"
mock 주문 데이터 생성
→ mock platform payload 생성
→ webhook payload 생성
→ webhook 전송
→ deeporder-backend webhook 수신
→ payload 검증
→ eventId idempotency 처리
→ 내부 주문 모델로 정규화
→ KDS 조회 모델에 반영
```

각 단계별로 다음을 확인하라.

### 8.1 데이터 생성 위치

`mock-delivery-api`에서 주문 데이터가 어디에서 생성되는지 확인한다.

확인할 것:

* 주문 생성 함수/서비스 위치
* Store/Menu/Option 데이터를 조합하는 위치
* AI 또는 랜덤 생성 로직이 있다면 해당 위치
* 주문 요청사항 생성 위치
* 주문 금액 계산 위치
* 주문 ID/event ID 생성 위치

문서에 다음 형식으로 정리하라.

```text id="8jgiza"
단계: Mock Order 생성
위치:
- 파일:
- 함수/클래스:
입력:
출력:
비고:
```

### 8.2 Webhook Payload 생성 위치

mock 주문 데이터가 실제 webhook payload로 변환되는 위치를 확인한다.

확인할 것:

* mock 내부 주문 객체와 webhook payload가 같은 구조인지
* 별도 payload builder/serializer가 있는지
* DeepOrder Backend가 기대하는 필드에 맞춰 강하게 결합되어 있는지
* 실제 플랫폼 payload로 교체 가능한 구조인지

중요 판단 기준:

```text id="w2b7n0"
mock-delivery-api가 deeporder-backend 내부 모델에 맞춰 payload를 억지로 만들고 있다면 경계가 약한 것이다.

반대로 mock platform 고유 payload를 만들고,
deeporder-backend가 이를 adapter/normalizer로 변환한다면 경계가 좋은 것이다.
```

### 8.3 Webhook 전송 위치

`mock-delivery-api`가 webhook을 어디로, 어떤 방식으로 전송하는지 확인한다.

확인할 것:

* webhook URL 설정 위치
* HTTP method
* request headers
* request body
* retry 여부
* timeout 여부
* 실패 로그 기록 방식
* 성공/실패 응답 처리 방식
* signature/header 인증이 있는지

문서에 현재 전송 계약을 정리하라.

```text id="qqyxhq"
POST {WEBHOOK_URL}
Headers:
- ...
Body:
- ...
Success condition:
- ...
Failure handling:
- ...
```

### 8.4 Webhook 수신 위치

`deeporder-backend`에서 webhook을 수신하는 위치를 확인한다.

확인할 것:

* webhook route 파일
* endpoint path
* request schema
* Pydantic model
* eventId 추출 위치
* idempotency 처리 위치
* payload validation 위치
* raw payload 저장 여부
* 실패 응답 형태

### 8.5 정규화 로직 위치

외부 payload가 내부 주문 모델로 변환되는 위치를 확인한다.

확인할 것:

* normalizer/adapter/service 위치
* mock payload 전용 변환인지
* 플랫폼별 adapter를 추가할 수 있는 구조인지
* 내부 order model에 들어가는 필드 목록
* 원본 payload 보존 여부
* 변환 실패 시 처리 방식

문서에는 반드시 다음 구조를 포함한다.

```text id="v4kuw1"
External Payload
→ Platform Adapter
→ Normalized Order
→ Internal Order Model
→ KDS View Model
```

## 9. 실제 API 대응 가능성 검사

현재 구조가 실제 외부 플랫폼 API를 받았을 때 대응 가능한지 검사하라.

다음 질문에 답하라.

```text id="1it3un"
1. 실제 배민 payload가 현재 mock payload와 다르면 어디를 수정해야 하는가?
2. 실제 쿠팡이츠 payload가 다른 구조라면 adapter를 추가할 수 있는가?
3. 현재 webhook endpoint가 mock payload에만 강하게 묶여 있지는 않은가?
4. platform_type 또는 source 필드로 플랫폼을 구분하고 있는가?
5. 원본 raw payload를 저장하고 있는가?
6. 정규화 실패 시 원본 이벤트를 재처리할 수 있는가?
7. eventId가 플랫폼마다 다를 경우 idempotency key 전략을 바꿀 수 있는가?
8. header signature 검증이 추가될 경우 어디에 들어가야 하는가?
9. 주문 취소/변경/상태 업데이트 이벤트를 payload type별로 처리할 수 있는가?
10. mock-delivery-api 제거 후 실제 platform adapter를 붙일 수 있는가?
```

## 10. 추가 산출물

기존 `docs/backend/backend-boundary-audit.md`에 아래 섹션을 추가하라.

```text id="yavbwh"
## 8. Webhook Payload Flow
- mock order 생성 위치
- webhook payload 생성 위치
- webhook 전송 위치
- webhook 수신 위치
- 정규화 위치
- KDS 반영 위치

## 9. Current Mock Payload Contract
- 현재 mock webhook endpoint
- 현재 headers
- 현재 body schema
- event type
- eventId/idempotency key
- order payload 구조
- cancel payload 구조가 있다면 포함
- 실패/성공 응답 규칙

## 10. Adapter Readiness
- 현재 구조가 mock 전용인지
- 실제 platform payload 추가가 쉬운지
- platform adapter 추가 지점
- normalizer 추가 지점
- raw payload 저장 여부
- signature 검증 추가 위치

## 11. Future Real Platform Payload Strategy
- Baemin payload가 들어올 경우 예상 adapter 위치
- Coupang Eats payload가 들어올 경우 예상 adapter 위치
- Yogiyo payload가 들어올 경우 예상 adapter 위치
- mock_delivery payload와 real platform payload를 분리하는 기준
- 내부 Normalized Order schema 정의 필요 여부

## 12. Risks
- mock payload와 internal order model이 너무 강하게 결합된 경우
- webhook을 우회하는 직접 저장 로직이 있는 경우
- raw payload를 저장하지 않는 경우
- idempotency key 전략이 mock eventId에만 의존하는 경우
- platform별 인증/signature 구조를 넣기 어려운 경우
```

또는 별도 문서로 분리하는 것이 더 적절하다면 다음 파일을 추가해도 된다.

```text id="l8n92d"
docs/backend/webhook-payload-contract.md
```

이 문서에는 다음 내용을 포함하라.

```text id="qu3i35"
# Webhook Payload Contract

## 1. 목적
실제 외부 배달 플랫폼 API/Webhook을 제공받았을 때,
현재 mock payload를 실제 platform payload로 교체 가능한지 판단하기 위한 계약 문서이다.

## 2. Current Mock Delivery Payload
현재 mock-delivery-api가 생성하고 전송하는 payload 구조.

## 3. DeepOrder Webhook Receiver Contract
deeporder-backend가 외부 플랫폼으로부터 기대하는 최소 수신 계약.

## 4. Normalized Order Schema
플랫폼별 payload를 내부 주문으로 변환한 뒤 저장해야 하는 표준 주문 구조.

## 5. Platform Adapter Strategy
mock_delivery, baemin, coupang_eats, yogiyo 등 플랫폼별 adapter를 어디에 둘지.

## 6. Idempotency Strategy
eventId, platformOrderId, eventType, occurredAt 등을 어떻게 조합해 중복 이벤트를 판별할지.

## 7. Raw Payload Preservation
원본 payload 저장 여부와 재처리 전략.

## 8. Signature / Authentication Strategy
향후 실제 플랫폼 webhook signature 검증이 들어올 위치.

## 9. Event Type Strategy
ORDER_CREATED, ORDER_CANCELLED, ORDER_UPDATED 등 이벤트 타입별 처리 전략.

## 10. Open Questions
실제 플랫폼 API 문서를 받기 전까지 확정할 수 없는 항목.
```

## 11. 작업 원칙 추가

* 현재 mock payload가 “정답 schema”라고 가정하지 않는다.
* mock payload는 어디까지나 임시 외부 플랫폼 payload이다.
* deeporder-backend 내부 주문 모델은 mock payload에 종속되면 안 된다.
* webhook 수신 계층은 platform별 payload를 받아 adapter를 통해 Normalized Order로 변환해야 한다.
* 실제 API를 제공받았을 때 수정 범위가 adapter 추가로 제한되는 구조가 이상적이다.
* 문서에는 현재 구조가 이 이상적인 구조에 얼마나 가까운지 평가한다.

최종적으로 이번 작업의 목표는 다음으로 확장한다.

```text id="3zi5jo"
mock-delivery-api와 deeporder-backend를 통합하지 않는 이유를 정리하는 것뿐 아니라,
실제 외부 배달 플랫폼 API/Webhook을 제공받았을 때
현재 mock payload 구조를 real platform payload로 교체 가능한지 검증하는 것이다.
```
