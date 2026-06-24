작업 기록: DeepOrder Backend와 KDS에 AI 조리 요청사항 분석 기능을 붙일 때 기준으로 사용한 구현 지시서.

# DeepOrder v2 Backend/KDS - AI 조리 요청사항 분석 구현 지시서

이 문서는 DeepOrder Backend의 AI Request Analyzer와 KDS Web의 조리 요청사항 표시를 구현하기 위한 상세 지시서다.

핵심 주제는 **AI를 사용해 들어온 주문과 요청사항을 분석하고, KDS에서 안전하게 표시하는 것**이다.

---

## 1. 문서 책임

이 문서가 다루는 범위:

```plain text
DeepOrder Backend Webhook 수신 주문 분석
customerRequest 분석
selectedOptions / allergens / excludedItems 활용
Gemini 기반 AI Request Analyzer
fallback request analyzer
kitchenActions 생성
KDS 조리 요청사항 분석 카드 표시
고객 요청 원문 대조 표시
알레르기/조리요청 카드 색상
메뉴 등록 알레르기와 고객 알레르기 일치 시 메뉴 위험 표시
```

이 문서가 다루지 않는 범위:

```plain text
Store/Menu/Option CRUD
Mock Delivery Console 메뉴 관리
AI 주문 후보 생성
가격 계산
receivedItems / excludedItems 생성
ORDER_CREATED payload 생성
Webhook 발송
Random Order Simulation
```

위 제외 범위는 `mock-delivery-ai-order-generation-implementation-guide.md`에서 다룬다.

---

## 2. 연결 관계

Mock Delivery API는 주문 payload를 생산한다.

```plain text
ORDER_CREATED payload
customerRequest
deliveryRequest
items
selectedOptions
allergens.mergedAllergens
receivedItems
excludedItems
```

DeepOrder Backend/KDS는 이 payload를 소비한다.

```plain text
주문 저장
요청사항 분석
kitchenActions 생성
KDS 표시
```

즉, 두 문서의 관계는 다음과 같다.

```plain text
Mock Delivery API 문서 = 주문 payload 생산자
KDS AI Action Analysis 문서 = 주문 payload 소비자
```

---

## 3. 목표

KDS는 바쁜 주방에서 3초 안에 파악되어야 한다. 그러나 안전은 간결함보다 우선이다.

따라서 KDS는 긴 요약문 대신 액션 카드를 표시하되, 분석이 틀렸을 때 바로 대조할 수 있도록 고객 요청 원문도 함께 표시한다.

목표 표시:

```plain text
조리 요청사항 분석
[알레르기: 견과류] [제외: 양상추]
[원문: 양상추는 빼주시고 견과류 알레르기 있어요.]
```

표시하지 않을 것:

```plain text
긴 AI 요약문
tags
중복 warning 문장
deliveryRequest
```

---

## 4. 핵심 원칙

### 4.1 상세옵션은 분석 결과에 반복하지 않는다

입력:

```plain text
메뉴: 제육볶음
상세옵션: 덜맵게
```

KDS 표시:

```plain text
제육볶음 x1
덜맵게
```

AI 분석 결과에는 `맵기: 덜맵게`를 추가하지 않는다.

### 4.2 고객 요청 원문에만 있는 조리 지시는 분석한다

입력:

```plain text
고객 요청: 덜 맵게 해주세요.
```

분석 결과:

```plain text
[조리: 덜 맵게]
[원문: 덜 맵게 해주세요.]
```

### 4.3 알레르기, 제외, 안전 요청은 우선 추출한다

입력:

```plain text
고객 요청: 양상추는 빼주시고 견과류 알레르기 있어요.
```

분석 결과:

```plain text
[알레르기: 견과류] [제외: 양상추]
[원문: 양상추는 빼주시고 견과류 알레르기 있어요.]
```

### 4.4 원문은 분석 카드 안에 한 번만 표시한다

고객 요청 원문은 별도 큰 요청 박스로 반복 표시하지 않는다. 분석 카드 하단의 원문 줄로만 표시한다.

### 4.5 배달 요청은 KDS 주방 화면에서 제외한다

`deliveryRequest`는 `ignoredRequests`로 분류한다. 주방 KDS에는 표시하지 않는다.

---

## 5. 액션 카드 색상

초기 구현에서 반드시 구분할 색상:

```plain text
알레르기: 붉은색
안전 확인: 붉은색
일반 조리요청: 초록색
맵기/식감 조절: 초록색
재료 제외: 주황색 또는 붉은 계열
포장 요청: 중립색
```

알레르기 액션은 항상 사람이 확인해야 한다.

---

## 6. 메뉴 알레르기 위험 표시

고객 요청에서 추출한 알레르기 대상이 주문 메뉴의 등록 알레르기 또는 `mergedAllergens`와 일치하면 해당 메뉴 아이템 카드도 붉은색 위험 상태로 표시한다.

예:

```plain text
메뉴: 양념치킨
메뉴 등록 알레르기: 땅콩, 대두, 밀
고객 요청: 땅콩 알레르기 있어요.
```

KDS 표시:

```plain text
[붉은색 메뉴 카드] 양념치킨 x1

조리 요청사항 분석
[알레르기: 땅콩]
[원문: 땅콩 알레르기 있어요.]
```

알레르기 대상이 메뉴 등록 알레르기와 직접 일치하지 않더라도, 고객이 알레르기를 언급하면 알레르기 액션 카드는 붉은색으로 표시한다.

---

## 7. Backend 분석 입력

AI Analyzer는 고객 요청 문장만 받지 않는다. 주문 payload 안의 구조화된 정보도 함께 받아야 한다.

입력 예:

```json
{
  "orderNumber": "S6-C01",
  "items": [
    {
      "id": 1,
      "name": "제육볶음",
      "quantity": 1,
      "options": ["덜맵게"],
      "selectedOptions": [],
      "mergedAllergens": [],
      "excludedItems": []
    }
  ],
  "customerRequest": "양상추는 빼주시고 견과류 알레르기 있어요.",
  "deliveryRequest": "문 앞에 놓고 벨 누르지 말아주세요."
}
```

Step 7 payload가 들어온 뒤에는 다음 정보를 우선 활용한다.

```plain text
selectedOptions[].effect
items[].allergens.mergedAllergens
items[].receivedItems
items[].excludedItems
customerRequest
deliveryRequest
```

---

## 8. AI 응답 스키마

AI는 JSON만 반환한다.

```json
{
  "riskLevel": "HIGH",
  "needsHumanCheck": true,
  "kitchenActions": [
    {
      "type": "ALLERGY",
      "label": "알레르기",
      "target": "견과류",
      "displayText": "알레르기: 견과류",
      "severity": "HIGH",
      "requiresHumanCheck": true,
      "source": "CUSTOMER_REQUEST",
      "sourceText": "견과류 알레르기 있어요",
      "matchedMenuItemIds": []
    },
    {
      "type": "EXCLUDE_INGREDIENT",
      "label": "제외",
      "target": "양상추",
      "displayText": "제외: 양상추",
      "severity": "MEDIUM",
      "requiresHumanCheck": true,
      "source": "CUSTOMER_REQUEST",
      "sourceText": "양상추는 빼주시고",
      "matchedMenuItemIds": []
    }
  ],
  "packingActions": [],
  "ignoredRequests": [
    {
      "type": "DELIVERY",
      "text": "문 앞에 놓고 벨 누르지 말아주세요."
    }
  ]
}
```

`riskLevel`:

```plain text
HIGH: 알레르기, 안전, 위험 요청 포함
MEDIUM: 재료 제외, 조리 전 확인 요청 포함
LOW: 일반 조리 요청만 있음
```

`kitchenActions[].type`:

```plain text
ALLERGY
EXCLUDE_INGREDIENT
TASTE_ADJUSTMENT
COOKING_REQUEST
SAFETY_CHECK
```

`source`:

```plain text
CUSTOMER_REQUEST
OPTION
PAYLOAD
AI
```

---

## 9. Gemini 프롬프트 원칙

```plain text
너는 한국어 배달 주문을 KDS 조리 요청사항 액션 카드로 분석한다.
긴 요약문을 만들지 않는다.
고객 요청 원문 전체를 displayText에 반복하지 않는다.
주방 작업자가 바로 실행할 수 있는 짧은 action만 추출한다.
옵션으로 이미 구조화된 정보는 kitchenActions에 반복하지 않는다.
단, 알레르기/안전/제외 요청은 kitchenActions에 포함한다.
국물 많이, 바싹 튀김, 소스 많이처럼 조리 방식이나 양을 바꾸는 요청은 COOKING_REQUEST로 포함한다.
덜 익힘, 날것처럼, 아주 덜 익혀처럼 식품 안전 문제가 될 수 있는 요청은 SAFETY_CHECK로 분류한다.
고객 알레르기 요청이 메뉴의 registered/merged allergens와 일치하면 matchedMenuItemIds에 해당 item id를 포함한다.
배달 요청은 ignoredRequests로 분류하고 kitchenActions에 넣지 않는다.
응답은 JSON만 반환한다.
```

출력 규칙:

```plain text
알레르기 displayText는 "알레르기: {target}" 형식을 사용한다.
일반 조리 요청 displayText는 "조리: {target}" 형식을 사용한다.
displayText는 20자 내외로 짧게 쓴다.
sourceText는 추적용이며 KDS에는 전체 원문 줄로 대조한다.
알레르기 요청은 항상 riskLevel=HIGH, needsHumanCheck=true다.
```

---

## 10. Fallback Analyzer

Gemini API Key가 없거나 호출 실패 시에도 같은 스키마를 반환한다.

Fallback 키워드:

```plain text
알레르기: 알레르기, 알러지(사용자 오타/구어 표현 인식용), 견과, 땅콩, 새우, 갑각류, 우유, 난류, 계란, 밀, 대두
제외: 빼, 제외, 없이, 넣지, 빼주세요, 빼주시고
맵기: 덜 맵게, 덜맵게, 안 맵게, 맵게, 매운맛
조리: 국물 많이, 국물 적게, 바싹, 바삭하게, 푹 익혀, 따뜻하게, 소스 많이, 소스 적게, 면 불지 않게
안전 확인: 덜 익혀, 날것처럼, 반만 익혀, 아주 덜 익게
포장: 소스 따로, 따로, 수저, 젓가락, 포장
배달: 문 앞, 벨, 노크, 두고, 놓고, 라이더, 배달
```

예:

```plain text
양상추는 빼주시고 견과류 알레르기 있어요.
```

결과:

```plain text
riskLevel = HIGH
needsHumanCheck = true
kitchenActions = ["알레르기: 견과류", "제외: 양상추"]
```

---

## 11. DB 모델 변경

`OrderAIAnalysis`에 추가:

```plain text
kitchen_actions: JSON, default []
packing_actions: JSON, default []
ignored_requests: JSON, default []
```

기존 필드는 당장 삭제하지 않는다.

```plain text
summary
tags
cooking_notes
packing_notes
delivery_notes
warnings
```

KDS Web은 새 필드를 우선 사용한다.

---

## 12. API 응답 스키마

`OrderAIAnalysisOut`에 추가:

```plain text
kitchenActions
packingActions
ignoredRequests
```

예:

```json
{
  "riskLevel": "HIGH",
  "needsHumanCheck": true,
  "analysisStatus": "COMPLETED",
  "kitchenActions": [
    {
      "type": "ALLERGY",
      "displayText": "알레르기: 견과류",
      "matchedMenuItemIds": []
    }
  ],
  "packingActions": [],
  "ignoredRequests": []
}
```

---

## 13. KDS 표시 규칙

표시 우선순위:

```plain text
1. 주문번호 / 경과시간
2. 메뉴명 / 수량
3. 메뉴 상세옵션
4. 조리 요청사항 분석
5. 고객 요청 원문
6. 확인 버튼
```

분석 성공:

```plain text
제육볶음 x1
덜맵게

조리 요청사항 분석
[알레르기: 견과류] [제외: 양상추]
[원문: 양상추는 빼주시고 견과류 알레르기 있어요.]

확인 후 조리 시작
```

분석 대기:

```plain text
분석중
[원문: 양상추는 빼주시고 견과류 알레르기 있어요.]
```

분석 실패:

```plain text
직접 확인
[원문: 양상추는 빼주시고 견과류 알레르기 있어요.]
```

표시하지 않을 정보:

```plain text
tags
summary
긴 warning 문장
deliveryRequest
ignoredRequests
액션별 sourceText
```

---

## 14. 예시 시나리오

### 14.1 알레르기 + 제외 요청

입력:

```plain text
메뉴: 제육볶음
옵션: 덜맵게
고객 요청: 양상추는 빼주시고 견과류 알레르기 있어요.
```

KDS:

```plain text
제육볶음 x1
덜맵게

조리 요청사항 분석
[알레르기: 견과류] [제외: 양상추]
[원문: 양상추는 빼주시고 견과류 알레르기 있어요.]
```

### 14.2 일반 조리 요청

입력:

```plain text
고객 요청: 국물 많이 주세요.
```

KDS:

```plain text
조리 요청사항 분석
[조리: 국물 많이]
[원문: 국물 많이 주세요.]
```

### 14.3 튀김 식감 요청

입력:

```plain text
고객 요청: 바싹 튀겨주세요.
```

KDS:

```plain text
조리 요청사항 분석
[조리: 바싹 튀김]
[원문: 바싹 튀겨주세요.]
```

### 14.4 메뉴 알레르기 일치

입력:

```plain text
메뉴: 양념치킨
메뉴 등록 알레르기: 땅콩, 대두, 밀
고객 요청: 땅콩 알레르기 있어요.
```

KDS:

```plain text
[붉은색 메뉴 카드] 양념치킨 x1

조리 요청사항 분석
[알레르기: 땅콩]
[원문: 땅콩 알레르기 있어요.]
```

### 14.5 배달 요청만 있는 주문

입력:

```plain text
배달 요청: 문 앞에 놓고 벨 누르지 말아주세요.
```

KDS:

```plain text
조리 요청사항 분석 영역 표시 안 함
```

---

## 15. 구현 순서

```plain text
1. OrderAIAnalysis 모델에 kitchen_actions, packing_actions, ignored_requests 추가
2. OrderAIAnalysisOut 스키마에 kitchenActions, packingActions, ignoredRequests 추가
3. AIAnalysisResult Pydantic 모델을 action 기반 구조로 변경
4. Gemini 프롬프트를 action 기반 JSON 스키마로 변경
5. Gemini 응답 파싱과 검증 로직 수정
6. fallback_request_analyzer.py를 action 기반 결과로 변경
7. 기존 summary/tags/warnings/cookingNotes는 호환용 최소값만 채우도록 변경
8. KDS Web 타입에 kitchenActions, packingActions, ignoredRequests 추가
9. KDS Web에서 kitchenActions 액션 카드 표시
10. 고객 요청 원문을 분석 카드 안에 보조 줄로 표시
11. 액션 타입별 카드 색상 적용
12. matchedMenuItemIds 기반 메뉴 알레르기 위험 스타일 적용
13. 테스트 추가 및 기존 테스트 수정
14. 브라우저에서 KDS 카드 확인
15. `project-progress-log.md` 기록
```

---

## 16. 테스트 계획

Backend:

```plain text
customerRequest = "양상추는 빼주시고 견과류 알레르기 있어요."
itemOptions = ["덜맵게"]
deliveryRequest = "문 앞에 놓고 벨 누르지 말아주세요."
```

기대:

```plain text
riskLevel = HIGH
needsHumanCheck = true
kitchenActions includes "알레르기: 견과류"
kitchenActions includes "제외: 양상추"
kitchenActions does not include "맵기: 덜맵게" if it came from item option
ignoredRequests includes delivery request
```

KDS:

```plain text
[알레르기: 견과류] [제외: 양상추]
[원문: 양상추는 빼주시고 견과류 알레르기 있어요.]
```

회귀 테스트:

```plain text
알레르기 없는 일반 주문
고객 요청 없는 주문
배달 요청만 있는 주문
국물 많이 요청
바싹 튀김 요청
메뉴 등록 알레르기와 고객 알레르기가 일치하는 주문
분석 실패 fallback 주문
```

---

## 17. 완료 기준

```plain text
AI 분석 결과가 kitchenActions 기반으로 저장된다.
Gemini 실패 시 fallback도 같은 구조를 반환한다.
KDS가 고객 요청 원문을 분석 카드 안에 한 번만 표시한다.
상세옵션 정보는 아이템 옵션 영역에만 표시된다.
알레르기/제외/조리 지시가 조리 요청사항 분석 영역에 카드로 표시된다.
알레르기 카드는 붉은색, 일반 조리요청 카드는 초록색으로 표시된다.
고객 알레르기가 메뉴 등록 알레르기와 일치하면 해당 메뉴 카드도 붉은색 위험 상태로 표시된다.
배달 요청은 KDS 주방 화면에 표시되지 않는다.
위험 주문은 3초 안에 알레르기/제외 대상과 원문을 함께 대조할 수 있다.
Backend 테스트, KDS build, 브라우저 확인이 통과한다.
```
