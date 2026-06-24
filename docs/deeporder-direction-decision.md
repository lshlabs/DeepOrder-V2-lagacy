# DeepOrder 방향 결정 정리: API/Webhook 우선 구현, 장기 목표는 전표/COM 포트 파싱

## 1. 문서 목적

이 문서는 DeepOrder 프로젝트를 진행하면서 실제 배달 플랫폼 연동 방식을 조사한 내용, 그 과정에서 겪은 방향 혼란, 그리고 최종적으로 앞으로 어떤 순서로 구현할지 결정한 내용을 정리하기 위한 문서이다.

DeepOrder는 처음에 단순 매크로나 화면 인식 자동화에서 출발했지만, 현재는 취업 포트폴리오로서 백엔드 역량을 보여줄 수 있는 프로젝트로 발전시키는 것이 목표다.

따라서 장기적으로는 실제 매장 환경에 가까운 전표/COM 포트 파싱 방식까지 고려하되, 지금 당장은 API/Webhook 기반 구조를 유지하면서 전체 시스템을 먼저 완성하는 방향으로 결정한다.

---

## 2. 프로젝트의 출발점

DeepOrder의 출발점은 매장에서 아르바이트를 하며 느낀 불편함이었다.

매장에서는 배달 주문이 들어오면 주문을 확인하고, 수락하고, 주방에서 처리하기 쉬운 형태로 전달해야 한다. 이 과정이 반복적이고 번거롭게 느껴졌기 때문에 처음에는 다음과 같은 방식으로 문제를 해결해보려 했다.

```text
1. 버튼과 좌표를 매칭하는 간단한 매크로
2. 화면 인식 기반 자동 주문 수락
3. 주문 정보를 구조화해 KDS에 표시하는 시스템
```

하지만 좌표 기반 매크로나 화면 인식 자동화는 공식적인 연동 방식이 아니며, 포트폴리오 관점에서도 백엔드 개발 역량을 보여주기 어렵다.

따라서 DeepOrder는 단순 자동화 도구가 아니라, 외부 주문 이벤트를 수신하고 정규화한 뒤 KDS에 전달하는 백엔드 중심 프로젝트로 방향을 전환했다.

---

## 3. 기존에 상상했던 구조

초기에는 실제 배달 플랫폼이 서버 API나 Webhook 형태로 주문 payload를 제공하고, DeepOrder backend가 이를 수신하는 구조를 상상했다.

초기 상상 구조는 다음과 같았다.

```text
배달 플랫폼 서버
→ DeepOrder Backend Webhook
→ Platform Adapter
→ NormalizedOrderEvent
→ Order DB
→ KDS Web
```

이에 따라 현재 프로젝트도 다음 흐름을 중심으로 구현했다.

```text
mock-delivery-console
→ mock-delivery-api
→ deeporder-backend
→ kds-web
```

현재 구현된 주요 요소는 다음과 같다.

```text
- Mock Delivery API
- Mock Delivery Console
- FastAPI 기반 deeporder-backend
- 외부 주문 webhook 수신
- platform adapter 구조
- NormalizedOrderEvent 기반 정규화
- Order / OrderItem / WebhookEvent / AIAnalysis 저장
- KDS Web 주문 표시 및 상태 변경
- 고객 요청사항 AI 분석 흐름
```

이 구조는 백엔드 포트폴리오 관점에서 의미가 있다.

```text
외부 이벤트 수신
→ payload 정규화
→ idempotency 처리
→ 내부 도메인 모델 저장
→ KDS API 제공
→ 상태 변경 처리
```

따라서 이 구조는 계속 유지한다.

---

## 4. 조사 과정에서 확인한 내용

### 4.1 배민 공개 자료는 서버 API/Webhook보다 PC Relay에 가까웠다

배달의민족 관련 공개 자료를 확인한 결과, 공개적으로 확인 가능한 주문정보 연동 방식은 서버 API/Webhook보다는 PC 기반 연동에 가까웠다.

확인한 자료는 다음과 같다.

```text
- 우아한형제들 기술블로그: DLL을 이용한 주문정보 연동
- GitHub: woowabros/OrderRelaySampleCode
- 배달의민족 주문정보 API Client 기반 연동 매뉴얼
- OrderRelaySampleCode의 sampleData.json
```

공개 자료 기준으로는 다음 구조가 확인되었다.

```text
배민 PC접수/주문접수 프로그램
→ BMOrderRelay.dll
→ 동일 PC의 연동 프로그램 callback
→ 주문정보 수신
```

즉, 처음 상상했던 다음 구조와는 차이가 있었다.

```text
배민 서버
→ DeepOrder Backend Webhook
```

공개 자료 기준으로는 이보다 다음 구조에 더 가까웠다.

```text
배민 PC접수/주문접수 프로그램
→ BMOrderRelay.dll
→ Local Relay Agent
→ DeepOrder Backend
```

---

### 4.2 sampleData.json은 메뉴 옵션 상세 구조가 아니었다

OrderRelaySampleCode의 sampleData를 확인했을 때, 메뉴 데이터는 다음과 같은 단순 구조였다.

```json
{
  "title": "탕수육 중",
  "quantity": 3,
  "amount": 28000,
  "paymentType": 0
}
```

주소 데이터는 다음과 같은 형태였다.

```json
{
  "orderNo": "B0D20000TL",
  "latitude": 37.51695477,
  "longitude": 127.11286649,
  "addressJibun": "서울 송파구 방이동 44-2",
  "addressRoad": "서울 송파구 위례성대로 2",
  "addressDetail": "우아한형제들 2층"
}
```

즉, 공개 sampleData 기준으로는 다음 정보가 중심이었다.

```text
- 주문번호
- 대표 메뉴명
- 수량
- 총액
- 결제유형
- 주소
- 좌표
- 일부 전화번호
```

하지만 실제 배달 앱 주문 화면에서는 메뉴 옵션 구조가 훨씬 복잡하다.

```text
- 옵션 그룹
- 선택 옵션
- 옵션 추가 금액
- 메뉴별 총액
- 고객 요청사항
- 배달 요청사항
```

이 차이 때문에 다음 의문이 생겼다.

```text
실제 주문연동 payload도 sampleData처럼 단순한가?
아니면 제휴 문서에는 더 상세한 메뉴/옵션 구조가 제공되는가?
```

이 의문은 아직 공개 자료만으로 확정할 수 없다.

---

### 4.3 전표/프린터/COM 포트 기반 연동 가능성도 확인했다

추가 조사 과정에서 페이히어 등 다른 POS/KDS 서비스의 배달 프로그램 연동 가이드를 확인했다.

그 과정에서 여러 서비스가 배달 프로그램의 프린터 설정에서 특정 포트, 예를 들면 COM20 같은 포트를 사용하도록 안내하는 것을 확인했다.

이 구조는 다음과 같이 이해할 수 있다.

```text
배달 프로그램
→ 주문 접수
→ 주문서/전표 출력
→ 가상 프린터 또는 COM 포트
→ 출력 데이터 수신
→ 전표 파싱
→ 주문 정보 생성
→ POS/KDS 연동
```

이 방식은 BMOrderRelay.dll callback 방식과는 다르다.

```text
BMOrderRelay.dll 방식:
배달 프로그램이 제공하는 DLL callback으로 필드 수신

전표/COM 포트 방식:
배달 프로그램이 프린터로 보내는 출력 데이터를 읽고 파싱
```

이 방식은 특정 배달 플랫폼의 서버 API를 직접 받지 않아도 되고, 배민뿐 아니라 쿠팡이츠, 요기요 등 여러 플랫폼에 공통적으로 적용할 가능성이 있다.

따라서 장기적으로는 이 방식이 가장 현실적인 멀티 플랫폼 연동 방식일 수 있다.

---

## 5. 방향 결정 과정에서 겪은 장애

이번 조사 과정에서 DeepOrder의 방향이 여러 번 흔들렸다.

### 5.1 처음에는 서버 API/Webhook 중심으로 생각했다

초기에는 다음 구조가 가장 자연스럽다고 생각했다.

```text
외부 플랫폼 서버
→ DeepOrder Backend
→ KDS
```

이 구조는 백엔드 개발자 포트폴리오로도 좋다.

```text
- Webhook 설계
- payload contract
- adapter pattern
- idempotency
- DB persistence
- KDS API
- async AI analysis
```

그러나 배민 공개 자료를 확인하면서 실제 배민 주문정보 연동이 반드시 서버 API/Webhook 방식이라고 보기 어렵다는 문제가 생겼다.

---

### 5.2 배민 공개 자료는 DLL 기반 PC Relay 방식이었다

공개 자료를 보면 배민 주문정보 연동은 다음에 가까웠다.

```text
배민 PC접수/주문접수 프로그램
→ BMOrderRelay.dll
→ Local Agent
```

이 때문에 다음 고민이 생겼다.

```text
그렇다면 DeepOrder도 C# Windows Agent와 DLL 연동을 먼저 만들어야 하는가?
```

하지만 이 방향은 다음 이유로 지금 당장 우선순위가 낮다.

```text
- Windows Agent 개발 필요
- C#/.NET 필요
- P/Invoke, DllImport, callback marshaling 필요
- 실제 DLL 테스트 환경 필요
- 인증키나 제휴 조건 필요
- 백엔드 포트폴리오보다 로컬 클라이언트 연동 비중이 커짐
```

취업 준비 중인 현재 상황에서 이 방향으로 깊게 들어가면 프로젝트 완성이 늦어진다.

---

### 5.3 전표/COM 포트 파싱 방식은 현실적이지만 더 큰 범위다

전표/COM 포트 파싱 방식은 장기적으로 가장 현실적인 멀티 플랫폼 연동 방식일 수 있다.

장점은 다음과 같다.

```text
- 배민뿐 아니라 쿠팡이츠, 요기요 등 여러 플랫폼에 적용 가능
- 실제 POS/KDS 서비스에서 사용되는 방식으로 보임
- 전표에 메뉴 옵션이 찍히면 옵션 구조까지 복원 가능
- API 제공 여부와 무관하게 주문 정보를 정규화할 수 있음
```

하지만 단점도 있다.

```text
- 가상 프린터/COM 포트 이해 필요
- Windows 로컬 Agent 필요
- 전표 출력 스트림 파싱 필요
- 플랫폼별 전표 포맷 관리 필요
- 전표 포맷 변경에 취약함
- 개인정보 처리 정책 필요
- 실제 운영 안정화 난이도가 높음
```

따라서 장기 목표로는 적합하지만, 지금 당장 취업 포트폴리오의 핵심 구현 대상으로 삼기에는 범위가 크다.

---

### 5.4 지금 가장 큰 문제는 “방향의 정확성”보다 “동작하는 완성본”이다

현재 DeepOrder의 가장 시급한 목표는 다음이다.

```text
전체 흐름을 먼저 완전히 동작하게 만들기
```

즉, 지금 당장 중요한 것은 실제 배민이 어떤 방식으로 연동되는지 100% 확정하는 것이 아니라, 다음 구조를 포트폴리오로 보여줄 수 있게 완성하는 것이다.

```text
외부 주문 이벤트 수신
→ 정규화
→ 저장
→ KDS 표시
→ 상태 변경
→ AI 요청사항 분석
→ 테스트/문서화
```

이것이 먼저 완성되어야 한다.

---

## 6. 최종 결정

### 6.1 장기 목표

장기적으로 DeepOrder의 실제 멀티 플랫폼 연동 방향은 다음으로 잡는다.

```text
전표/COM 포트 출력 데이터 기반 주문 파싱
```

장기 목표 구조는 다음과 같다.

```text
배달 프로그램
→ 전표/빌지 출력
→ 가상 프린터 또는 COM 포트
→ Receipt Agent
→ Receipt Parser
→ NormalizedOrderEvent
→ DeepOrder Backend
→ KDS Web/App
```

이 방식은 배민뿐 아니라 쿠팡이츠, 요기요 등 여러 플랫폼을 상정할 수 있다.

따라서 장기적으로는 다음 컴포넌트를 고려한다.

```text
- receipt-agent
- receipt-parser
- platform-specific receipt parsers
- raw receipt storage
- parsing confidence
- parsing fallback
- KDS 원문 보기
```

---

### 6.2 단기 목표

단기적으로는 기존 API/Webhook 기반 구조를 유지한다.

이유는 다음과 같다.

```text
- 이미 상당 부분 구현되어 있다
- 백엔드 개발자 포트폴리오로 설명하기 좋다
- adapter / normalization / ingestion 구조를 보여줄 수 있다
- 테스트와 문서화가 쉽다
- 실제 플랫폼 연동을 몰라도 mock 기반으로 end-to-end를 완성할 수 있다
- 취업 준비 중이므로 빠르게 완성본을 만드는 것이 중요하다
```

따라서 단기 목표 구조는 다음이다.

```text
mock-delivery-console
→ mock-delivery-api
→ deeporder-backend webhook
→ adapter
→ NormalizedOrderEvent
→ DB
→ kds-web
```

---

## 7. 앞으로의 구현 방향

### Phase 1. 현재 API/Webhook 기반 E2E 완성

가장 먼저 모든 흐름이 안정적으로 동작해야 한다.

```text
1. mock-delivery-console에서 주문 생성
2. mock-delivery-api가 주문 payload 생성
3. deeporder-backend webhook으로 전송
4. adapter가 NormalizedOrderEvent로 변환
5. order_ingestion이 DB 저장
6. AI 분석 생성
7. kds-web에서 주문 표시
8. 주문 상태 변경
9. 전체 smoke test 통과
```

이 단계의 목표는 “실제로 돌아가는 프로젝트”다.

---

### Phase 2. 디테일 수정

E2E가 완성된 뒤 디테일을 다듬는다.

```text
- UI 정리
- 에러 메시지 정리
- 로딩 상태
- 주문 카드 표시 개선
- AI 분석 결과 표시 개선
- 주문 상태 변경 UX 개선
- 로그/문서 정리
- 테스트 정리
```

이 단계의 목표는 “시연 가능한 포트폴리오”다.

---

### Phase 3. Baemin PC Relay / sampleData 기반 시뮬레이션은 선택적으로 추가

단기 핵심은 아니지만, 시간이 남으면 다음을 추가할 수 있다.

```text
BAEMIN_PC_RELAY simulation mode
```

구조는 다음과 같다.

```text
OrderRelaySampleCode sampleData
→ BaeminPcRelayPayload
→ BaeminPcRelayAdapter
→ NormalizedOrderEvent
→ KDS
```

이 기능은 다음을 보여줄 수 있다.

```text
- 실제 공개 자료를 분석했다
- payload adapter 구조가 mock에만 묶여 있지 않다
- 제한된 주문 데이터도 KDS로 처리할 수 있다
```

다만 필수 구현은 아니다.

---

### Phase 4. Receipt Parser PoC는 장기 확장으로 분리

전표/COM 포트 파싱은 장기 목표로 둔다.

먼저 할 수 있는 작은 PoC는 다음 정도다.

```text
receipt_samples/*.txt
→ ReceiptParser
→ ParsedReceipt
→ NormalizedOrderEvent
```

하지만 실제 COM 포트, 가상 프린터, Windows Agent까지는 지금 단계에서 하지 않는다.

현재 단계에서 Receipt Parser는 “향후 확장 방향”으로 문서화만 해도 충분하다.

---

## 8. 포트폴리오에서 설명할 메시지

DeepOrder를 포트폴리오로 설명할 때는 “매크로 자동화 프로젝트”로 보이면 안 된다.

핵심 메시지는 다음이어야 한다.

```text
DeepOrder는 배달 주문 이벤트를 외부 시스템으로부터 수신하고,
플랫폼별 payload를 내부 주문 모델로 정규화한 뒤,
KDS에서 사용할 수 있도록 제공하는 백엔드 중심 주문 처리 시스템이다.
```

강조할 포인트는 다음이다.

```text
- Webhook receiver
- Platform adapter pattern
- NormalizedOrderEvent
- Idempotency
- Order ingestion
- KDS API
- Order status workflow
- AI request analysis
- Mock external platform
- E2E smoke test
```

장기 확장은 다음처럼 설명한다.

```text
실제 매장 환경에서는 공식 API/Webhook이 없는 경우도 있으므로,
향후에는 전표/COM 포트 출력 데이터를 파싱하는 Receipt Agent 방식까지 확장할 수 있도록 설계했다.
```

이렇게 설명하면 프로젝트가 단순 자동화가 아니라 백엔드 아키텍처 프로젝트로 보인다.

---

## 9. 최종 방향 요약

최종 결정은 다음과 같다.

```text
장기 목표:
전표/COM 포트 기반 주문 파싱 방식

단기 구현:
기존 API/Webhook 기반 mock platform 연동 유지

현재 최우선 목표:
모든 기능을 먼저 end-to-end로 동작하게 만들기

그 다음:
디테일 수정, UI/UX 보강, 테스트/문서화

추가 확장:
Baemin PC Relay sampleData simulation
Receipt Parser PoC
```

한 문장으로 정리하면 다음과 같다.

```text
DeepOrder는 지금 당장 실제 플랫폼 연동 방식의 정답을 모두 구현하려는 프로젝트가 아니라,
백엔드 포트폴리오로서 외부 주문 이벤트 수신, 정규화, 저장, KDS 제공 흐름을 완성하는 것이 우선이며,
장기적으로는 실제 매장 환경에 맞춰 전표/COM 포트 파싱 방식까지 확장하는 방향으로 진행한다.
```

---

## 10. 다음 작업

바로 다음 작업은 다음이다.

```text
1. 현재 API/Webhook 기반 E2E가 완전히 동작하는지 확인
2. smoke test 정리
3. KDS Web 표시/상태 변경 안정화
4. backend adapter/ingestion 테스트 정리
5. README와 아키텍처 문서 정리
6. 시간이 남으면 Baemin PC Relay sampleData simulation 추가
7. Receipt Parser는 장기 확장 문서로 분리
```

지금은 새로운 연동 방식을 계속 파고들기보다, 먼저 현재 프로젝트를 완성 가능한 단위로 닫는 것이 가장 중요하다.
