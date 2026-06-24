작업 기록: `mock-delivery-api`의 기존 메뉴/옵션 관리 화면을 실제 API/DB 연결 UI로 교체할 때 사용한 실행 계획 문서.

# Mock Delivery Console 메뉴/옵션 관리 UI 교체 작업 계획

이 문서는 `/Users/mac/Desktop/menu-management-console`의 v0 UI를 기준으로, 현재 `mock-delivery-api`의 메뉴/옵션 관리 영역을 실제 동작 가능한 UI로 교체하기 위한 실행 체크리스트다.

목표는 단순히 화면만 바꾸는 것이 아니라, Store/Menu/OptionGroup/Option의 생성, 수정, 삭제, 복제, JSON 저장/로드 흐름이 실제 API와 DB에 연결되어 검증 가능한 상태로 만드는 것이다.

---

## 1. 목표

최종 목표:

```plain text
현재 Mock Delivery Console의 메뉴/옵션 관리 영역을 v0 기반 UI로 교체한다.
교체된 UI는 실제 FastAPI API와 DB를 사용한다.
사용자는 입력 후 추가/수정/삭제/복제 결과를 즉시 화면에서 확인할 수 있다.
작업 완료 후 브라우저에서 Store 생성부터 옵션 복제까지 검증한다.
```

완료 후 유지할 기존 Console 기능:

```plain text
DeepOrder Webhook URL 표시
샘플 주문 생성
생성된 주문 전송
최근 생성 주문 Payload 표시
최근 Webhook 전송 로그 표시
KDS 열기 버튼
```

교체 대상:

```plain text
메뉴/옵션 관리 영역
```

---

## 2. 현재 상태 분석

### 2.1 v0 UI 디렉터리

대상 디렉터리:

```plain text
/Users/mac/Desktop/menu-management-console
```

확인된 구조:

```plain text
Next.js + React
shadcn/ui
lucide-react
dnd-kit
sonner toast
in-memory mock API
```

주요 파일:

```plain text
app/page.tsx
components/store-manager.tsx
components/menu-manager.tsx
components/option-group-manager.tsx
components/option-manager.tsx
components/menu-detail.tsx
components/json-import-export.tsx
lib/types.ts
lib/mock-api.ts
```

### 2.2 현재 Mock Delivery Console

현재 구조:

```plain text
FastAPI template
static HTML/CSS/JS
SQLite DB
SQLAlchemy model
Pydantic schema
```

주요 파일:

```plain text
mock-delivery-api/app/templates/console.html
mock-delivery-api/app/static/console.css
mock-delivery-api/app/static/console.js
mock-delivery-api/app/catalog.py
mock-delivery-api/app/models.py
mock-delivery-api/app/schemas.py
mock-delivery-api/tests/
```

### 2.3 중요한 차이

v0 UI는 화면과 사용자 흐름은 좋지만, 데이터 저장은 `mock-api.ts`의 메모리 데이터에 의존한다.

현재 프로젝트는 FastAPI API와 SQLite DB를 사용한다.

따라서 v0 UI를 그대로 복사하면 실제 저장/수정/삭제가 보장되지 않는다. 반드시 실제 API 연결과 데이터 매핑 작업을 먼저 포함해야 한다.

---

## 3. 구현 방향

### 3.1 추천 구조

현재 `/console` 페이지 전체를 버리지 않고, 메뉴/옵션 관리 영역만 React UI로 마운트한다.

예상 구조:

```plain text
mock-delivery-api
  app
    templates
      console.html
    static
      console.css
      console.js
      menu-management/
        index.js
        index.css
```

`console.html`에는 다음과 같은 mount point를 둔다.

```html
<div id="menu-management-root"></div>
```

React UI는 해당 영역에만 마운트한다.

### 3.2 기존 기능과의 경계

React UI가 담당할 것:

```plain text
Store 목록/생성/수정/삭제
Menu 목록/생성/수정/삭제
OptionGroup 목록/생성/수정/삭제
Option 목록/생성/수정/삭제
선택한 메뉴의 옵션 구성 상세 표시
옵션그룹/옵션 복제
JSON export/import
```

기존 console.js가 계속 담당할 것:

```plain text
Webhook URL 관리
샘플 주문 생성
주문 전송
Payload 표시
Webhook 로그 갱신
```

---

## 4. 기능 요구사항

### 4.1 Store 관리

- [x] Store 목록을 API에서 불러온다.
- [x] Store를 추가할 수 있다.
- [x] Store 클릭 시 선택 상태가 표시된다.
- [x] Store 클릭 시 입력폼에 기존 값이 채워진다.
- [x] 입력폼이 채워진 상태에서 저장하면 Store를 수정한다.
- [x] Store를 삭제하거나 비활성화할 수 있다.
- [x] Store 추가/수정/삭제 후 목록이 즉시 갱신된다.
- [x] Store가 없으면 Menu/Option 영역은 명확한 빈 상태를 보여준다.

작업 기록:

```plain text
- Store update/delete API를 추가했다.
- Console에서 Store 클릭 시 입력폼이 저장 모드로 채워지고, 추가/수정/비활성화가 가능하도록 연결했다.
- 브라우저에서 Store 생성, 선택, 새로고침 후 유지까지 확인했다.
```

### 4.2 Menu 관리

- [x] 선택한 Store의 Menu 목록을 API에서 불러온다.
- [x] Menu를 추가할 수 있다.
- [x] Menu 클릭 시 선택 상태가 표시된다.
- [x] Menu 클릭 시 입력폼에 기존 값이 채워진다.
- [x] 저장 시 create/update를 자동 분기한다.
- [x] Menu를 삭제하거나 비활성화할 수 있다.
- [x] Menu 타입을 관리한다.

허용 타입:

```plain text
MAIN
SIDE
DRINK
SET
```

- [x] Menu 가격을 관리한다.
- [x] Menu 알레르기 정보를 관리한다.
- [x] Menu 추가/수정/삭제 후 목록과 상세 영역이 즉시 갱신된다.

작업 기록:

```plain text
- Console에서 후라이드치킨/양념치킨 생성 후 목록과 상세 영역에 즉시 반영되는 것을 브라우저로 확인했다.
- Menu 클릭 시 입력폼이 저장 모드로 채워지도록 구현했다.
```

### 4.3 OptionGroup 관리

- [x] 선택한 Menu의 OptionGroup 목록을 API에서 불러온다.
- [x] OptionGroup을 추가할 수 있다.
- [x] OptionGroup 클릭 시 입력폼에 기존 값이 채워진다.
- [x] 저장 시 create/update를 자동 분기한다.
- [x] OptionGroup을 삭제하거나 비활성화할 수 있다.
- [x] 선택 방식을 관리한다.

허용 선택 방식:

```plain text
RADIO
CHECKBOX
QUANTITY
```

- [x] 필수 여부를 관리한다.
- [x] `required=true`일 때 `minSelect`가 1 이상이 되도록 UI에서 방어한다.
- [x] `minSelect`, `maxSelect`를 관리한다.
- [x] OptionGroup 추가/수정/삭제 후 선택 메뉴 상세에 즉시 반영된다.

작업 기록:

```plain text
- OptionSelectionType에 QUANTITY를 추가했다.
- 필수 옵션그룹 생성 시 minSelect가 1로 보정되고 상세에 `필수 1-1`로 표시되는 것을 브라우저에서 확인했다.
- OptionGroup 클릭 시 수정 폼이 채워지고 복제 버튼이 활성화되도록 구현했다.
```

### 4.4 Option 관리

- [x] 선택한 OptionGroup의 Option 목록을 API에서 불러온다.
- [x] Option을 추가할 수 있다.
- [x] Option 클릭 시 입력폼에 기존 값이 채워진다.
- [x] 저장 시 create/update를 자동 분기한다.
- [x] Option을 삭제하거나 비활성화할 수 있다.
- [x] 추가 금액을 관리한다.
- [x] 기본 선택 여부를 관리한다.
- [x] Option 효과를 관리한다.

허용 효과:

```plain text
NONE
ADD_ITEM
EXCLUDE_ITEM
REPLACE_ITEM
CHANGE_TASTE
LINK_MENU
```

- [x] `LINK_MENU` 효과일 때 연결 메뉴를 선택할 수 있다.
- [x] 연결 가능한 메뉴는 SIDE/DRINK 중심으로 제한한다.
- [x] Option 추가/수정/삭제 후 선택 메뉴 상세에 즉시 반영된다.

작업 기록:

```plain text
- OptionEffect에 ADD_ITEM, EXCLUDE_ITEM, REPLACE_ITEM, CHANGE_TASTE, LINK_MENU를 추가했다.
- 브라우저에서 `콜라 355ml / ADD_ITEM / 1,000원` 옵션 생성과 상세 반영을 확인했다.
- Option 클릭 시 수정 폼이 채워지는 것을 확인했다.
```

### 4.5 선택 메뉴 상세 표시

- [x] 선택한 Menu의 기본 정보를 표시한다.
- [x] Menu ID, 타입, 가격, 알레르기 정보를 표시한다.
- [x] 추가된 OptionGroup과 Option을 즉시 표시한다.
- [x] OptionGroup의 선택 방식, 필수 여부, min/max를 표시한다.
- [x] Option의 효과, 추가 금액, 연결 메뉴를 표시한다.
- [x] 추가/수정/삭제 후 새로고침 없이 최신 상태가 보인다.
- [x] 빈 상태가 명확하게 보인다.

작업 기록:

```plain text
- 선택 메뉴 상세에 메뉴 정보, optionGroups, options가 즉시 표시되도록 유지했다.
- 그룹 선택 버튼과 옵션 선택 버튼을 분리해 각각 수정 폼에 연결했다.
```

### 4.6 옵션 구성 복제

- [x] 특정 OptionGroup을 다른 Menu로 복제할 수 있다.
- [x] 선택 Menu의 전체 OptionGroup 구성을 다른 Menu로 복제할 수 있다.
- [x] 복제 대상 Menu는 현재 Menu를 제외한다.
- [x] 복제 완료 후 대상 Menu 상세에서 복제 결과를 확인할 수 있다.
- [x] 복제 실패 시 원인을 사용자에게 표시한다.

대표 시나리오:

```plain text
후라이드치킨에 추가한 음료/기본제공/사이드 옵션그룹을 양념치킨에 복제한다.
양념치킨을 클릭하면 복제된 옵션그룹과 옵션이 표시된다.
```

작업 기록:

```plain text
- 단일 OptionGroup 복제 API와 Menu 전체 OptionGroup 복제 API를 추가했다.
- 브라우저에서 후라이드치킨의 `음료` 그룹과 `콜라 355ml` 옵션을 양념치킨으로 복제하고, 양념치킨 상세에서 `GROUP_002`와 옵션이 표시되는 것을 확인했다.
```

### 4.7 JSON 저장/로드

- [x] 현재 Store/Menu/OptionGroup/Option 데이터를 JSON으로 export할 수 있다.
- [x] JSON 파일을 import할 수 있다.
- [x] import 모드를 선택할 수 있다.

허용 모드:

```plain text
replace
merge
```

- [x] replace는 기존 카탈로그를 교체한다.
- [x] merge는 기존 데이터에 병합한다.
- [x] import 전 데이터 형식을 검증한다.
- [x] import 완료 후 화면이 즉시 갱신된다.

작업 기록:

```plain text
- catalog export/import API를 추가했다.
- 브라우저에서 JSON Export 결과에 Store/Menu/OptionGroup/Option 계층이 출력되는 것을 확인했다.
- import replace/merge는 API 테스트로 검증했다.
```

---

## 5. 백엔드 작업 체크리스트

### 5.1 Store API 보강

- [x] `PUT /api/mock/stores/{store_id}` 추가
- [x] `DELETE /api/mock/stores/{store_id}` 추가
- [x] 삭제 정책 결정

권장 삭제 정책:

```plain text
hard delete 대신 available=false soft delete
```

작업 기록:

```plain text
- Store update/delete API를 추가했다.
- 삭제는 기존 Menu/OptionGroup/Option과 동일하게 `available=false` soft delete로 구현했다.
```

### 5.2 Menu API 점검

- [x] Menu create API 검증
- [x] Menu update API 검증
- [x] Menu delete API 검증
- [x] Menu 목록 조회 시 optionGroups 포함 여부 확인
- [x] SIDE/DRINK 연결 메뉴 조회 방식 결정

작업 기록:

```plain text
- 기존 Menu CRUD API를 Console update/delete 흐름에 연결했다.
- 연결 메뉴 후보는 현재 Store의 SIDE/DRINK 메뉴를 프론트에서 필터링한다.
```

### 5.3 OptionGroup API 점검

- [x] OptionGroup create API 검증
- [x] OptionGroup update API 검증
- [x] OptionGroup delete API 검증
- [x] `required=true`, `minSelect=0` 방어 로직 유지
- [x] sortOrder 처리 방식 확인

작업 기록:

```plain text
- OptionGroup CRUD와 validation 방어를 테스트 및 브라우저 흐름으로 확인했다.
```

### 5.4 Option API 점검

- [x] Option create API 검증
- [x] Option update API 검증
- [x] Option delete API 검증
- [x] linkedMenuId 유효성 검증
- [x] defaultSelected 처리 검증

작업 기록:

```plain text
- Option CRUD를 Console update/delete 흐름에 연결했다.
- linkedMenuId 유효성 검증은 기존 백엔드 검증을 유지한다.
```

### 5.5 복제 API 추가

- [x] 단일 OptionGroup 복제 API 추가
- [x] Menu 전체 OptionGroup 복제 API 추가
- [x] 복제 시 새 groupId/optionId 생성
- [x] 복제 시 sortOrder 정리
- [x] linkedMenuId는 원본 값을 유지하되 유효성 검증
- [x] 복제 결과를 응답으로 반환

예상 API:

```plain text
POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/duplicate
POST /api/mock/stores/{store_id}/menus/{source_menu_id}/option-groups/duplicate-to/{target_menu_id}
```

작업 기록:

```plain text
- `POST /api/mock/stores/{store_id}/menus/{menu_id}/option-groups/{group_id}/duplicate`를 추가했다.
- `POST /api/mock/stores/{store_id}/menus/{source_menu_id}/option-groups/duplicate-to/{target_menu_id}`를 추가했다.
- 복제 시 Store 범위에서 새 groupId/optionId가 생성되도록 ID 생성 범위를 조정했다.
```

### 5.6 JSON Export/Import API 추가

- [x] 전체 catalog export API 추가
- [x] catalog import API 추가
- [x] replace 모드 구현
- [x] merge 모드 구현
- [x] import schema 검증
- [x] import 실패 시 JSON 에러 응답 반환

예상 API:

```plain text
GET /api/mock/catalog/export
POST /api/mock/catalog/import
```

작업 기록:

```plain text
- `GET /api/mock/catalog/export`를 추가했다.
- `POST /api/mock/catalog/import?mode=merge|replace`를 추가했다.
- import payload용 Pydantic schema를 추가해 형식 오류를 JSON 응답으로 반환하게 했다.
```

---

## 6. 프론트엔드 작업 체크리스트

### 6.1 v0 UI 이식 방식 결정

- [x] React UI를 별도 번들로 빌드할지 결정
- [x] 현재 static console.js로 포팅할지 결정
- [x] 선택한 방식의 빌드/서빙 경로 결정

권장:

```plain text
React UI를 별도 번들로 만들고 FastAPI static에서 제공한다.
```

작업 기록:

```plain text
- 이번 단계에서는 React 번들 추가 대신, v0 UI의 정보 구조와 동작을 현재 FastAPI static console에 이식했다.
- 이유: 현재 Console의 주문 생성/전송 영역을 유지하면서 메뉴/옵션 관리 영역만 빠르게 실제 API와 연결하기 위함.
```

### 6.2 API Adapter 작성

- [x] v0 타입과 backend 타입 매핑 작성
- [x] Store mapper 작성
- [x] Menu mapper 작성
- [x] OptionGroup mapper 작성
- [x] Option mapper 작성
- [x] API 에러를 사용자 메시지로 변환
- [x] HTML 에러 응답도 안전하게 처리

필수 매핑:

```plain text
id <-> storeId/menuId/groupId/optionId
isActive <-> available
basePrice <-> basePrice
isRequired <-> required
isDefaultSelected <-> defaultSelected
```

작업 기록:

```plain text
- 현재 API 응답 구조를 그대로 사용하되, Console 표시/폼 상태에서 필요한 매핑을 구현했다.
- `readJson()`의 content-type 방어를 유지해 HTML/plain text 오류 응답도 사용자 메시지로 표시한다.
```

### 6.3 React Mount 적용

- [ ] `console.html`에 mount point 추가
- [ ] 기존 메뉴/옵션 관리 HTML 제거
- [ ] React bundle script/css 로드
- [x] 기존 주문 생성/전송 JS와 충돌 없는지 확인

작업 기록:

```plain text
- React mount 방식은 이번 구현에서 제외했다.
- 대신 기존 `console.html` 메뉴/옵션 관리 영역을 v0 기반 기능 구성으로 확장하고, 주문 생성/전송 영역과 같은 `console.js` 안에서 충돌 없이 동작하도록 유지했다.
```

### 6.4 UI 상태 관리

- [x] selectedStore 상태 관리
- [x] selectedMenu 상태 관리
- [x] selectedOptionGroup 상태 관리
- [x] editingStore 상태 관리
- [x] editingMenu 상태 관리
- [x] editingOptionGroup 상태 관리
- [x] editingOption 상태 관리
- [x] 저장 완료 후 edit mode 초기화
- [x] 삭제 완료 후 선택 상태 정리

작업 기록:

```plain text
- selectedStoreId, selectedMenuId, selectedGroupId, selectedOptionId를 추가했다.
- editingStoreId, editingMenuId, editingGroupId, editingOptionId, editingOptionGroupId를 추가했다.
- 항목 클릭 시 폼이 수정 모드로 전환되고 취소/비활성화 버튼 상태가 갱신된다.
```

### 6.5 사용자 피드백

- [x] 추가 완료 메시지 표시
- [x] 수정 완료 메시지 표시
- [x] 삭제 완료 메시지 표시
- [x] 복제 완료 메시지 표시
- [x] JSON import/export 완료 메시지 표시
- [x] API 오류 메시지 표시
- [ ] loading 상태 표시
- [x] disabled 상태 표시

작업 기록:

```plain text
- catalogFeedback/statusMessage로 추가/수정/삭제/복제/export-import 결과를 표시한다.
- API 오류는 `readJson()`을 통해 raw JSON parse error 대신 설명 가능한 메시지로 표시한다.
- loading 상태는 기존 주문 생성/전송 버튼 외 메뉴관리 폼에는 아직 별도 spinner를 두지 않았다.
```

### 6.6 v0 UI 시각/구조 재교체 계획

현재 구현은 v0의 데이터 흐름을 static Console에 기능 중심으로 옮긴 상태이며, 첨부 비교 기준인 `current_UI.png`와 `v0_screenshot.png` 사이의 시각적 차이가 크다.

따라서 다음 작업 지시에서는 “기능 이식”이 아니라 “v0 UI와 화면 구조를 맞추는 재교체”를 별도 단계로 수행한다.

기준 화면:

```plain text
원본 UI: /Users/mac/Desktop/menu-management-console
비교 기준 스크린샷: v0_screenshot.png
현재 결과 스크린샷: current_UI.png
```

핵심 원칙:

```plain text
기존 주문 생성/전송/Webhook 로그/KDS 기능은 유지한다.
메뉴/옵션 관리 영역은 v0 화면 구조와 최대한 동일하게 재작성한다.
현재 static HTML에 임의로 해석해 붙인 폼 중심 UI는 기준으로 삼지 않는다.
v0 컴포넌트의 레이아웃, 카드 구조, 버튼 위치, badge 표현, 여백, typography를 직접 참조한다.
실제 API/DB 연결은 기존 구현을 재사용하되 UI 계층은 v0 구조에 맞춘다.
```

#### 6.6.1 화면 구조 맞춤

- [x] Console 상단은 기존 `Mock Delivery Console`, Webhook URL, KDS 버튼 영역을 유지한다.
- [x] 메뉴/옵션 관리 영역 내부에 v0와 같은 별도 헤더를 둔다.

예상 헤더:

```plain text
배달 API 관리 콘솔
메뉴 / 옵션 관리
우측 상태 badge: 매장: {selectedStore.name}, 메뉴: {selectedMenu.name}, 그룹: {selectedOptionGroup.name}
```

- [x] v0와 같은 3열 레이아웃으로 재배치한다.
- [x] 좌측 열은 `매장 목록` 카드와 `메뉴 목록` 카드를 세로로 배치한다.
- [x] 중앙 열은 `옵션 그룹` 카드와 `옵션 목록` 카드를 세로로 배치한다.
- [x] 우측 열은 `메뉴 상세` 카드와 `JSON 가져오기 / 내보내기` 카드를 세로로 배치한다.
- [x] 각 열과 카드의 상대 폭은 v0 스크린샷과 맞춘다.

예상 배치:

```plain text
[ 매장 목록 ]   [ 옵션 그룹 ]   [ 메뉴 상세 ]
[ 메뉴 목록 ]   [ 옵션 목록 ]   [ JSON 가져오기 / 내보내기 ]
```

#### 6.6.2 v0 컴포넌트별 UI 수용 기준

- [x] `components/store-manager.tsx`의 카드 헤더, `+` 버튼, 선택 카드, 운영중 badge, edit/delete 아이콘 버튼 배치를 반영한다.
- [x] `components/menu-manager.tsx`의 메뉴 카드, 메뉴 타입 badge, 가격/알레르기 표시, edit/delete 아이콘 버튼 배치를 반영한다.
- [x] `components/option-group-manager.tsx`의 option group 카드, drag grip 아이콘, copy/edit/delete 아이콘 버튼, 선택 방식/필수 badge를 반영한다.
- [x] `components/option-manager.tsx`의 option 카드, drag grip 아이콘, 효과 badge, 추가 금액, edit/delete 아이콘 버튼 배치를 반영한다.
- [x] `components/menu-detail.tsx`의 우측 상세 카드 구조를 반영한다.
- [x] `components/json-import-export.tsx`의 JSON 카드 제목, import/export 버튼, textarea 흐름을 반영한다.
- [ ] v0의 lucide 아이콘을 동일 의미의 버튼에 사용한다.
- [x] 버튼 텍스트가 필요한 주요 액션을 제외하고, `+`, copy, edit, delete, upload/download는 아이콘 버튼 중심으로 표현한다.

#### 6.6.3 스타일 토큰/시각 기준

- [x] v0의 shadcn 계열 색상에 맞춰 background/card/border/muted/primary/destructive 토큰을 console CSS에 정의한다.
- [x] 전체 배경은 밝은 회색, 카드는 흰색, border는 연한 회색, 선택 상태는 옅은 blue tint와 blue border로 맞춘다.
- [x] 카드 radius는 v0처럼 `0.5rem` 수준을 사용한다.
- [x] 카드 내부 padding, header padding, 리스트 간격은 v0와 유사하게 조정한다.
- [x] badge는 rounded pill 형태로 유지하고, primary/secondary/outline/destructive 의미를 분리한다.
- [x] 현재 구현의 어두운 primary action button 남용을 줄이고 v0처럼 outline/icon/ghost 버튼을 사용한다.
- [x] 폼은 항상 노출하지 않고, v0처럼 추가/수정 상태에서 카드 내부 편집 패널로 노출한다.

#### 6.6.4 구현 방식 재결정

우선순위 1:

```plain text
React 번들을 도입해 /Users/mac/Desktop/menu-management-console의 컴포넌트 구조를 최대한 유지한다.
FastAPI의 /console에는 기존 주문/로그 영역과 React mount point를 함께 둔다.
mock-api.ts는 실제 FastAPI API adapter로 교체한다.
```

우선순위 2:

```plain text
React 번들 도입이 현재 빌드/운영 구조상 부담이면 static HTML/CSS/JS로 유지한다.
단, DOM 구조와 CSS class를 v0 컴포넌트 단위로 재구성해 시각적 결과를 v0와 맞춘다.
```

이번 후속 작업에서는 우선순위 1을 먼저 검토하고, 불가능한 사유가 확인될 때만 우선순위 2로 진행한다.

#### 6.6.5 기존 기능과의 통합 기준

- [x] 기존 Store/Menu/OptionGroup/Option CRUD API adapter는 유지한다.
- [x] 기존 복제 API와 JSON import/export API는 유지한다.
- [x] 기존 Webhook URL, 샘플 주문 생성, 주문 전송, payload, webhook log 영역은 기능을 유지하되 메뉴/옵션 영역과 시각적으로 충돌하지 않도록 하단 또는 별도 섹션으로 정리한다.
- [ ] 메뉴/옵션 관리 영역에서 발생한 toast/feedback은 v0의 `sonner toast`에 준하는 우측 상단 toast 또는 동일한 시각 패턴으로 표시한다.
- [x] loading 상태는 버튼 disabled/muted 상태로 표현한다.

#### 6.6.6 시각 검증 체크리스트

- [x] Playwright로 현재 Console 메뉴/옵션 관리 영역 스크린샷을 저장한다.
- [x] v0 스크린샷과 다음 항목을 육안 비교한다.
- [x] 3열 배치가 v0와 같은 순서와 밀도로 보인다.
- [x] 카드 제목, `+` 버튼, edit/delete/copy 아이콘 위치가 v0와 유사하다.
- [x] 선택된 Store/Menu/OptionGroup 카드가 v0와 같은 blue tint/border로 보인다.
- [x] 우측 메뉴 상세 카드가 v0처럼 메뉴 기본 정보, 알레르기 badge, 옵션 그룹 목록을 표시한다.
- [x] JSON 카드는 우측 하단에 위치하고 export/import 버튼 구조가 v0와 유사하다.
- [x] 기존 주문 생성/전송/로그 영역이 동작하며 메뉴/옵션 영역의 레이아웃을 깨지 않는다.
- [x] 브라우저 console에 기능 오류가 없다.

#### 6.6.7 완료 기준 보정

이번 후속 작업의 완료 기준은 다음과 같다.

```plain text
기능이 동작하는 것만으로 완료로 보지 않는다.
v0_screenshot.png와 비교했을 때 메뉴/옵션 관리 영역의 정보 구조, 카드 배치, 버튼 위치, badge 표현, 전체 여백이 명확히 유사해야 완료로 본다.
```

작업 기록:

```plain text
- React 번들 도입은 기존 FastAPI static console의 주문/로그 기능과 카탈로그 상태 이관 비용이 커서 이번 후속 작업에서는 보류했다.
- 우선순위 2 방식으로 `console.html`, `console.css`, `console.js`를 v0 카드/3열 구조에 맞게 재구성했다.
- Store/Menu/OptionGroup/Option 목록을 v0처럼 카드, badge, icon action 중심으로 표시하도록 변경했다.
- 메뉴 상세와 JSON 가져오기/내보내기를 우측 열로 분리했다.
- 카드 선택과 수정 아이콘을 분리해 평상시에는 편집 폼이 노출되지 않도록 조정했다.
- Playwright 스크린샷을 `output/playwright/mock-delivery-console-v0-aligned.png`에 저장했다.
- 브라우저 console에는 favicon.ico 404 외 기능 오류가 없었다.
```

---

## 7. 검증 체크리스트

### 7.1 API 테스트

- [x] Store 생성 테스트
- [x] Store 수정 테스트
- [x] Store 삭제 테스트
- [x] Menu 생성 테스트
- [x] Menu 수정 테스트
- [x] Menu 삭제 테스트
- [x] OptionGroup 생성 테스트
- [x] OptionGroup 수정 테스트
- [x] OptionGroup 삭제 테스트
- [x] Option 생성 테스트
- [x] Option 수정 테스트
- [x] Option 삭제 테스트
- [x] OptionGroup 복제 테스트
- [x] Menu 전체 옵션 구성 복제 테스트
- [x] JSON export 테스트
- [x] JSON import replace 테스트
- [x] JSON import merge 테스트

작업 기록:

```plain text
- `cd mock-delivery-api && .venv/bin/python -m pytest tests/test_mock_orders.py` 결과 8 passed.
```

### 7.2 브라우저 수동 검증

- [x] Console 페이지가 열린다.
- [x] 기존 Webhook/주문 생성 영역이 유지된다.
- [x] Store를 생성하면 목록에 보인다.
- [x] Store를 클릭하면 선택 상태가 보인다.
- [x] Menu를 생성하면 목록과 상세에 보인다.
- [x] Menu를 클릭하면 입력폼에 값이 채워진다.
- [ ] Menu를 수정하면 목록과 상세가 바뀐다.
- [x] OptionGroup을 생성하면 상세에 보인다.
- [x] Option을 생성하면 상세에 보인다.
- [x] OptionGroup을 다른 Menu로 복제할 수 있다.
- [ ] 전체 옵션 구성을 다른 Menu로 복제할 수 있다.
- [x] JSON export 파일 내용이 정상이다.
- [ ] JSON import 후 화면이 갱신된다.
- [x] 오류 발생 시 `Unexpected token ... is not valid JSON` 같은 원시 파싱 오류 대신 이해 가능한 메시지가 보인다.

작업 기록:

```plain text
- Playwright로 `http://127.0.0.1:8011/console`에서 Store 생성, Menu 생성, OptionGroup 생성, Option 생성, 항목 클릭 수정 폼 채움, 단일 OptionGroup 복제, JSON Export를 확인했다.
- Browser console error는 favicon.ico 404 한 건만 확인됐고 기능 오류는 아니었다.
- Menu 수정 저장, 전체 옵션 구성 복제, JSON Import 화면 갱신은 API/구현은 있으나 브라우저 수동 클릭은 이번 검증에서 생략했다.
```

### 7.3 재시작 검증

- [x] 서버 종료 전 Store/Menu/Option 데이터를 만든다.
- [ ] 서버를 종료한다.
- [ ] 서버를 다시 시작한다.
- [x] 이전 데이터가 유지되는지 확인한다.

작업 기록:

```plain text
- 브라우저 새로고침 후 생성한 `브라우저 검증 매장`, 후라이드치킨/양념치킨, 옵션그룹/옵션이 유지되는 것을 확인했다.
- 실제 프로세스 종료 후 재시작 검증은 아직 수행하지 않았다.
```

---

## 8. 완료 기준

다음 조건을 모두 만족하면 UI 교체 완료로 본다.

- [ ] 메뉴/옵션 관리 영역이 v0 스크린샷 기준의 화면 구조와 시각 스타일로 교체되었다.
- [x] Store/Menu/OptionGroup/Option CRUD가 실제 DB에 반영된다.
- [x] 항목 클릭 시 입력폼에 값이 채워지고 저장 시 update된다.
- [x] 추가/수정/삭제 후 화면에서 결과를 즉시 확인할 수 있다.
- [x] 후라이드치킨의 옵션그룹/옵션 구성을 양념치킨에 복제할 수 있다.
- [x] JSON export/import가 동작한다.
- [x] 기존 주문 생성/전송/로그 기능이 깨지지 않았다.
- [x] API 테스트가 통과한다.
- [x] 브라우저에서 핵심 시나리오를 직접 검증했다.
- [ ] 서버 재시작 후 DB 유지 여부를 확인했다.
- [x] `project-progress-log.md`에 구현 내역과 트러블슈팅을 기록했다.

보정 기록:

```plain text
기존 체크는 기능 동작 기준으로 완료 처리되었으나, 실제 v0_screenshot.png와 current_UI.png 비교 결과 화면 구조와 시각 스타일이 v0와 크게 다르다.
따라서 UI 교체 완료 기준을 기능 완료와 시각/구조 일치 완료로 분리하고, v0 시각 기준 교체는 미완료로 되돌린다.
```

---

## 9. 예상 트러블슈팅 기록란

작업 중 문제가 발생하면 아래에 반드시 남긴다.

```plain text
문제:
루트에서 `./mock-delivery-api/.venv/bin/python -m pytest mock-delivery-api/tests/test_mock_orders.py`를 실행하면 StaticFiles가 `app/static` 상대 경로를 찾지 못해 실패했다.

원인:
Mock Delivery API의 `app.main`은 현재 작업 디렉터리를 `mock-delivery-api`로 두는 실행 방식을 전제로 `StaticFiles(directory="app/static")`를 사용한다.

해결:
테스트를 `cd mock-delivery-api && .venv/bin/python -m pytest tests/test_mock_orders.py` 방식으로 실행했다.

재발 방지:
루트에서 테스트를 실행할 계획이 있다면 StaticFiles 경로를 파일 기준 절대 경로로 바꾸거나 pytest 실행 스크립트를 별도로 둔다.
```

```plain text
문제:
복제된 OptionGroup이 대상 메뉴에서 원본과 같은 `GROUP_001` ID를 가질 수 있었다.

원인:
기존 `_next_group_id()`와 `_next_option_id()`가 menu/group 범위에서 번호를 계산해 다른 메뉴/그룹에서는 같은 표시 ID를 재사용할 수 있었다.

해결:
관리 화면에서 복제 항목 구분이 쉽도록 groupId/optionId 생성 범위를 Store 단위로 조정했다.

재발 방지:
복제 기능에서는 화면 식별성이 중요하므로 새로 생성된 groupId/optionId가 원본과 달라지는 테스트를 유지한다.
```

```plain text
문제:
옵션 행이 OptionGroup 버튼 내부에 들어가 옵션만 독립적으로 클릭/수정하기 어려운 구조가 됐다.

원인:
처음 구현에서 OptionGroup 카드 전체를 button으로 만들고 그 안에 Option 행을 넣었다.

해결:
OptionGroup 선택 버튼과 Option 선택 버튼을 형제 관계로 분리했다.

재발 방지:
상세 영역의 각 편집 대상은 중첩 button 없이 독립 클릭 대상으로 유지한다.
```

```plain text
문제:
Playwright 콘솔에서 favicon.ico 404 오류가 1건 표시됐다.

원인:
브라우저가 기본 favicon을 요청했지만 FastAPI static에 favicon 파일이 없다.

해결:
기능 오류가 아니므로 이번 작업에서는 수정하지 않았다.

재발 방지:
콘솔 에러를 완전히 비우려면 `/favicon.ico` 또는 head favicon 링크를 추가한다.
```

```plain text
문제:
current_UI.png와 v0_screenshot.png를 비교하면 메뉴/옵션 관리 영역이 v0와 전혀 다른 화면처럼 보인다.

원인:
이전 구현에서 React mount와 v0 컴포넌트 이식을 제외하고, 기존 FastAPI static console에 기능 중심으로 DOM/CSS를 확장했다.
그 결과 Store/Menu/OptionGroup/Option의 실제 동작은 연결되었지만 v0의 3열 카드 레이아웃, shadcn 스타일, 아이콘 버튼, 우측 상세/JSON 배치가 유지되지 않았다.

해결:
후속 작업에서는 6.6의 v0 UI 시각/구조 재교체 계획을 먼저 수행한다.
가능하면 React 번들을 도입해 원본 v0 컴포넌트 구조를 유지하고, mock-api.ts만 실제 FastAPI adapter로 교체한다.

재발 방지:
기능 검증과 별도로 v0_screenshot.png 대비 Playwright 스크린샷 비교를 완료 기준에 포함한다.
```

---

## 10. 진행 로그

### 2026-06-05

- v0 UI 디렉터리와 현재 Mock Delivery Console 구조 차이를 분석했다.
- v0 UI가 in-memory mock API 기반이므로 실제 API 연결 없이 단순 복사하면 기능 검증이 불가능하다고 판단했다.
- 메뉴/옵션 관리 영역만 React UI로 교체하고, 기존 주문 생성/전송 영역은 유지하는 방향으로 작업 계획을 정리했다.
- Store update/delete API를 추가했다.
- OptionGroup 단일 복제와 Menu 전체 OptionGroup 복제 API를 추가했다.
- Catalog export/import API를 추가했다.
- Store/Menu/OptionGroup/Option CRUD UI를 생성/수정/비활성화 겸용으로 연결했다.
- v0 UI의 핵심 흐름인 클릭 시 폼 채움, 상세 즉시 반영, 옵션 구성 복제, JSON 저장/로드를 현재 Console에 이식했다.
- `mock-delivery-api` 테스트 8개가 통과했다.
- Playwright로 Store 생성, Menu 생성, OptionGroup 생성, Option 생성, OptionGroup 복제, JSON Export를 검증했다.
- `current_UI.png`와 `v0_screenshot.png` 비교 결과, 현재 구현은 기능 중심 이식이며 v0와 같은 시각/구조 교체로 보기 어렵다는 점을 확인했다.
- 후속 작업을 위해 `6.6 v0 UI 시각/구조 재교체 계획`을 추가하고, 완료 기준에서 v0 시각 기준 교체 항목을 미완료로 보정했다.
