작업 기록: Mock Delivery API에서 AI 주문 생성과 주문 payload 생산 기능을 구현할 때 기준으로 사용한 구현 지시서.

# DeepOrder v2 Mock Delivery API - AI 주문 생성 구현 지시서

이 문서는 `mock-delivery-api`의 Store/Menu/Option 관리와 AI 주문 생성 기능을 구현하기 위한 상세 지시서다.

핵심 주제는 **메뉴 등록 구현과 AI를 사용한 주문 조합 만들기**다.

---

## 1. 문서 책임

이 문서가 다루는 범위:

```plain text
Store/Menu/OptionGroup/Option 데이터 모델
Mock Delivery Console 메뉴/옵션 관리 화면
샘플 매장/메뉴 seed 데이터
Gemini 기반 AI 주문 후보 생성
fallback 주문 생성
주문 후보 검증
가격 계산
알레르기 병합
receivedItems / excludedItems 계산
ORDER_CREATED payload 생성
DeepOrder Backend Webhook 전송
```

이 문서가 다루지 않는 범위:

```plain text
DeepOrder Backend의 AI Request Analyzer
KDS Web의 조리 요청사항 표시
kitchenActions 생성
KDS 액션 카드 색상
Random Order Simulation
React Native WebView App
실제 배달앱 API 연동
결제/정산/배달 상태 처리
```

KDS 요청 분석은 별도 문서인 `kds-ai-action-analysis-implementation-guide.md`에서 다룬다.

---

## 2. 전체 흐름

```plain text
Mock Delivery Console에서 음식점 선택
→ 메뉴 등록
→ MAIN/SET 메뉴에 상세옵션 그룹과 옵션 등록
→ AI 주문 생성 요청
→ AI가 등록된 메뉴/옵션 안에서만 주문 후보 JSON 생성
→ 서버가 주문 후보 검증
→ 서버가 가격 계산
→ 서버가 알레르기 병합
→ 서버가 receivedItems / excludedItems 계산
→ ORDER_CREATED payload 생성
→ generate-and-send 요청 시 DeepOrder Backend Webhook으로 전송
```

AI는 후보만 만든다. 가격, 최종 알레르기, 수령 품목, 제외 품목, 주문번호, 이벤트 ID는 서버가 생성한다.

---

## 3. 기술 전제

```plain text
mock-delivery-api
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- Jinja2 Templates
- httpx
```

AI Provider:

```plain text
AI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

Gemini API Key가 없거나 AI 호출/검증이 실패하면 fallback generator를 사용한다.

---

## 4. 메뉴 분류

메뉴 type:

```plain text
MAIN: 메인메뉴. 치킨 한 마리, 짬뽕, 제육덮밥 등
SET: 세트메뉴. 반반치킨, 2마리 세트 등
SIDE: 사이드. 치즈볼, 감자, 소스 등
DRINK: 음료. 콜라, 사이다 등
```

규칙:

```plain text
MAIN, SET 메뉴만 optionGroups를 가질 수 있다.
SIDE, DRINK 메뉴는 optionGroups를 가질 수 없다.
AI 주문에는 MAIN 또는 SET 메뉴가 반드시 1개 이상 포함되어야 한다.
SIDE, DRINK만으로 구성된 주문은 유효하지 않다.
```

---

## 5. 데이터 모델

### 5.1 Store

```plain text
id: int, PK
store_id: str, unique, index, not null
store_name: str, not null
platform: str, default "MOCK_DELIVERY"
available: bool, default true
created_at: datetime
updated_at: datetime
```

### 5.2 Menu

```plain text
id: int, PK
store_id: str, index, not null
menu_id: str, unique per store, index, not null
name: str, not null
type: MAIN | SET | SIDE | DRINK
base_price: int, >= 0
allergens_json: JSON, nullable
quantity_min: int, default 1
quantity_max: int, default 10
quantity_default: int, default 1
available: bool, default true
sort_order: int, default 0
created_at: datetime
updated_at: datetime
```

`allergens_json` 예:

```json
{
  "rawText": "닭고기, 대두, 밀",
  "sources": [
    {
      "sourceName": "양념치킨",
      "allergens": ["닭고기", "대두", "밀"]
    }
  ],
  "normalizedAllergens": ["닭고기", "대두", "밀"],
  "parseStatus": "MANUAL"
}
```

### 5.3 OptionGroup

```plain text
id: int, PK
store_id: str, index
menu_id: str
group_id: str, unique per menu
group_name: str, not null
selection_type: RADIO | CHECKBOX
required: bool, default false
min_select: int, default 0
max_select: int, default 1
available: bool, default true
sort_order: int, default 0
created_at: datetime
updated_at: datetime
```

검증:

```plain text
parent Menu의 type이 MAIN 또는 SET이어야 한다.
required=true이면 min_select는 최소 1이어야 한다.
RADIO는 max_select=1을 권장한다.
max_select는 min_select 이상이어야 한다.
```

### 5.4 Option

```plain text
id: int, PK
store_id: str, index
group_id: str
option_id: str, unique per option group
name: str, not null
additional_price: int, default 0
effect: ADD | EXCLUDE | REPLACE | NOTE | NONE
linked_menu_id: str | null
default_selected: bool, default false
available: bool, default true
sort_order: int, default 0
created_at: datetime
updated_at: datetime
```

`effect` 의미:

```plain text
ADD: 사이드/음료/소스 등 추가 제공
EXCLUDE: 기본 제공품 제외
REPLACE: 기존 구성 변경
NOTE: 조리/포장 요청성 옵션
NONE: 미제공/선택 안 함 등 실제 품목 변화 없음
```

---

## 6. API 범위

Store:

```plain text
GET /api/mock/stores
POST /api/mock/stores
```

Menu:

```plain text
GET /api/mock/stores/{store_id}/menus
POST /api/mock/stores/{store_id}/menus
GET /api/mock/stores/{store_id}/menus/{menu_id}
PUT /api/mock/stores/{store_id}/menus/{menu_id}
DELETE /api/mock/stores/{store_id}/menus/{menu_id}
```

OptionGroup:

```plain text
POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups
PUT /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}
DELETE /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}
```

Option:

```plain text
POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options
PUT /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}
DELETE /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/options/{option_id}
```

AI 주문:

```plain text
POST /api/mock/stores/{store_id}/ai/orders/generate
POST /api/mock/stores/{store_id}/ai/orders/generate-and-send
```

---

## 7. Console 화면

Jinja Console URL:

```plain text
GET /console
GET /console/stores
GET /console/stores/{store_id}/menus
GET /console/stores/{store_id}/menus/{menu_id}
GET /console/stores/{store_id}/ai-order-test
POST /console/stores/{store_id}/ai-order-test/generate
POST /console/stores/{store_id}/ai-order-test/generate-and-send
```

Console은 개발/시연용이다.

필수 기능:

```plain text
음식점 목록 표시
음식점 추가
메뉴 목록 표시
메뉴 type별 필터
메뉴 추가/수정/비활성화
MAIN/SET 메뉴의 옵션 그룹 관리
옵션 추가/수정/비활성화
AI 주문 생성 테스트
AI 주문 생성 후 Webhook 전송 테스트
Fallback 주문 생성 테스트
```

---

## 8. AI 주문 생성 요청/응답

요청:

```json
{
  "maxMenuCount": 3,
  "includeRequest": true,
  "includeRiskRequest": true,
  "useFallbackOnly": false
}
```

응답:

```json
{
  "source": "AI",
  "candidate": {},
  "orderPayload": {},
  "validation": {
    "success": true,
    "errors": []
  }
}
```

`source`:

```plain text
AI
FALLBACK
```

---

## 9. Gemini 주문 후보 스키마

Gemini는 반드시 다음 구조만 반환한다.

```json
{
  "items": [
    {
      "menuId": "MENU_YANGNYEOM_CHICKEN",
      "quantity": 2,
      "selectedOptions": [
        {
          "groupId": "DEFAULT_EXCLUDE_REQUEST",
          "optionId": "EXCLUDE_PICKLED_RADISH"
        }
      ]
    }
  ],
  "customerRequest": "후라이드 바싹 튀겨주세요. 젓가락 2개 주세요.",
  "deliveryRequest": "문 앞에 두고 벨 누르지 말아주세요."
}
```

AI 응답 금지 필드:

```plain text
price
basePrice
totalPrice
orderId
orderNumber
eventId
orderedAt
allergens
receivedItems
excludedItems
```

AI가 금지 필드를 내려도 서버는 무시한다.

---

## 10. Gemini 프롬프트 원칙

```plain text
너는 Mock Delivery API의 주문 후보 생성기다.
반드시 제공된 store 메뉴 데이터 안에서만 주문을 생성한다.
존재하지 않는 menuId, groupId, optionId를 만들면 안 된다.
주문에는 MAIN 또는 SET 메뉴가 반드시 1개 이상 포함되어야 한다.
SIDE 또는 DRINK 메뉴만으로 주문을 구성하면 안 된다.
가격, orderId, orderNumber, eventId, orderedAt은 생성하지 않는다.
알레르기 정보는 직접 생성하지 않는다.
응답은 JSON만 출력한다.
마크다운 코드블록을 쓰지 않는다.
```

AI 입력 메뉴 데이터는 필요한 필드만 포함한다.

```json
{
  "storeId": "STORE_FLAT",
  "menus": [
    {
      "menuId": "MENU_YANGNYEOM_CHICKEN",
      "name": "양념치킨",
      "type": "MAIN",
      "quantityRule": {"min": 1, "max": 10, "default": 1},
      "allergens": ["난류", "대두", "밀"],
      "optionGroups": [
        {
          "groupId": "SERVICE_DRINK",
          "selectionType": "RADIO",
          "required": true,
          "options": [
            {"optionId": "SERVICE_DRINK_NONE", "name": "서비스음료 미제공"},
            {"optionId": "SERVICE_COKE_500", "name": "콜라 500ml"}
          ]
        }
      ]
    }
  ]
}
```

---

## 11. 서버 검증

검증 함수 예:

```python
validate_order_candidate(store_id: str, candidate: dict) -> ValidationResult
```

검증 규칙:

```plain text
items는 1개 이상이어야 한다.
items 길이는 maxMenuCount 이하이어야 한다.
모든 menuId는 해당 store의 available=true 메뉴여야 한다.
주문에는 MAIN 또는 SET 메뉴가 최소 1개 이상 있어야 한다.
SIDE/DRINK item은 selectedOptions를 가질 수 없다.
MAIN/SET item의 selectedOptions는 해당 메뉴의 optionGroups 안에 있어야 한다.
존재하지 않는 groupId는 실패한다.
존재하지 않는 optionId는 실패한다.
RADIO group은 최대 1개만 선택할 수 있다.
required=true group은 minSelect 이상 선택되어야 한다.
각 group의 선택 개수는 minSelect/maxSelect 범위를 만족해야 한다.
같은 optionId를 중복 선택하면 실패한다.
```

검증 실패 처리:

```plain text
AI 응답 검증 실패 → fallback generator 재시도
fallback도 실패 → 500 또는 422 반환
사용자 직접 API 요청 검증 실패 → 422 반환
```

---

## 12. Order Builder

역할:

```plain text
AI candidate를 최종 ORDER_CREATED payload로 변환한다.
orderId, orderNumber, eventId, orderedAt을 생성한다.
가격을 계산한다.
selectedOptions를 상세화한다.
알레르기 정보를 병합한다.
receivedItems와 excludedItems를 계산한다.
```

가격 계산:

```plain text
optionsPrice = 선택 옵션 additionalPrice 합계
unitPrice = menu.basePrice + optionsPrice
totalPrice = unitPrice × quantity
order.totalPrice = 모든 item.totalPrice 합계
```

알레르기 병합:

```plain text
baseItemAllergens = Menu.allergens
optionAllergens = linkedMenuId가 있고 effect가 ADD 또는 REPLACE인 옵션의 linked Menu allergens
mergedAllergens = baseItemAllergens + optionAllergens 중복 제거
```

receivedItems / excludedItems:

```plain text
기본 메뉴는 receivedItems에 포함한다.
ADD 옵션이 linkedMenuId를 가지면 receivedItems에 포함한다.
EXCLUDE 옵션은 excludedItems에 포함한다.
NOTE, NONE 옵션은 receivedItems에 포함하지 않는다.
```

---

## 13. 최종 ORDER_CREATED payload 핵심 구조

```json
{
  "eventId": "mock_evt_xxx",
  "eventType": "ORDER_CREATED",
  "platform": "MOCK_DELIVERY",
  "storeId": "STORE_FLAT",
  "order": {
    "orderId": "mock_order_xxx",
    "orderNumber": "M-123456",
    "customerRequest": "후라이드 바싹 튀겨주세요.",
    "deliveryRequest": "문 앞에 두고 벨 누르지 말아주세요.",
    "orderedAt": "2026-06-01T10:45:00.000000Z",
    "items": [
      {
        "menuId": "MENU_YANGNYEOM_CHICKEN",
        "name": "양념치킨",
        "type": "MAIN",
        "quantity": 2,
        "selectedOptions": [],
        "price": {},
        "allergens": {
          "baseItemAllergens": {},
          "optionAllergens": [],
          "mergedAllergens": ["대두", "밀"]
        },
        "receivedItems": [],
        "excludedItems": []
      }
    ],
    "totalPrice": 50000
  }
}
```

이 payload는 DeepOrder Backend로 전송되고, KDS 조리 요청 분석의 입력으로 사용된다.

---

## 14. Seed 데이터

기본 seed 파일:

```plain text
app/seed/chicken_sample_store.json
```

필수 샘플:

```plain text
치킨 테스트 매장
후라이드치킨 MAIN
양념치킨 MAIN
두마리세트 SET
치킨무 SIDE
치즈볼 SIDE
콜라 500ml DRINK
사이다 500ml DRINK
```

메뉴에는 알레르기 정보를 포함한다.

---

## 15. 구현 순서

```plain text
1. Store/Menu/OptionGroup/Option 모델 정의
2. Pydantic Schema 정의
3. Store/Menu/OptionGroup/Option API 구현
4. Jinja Console 메뉴/옵션 관리 화면 구현
5. 샘플 seed 데이터 구현
6. order_validator.py 구현
7. order_builder.py 구현
8. fallback_order_generator.py 구현
9. gemini_order_provider.py 구현
10. ai_orders.py API 구현
11. webhook_sender.py 구현
12. Console AI 주문 테스트 화면 구현
13. 테스트 시나리오 확인
14. `project-progress-log.md` 기록
```

---

## 16. 테스트 계획

```plain text
Store 생성/조회
MAIN 메뉴 생성
SIDE 메뉴 생성
MAIN 메뉴에 OptionGroup 생성
SIDE 메뉴에 OptionGroup 생성 실패
Option effect ADD/EXCLUDE/NOTE 저장
AI 주문 생성 API 호출
MAIN 또는 SET 메뉴 최소 1개 포함 확인
존재하지 않는 menuId 검증 실패 확인
가격 서버 계산 확인
알레르기 병합 확인
receivedItems / excludedItems 확인
GEMINI_API_KEY 없을 때 fallback 확인
generate-and-send Webhook 전송 확인
```

---

## 17. 완료 기준

```plain text
Store/Menu/OptionGroup/Option 관리가 동작한다.
Console에서 메뉴와 옵션을 관리할 수 있다.
AI 주문 생성 API가 동작한다.
AI 주문 후보는 등록된 메뉴/옵션만 사용한다.
서버 검증 실패 시 fallback으로 대체된다.
가격은 서버 기준으로 계산된다.
알레르기는 서버 기준으로 병합된다.
receivedItems / excludedItems가 생성된다.
ORDER_CREATED payload가 DeepOrder Backend로 전송된다.
Mock Delivery 문서는 KDS 표시 구현을 다루지 않는다.
```
