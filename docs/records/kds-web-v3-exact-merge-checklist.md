작업 기록: `/Users/mac/Documents/kds-web-v3`의 UI/UX를 현재 `DeepOrder_V2/kds-web`에 안전하게 반입하기 위한 상세 체크리스트. `kds-web-v3`에는 개발용 `dev-preview` 계층이 추가되어 있으므로, 이번 문서는 정확 이식 대상과 반입 금지 대상을 처음부터 분리해서 관리한다.

# KDS Web v3 정확 이식 체크리스트

## 0. 이번 문서의 기준

이번 작업의 목표는 다음이다.

```text
/Users/mac/Documents/kds-web-v3 의 UI/UX를 가능한 한 그대로 현재 kds-web에 이식한다.
단, kds-web-v3 전용 dev-preview 계층은 절대 반입하지 않는다.
backend 미구현 기능이라고 해서 UI 구조를 임의로 삭제하거나 재창조하지 않는다.
```

즉 이번 작업은 다음과 다르다.

```text
v3에서 편의상 넣은 preview helper까지 함께 가져온다
현재 API에 맞춘 최소 subset으로 다시 축소 재설계한다
원본에 없는 버튼/헤더/레이아웃을 새로 만든다
```

이번 문서의 핵심 원칙:

* `kds-web-v3`가 새 기준 소스다.
* `dev-preview` 계층은 반입 금지다.
* UI/UX 구조는 원본 최대 유지가 원칙이다.
* backend 미구현 기능은 먼저 "보이는 구조"와 "실제 동작"을 분리해서 판단한다.
* 사용자 승인 없이 임의 축소/재구성하지 않는다.

중요 참고 문서:

* [kds-web-v3-dev-preview-layer.md](/Users/mac/Documents/DeepOrder_V2/docs/records/kds-web-v3-dev-preview-layer.md)

이 문서에서 반드시 기억할 문장:

```text
UI/UX는 반입 가능
dev-preview 계층은 반입 금지
```

---

## 1. v2 작업과 이번 v3 작업의 차이

이전 `KDS Web v2 정확 이식 체크리스트`에서는 다음을 제거 대상으로 다뤘다.

```text
PREVIEW_MODE
preview.ts
preview auth/session/orders 분기
```

하지만 이번 `kds-web-v3`는 상황이 다르다.

v3에는 리팩토링 작업을 돕기 위한 별도 개발층이 존재한다.

```text
src/lib/dev-preview.ts
VITE_KDS_DEV_PREVIEW
개발용 점주/직원 계정 버튼
preview 주문 fixture
preview 세션 bootstrap / reauthorize / status update 분기
```

즉 이번 작업은 단순히 `v3 그대로 복사`가 아니라:

```text
1. UI/UX는 정확히 이식
2. v3 전용 개발 도우미 계층은 제거
3. 현재 본 프로젝트의 실제 auth / order API 경계는 유지
```

라는 3중 조건을 만족해야 한다.

---

## 2. 정확 이식 범위

### 2.1 그대로 유지해야 하는 원본 구조

다음은 `kds-web-v3` 기준으로 가능한 한 그대로 유지한다.

* `App.tsx`의 전체 진입 흐름
* `AuthPage.tsx`의 전체 레이아웃과 전환 UX
* `KdsPage.tsx`의 전체 탭 구조
* 좌측 사이드바 아이콘 구성
* 상단 상태 배지 / 상단 탭 / 카드 배치
* `내 업무`, `직원`, `통계`, `설정` UI 진입 구조
* 상세 모달 / 컨텍스트 메뉴 / 완료 정리 / 비밀번호 변경 모달의 UI 구조
* `styles.css`의 해당 스타일 구조

### 2.2 반입 금지 대상

다음은 `kds-web-v3-dev-preview-layer.md` 기준으로 명시적 제거 대상이다.

파일 단위:

* `/Users/mac/Documents/kds-web-v3/src/lib/dev-preview.ts`
* `/Users/mac/Documents/kds-web-v3/.env.local`

코드 분기:

* `DEV_PREVIEW_MODE`
* `VITE_KDS_DEV_PREVIEW`
* `PREVIEW_ACCOUNTS`
* `createPreviewSession()`
* `createPreviewCurrentUser()`
* `isDevPreviewAccessToken()`
* `loadPreviewOrders()`
* `savePreviewOrders()`
* `resetPreviewOrders()`
* `updatePreviewOrderStatus()`
* 개발용 계정 버튼 UI
* preview 세션 bootstrap/reauthorize/logout 분기
* preview 주문 fetch / preview 상태 변경 분기

### 2.3 별도 정책 결정 대상

다음은 "UI를 없앨지"가 아니라 "실동작을 어떻게 처리할지"를 결정해야 하는 영역이다.

* `storeStatus`
* `MY_TASKS`
* `STAFF`
* `STATS`
* `SETTINGS`
* `change password`
* `remove/hide order`
* `clear done`
* `item 완료 토글`

중요:

```text
이 단계에서는 UI 자체를 삭제하지 않는다.
```

---

## 3. 소스 감사

목표:

```text
현재 kds-web와 kds-web-v3의 차이를
"그대로 반입할 것"과 "반입 금지할 것"으로 분리한다.
```

체크:

* [x] `App.tsx`에서 v3 preview 분기와 일반 UI 분기를 분리 표시한다
* [x] `AuthPage.tsx`에서 개발용 계정 버튼 UI가 들어간 위치를 식별한다
* [x] `KdsPage.tsx`에서 preview 주문/상태 분기와 실제 UI 구조를 분리 표시한다
* [x] `styles.css`에서 새로 들어온 스타일군을 목록화한다
* [x] 현재 제품 repo가 빠뜨린 v3 UI 구조를 목록화한다
* [x] 반대로 v3에만 있고 본체에 가져오면 안 되는 helper를 목록화한다

산출물:

```text
Missing UI Inventory
Dev Preview Exclusion Inventory
```

### 3.1 감사 결과

결론:

* `App.tsx`
  * 구조 차이는 거의 전부 `dev-preview` 세션 분기다.
  * 추가된 차이:
    * `src/lib/dev-preview.ts` import
    * preview access token bootstrap 분기
    * preview refresh/reauthorize 분기
    * preview logout 예외 분기
    * `handlePreviewLogin()` 추가
    * `AuthPage`에 개발용 계정 props 전달
  * 즉 UI/UX 자체보다 진입 편의층이 추가된 상태다.
* `AuthPage.tsx`
  * 두 가지 종류의 변화가 있다.
    * UI 반입 대상:
      * `lucide-react`의 `ChefHat` 아이콘 사용
      * 브랜드 아이콘 표현 변경
    * 반입 금지 대상:
      * `PreviewAuthAccount` 타입
      * `previewAccounts`, `onPreviewLogin` props
      * `개발용 프리뷰 모드` 배너
      * 개발용 계정 버튼 / 설명 텍스트
* `KdsPage.tsx`
  * 세 종류의 변화가 섞여 있다.
    * UI/UX 반입 대상:
      * `lucide-react` 아이콘 기반 전체 UI 치환
      * 카드/보드 배치 로직 변경
      * 카드 가변 폭/컬럼 분배 레이아웃
      * 통계/설정/내업무/직원 패널의 새 시각 구조
      * 버튼/배지/표/패널 구성 전반 리디자인
    * 반입 금지 대상:
      * `dev-preview` import
      * preview 세션 여부 판단
      * preview 주문 초기화
      * preview fetch 분기
      * preview 상태 변경 분기
    * 정책 유지 대상:
      * 본체에서 이미 정리한 local-only 기능 안내/비활성 정책이 v3에서 다시 풀렸는지 별도 점검 필요
* `styles.css`
  * v2 대비 전면 리디자인 수준 변경이다.
  * 단순 보정이 아니라 사실상 전체 교체/정확 대조가 필요하다.
* 의존성 변화:
  * `package.json`에 `lucide-react`가 새로 추가됐다.
  * 이는 `dev-preview`가 아니라 실제 UI 반입을 위해 필요한 런타임 의존성이다.
* 파일 구조:
  * v3의 `src/` 추가 파일은 `src/lib/dev-preview.ts` 하나뿐이다.
  * 따라서 새 파일 기준 반입 금지 대상도 명확하다.

Missing UI Inventory:

* `AuthPage` 브랜드 아이콘이 텍스트 `D`에서 `ChefHat` 기반으로 바뀐 구조
* `KdsPage`의 `lucide-react` 아이콘 기반 사이드바 / 상단바 / 모달 액션
* `ORDER_CARD_STACK_GAP_PX`, `ORDER_CARD_SHORT_RATIO` 기반 카드 밀도 조절
* `laneRef`, `laneHeight`, `orderCardHeights` 기반 컬럼 레이아웃 계산
* `OrderLayoutColumn` 기반 다단 컬럼 보드 배치
* `StoreStatusDot` 등 보조 시각 컴포넌트
* 통계 패널의 `metric strip` 구조
* 설정 패널의 flat row / section divider 구조
* `내 업무` 패널의 타일형 메뉴 구조
* `표 기반`/`뱃지 기반`으로 바뀐 일부 목록 표현
* 전반적인 spacing / sizing / border / tone 재설계

New Style Inventory:

* `kds-btn-primary`, `kds-btn-ghost`, `kds-btn-sm`, `kds-btn-xs`
* `kds-lane-column*` 계열 컬럼 레이아웃 스타일
* `kds-panel-header`, `kds-section-divider`, `kds-section-label`
* `kds-metric-strip`, `kds-metric*`
* `kds-menu-tile*`, `kds-tile-options*`, `kds-tile-popover*`
* `kds-badge.red`, `kds-table tbody tr.row-delayed`
* settings flat-row 전용 `kds-settings-row--sub`, `kds-settings-field-row`
* 전체 토큰 재조정:
  * 색상 변수
  * radius
  * sidebar/topbar sizing
  * auth shell density

Dev Preview Exclusion Inventory:

파일 단위:

* `src/lib/dev-preview.ts`
* `.env.local`

환경변수 / 선언:

* `VITE_KDS_DEV_PREVIEW`

`App.tsx` 제거 대상:

* `createPreviewCurrentUser`
* `createPreviewSession`
* `DEV_PREVIEW_MODE`
* `isDevPreviewAccessToken`
* `PREVIEW_ACCOUNTS`
* preview bootstrap 분기
* preview reauthorize 분기
* preview logout 예외 분기
* `handlePreviewLogin()`
* `AuthPage`의 `previewAccounts`, `onPreviewLogin` 연결

`AuthPage.tsx` 제거 대상:

* `PreviewAuthAccount` 타입
* `previewAccounts` prop
* `onPreviewLogin` prop
* `개발용 프리뷰 모드` 배너
* `개발용 점주 계정` 버튼
* `개발용 직원 계정` 버튼
* preview 설명 텍스트

`KdsPage.tsx` 제거 대상:

* `isDevPreviewAccessToken`
* `loadPreviewOrders`
* `updatePreviewOrderStatus`
* `const isDevPreview = ...`
* preview 초기 주문 state
* preview fetch 분기
* preview 상태 변경 분기

한 줄 결론:

```text
v3 감사 결과, 실제 병합 대상은 "lucide-react 기반 UI/UX 리팩토링 전체"이고,
실제 제거 대상은 "dev-preview 계층 전체"다.
```

---

## 4. Merge Verdict

목표:

```text
v3를 그대로 복사할지,
아니면 "UI/UX 반입 + dev-preview 제거" 방식으로 병합할지
최종 기준을 문서로 고정한다.
```

체크:

* [x] 이번 병합은 "정확 UI 이식"임을 재확인한다
* [x] 이번 병합은 "v3 전체 복제"가 아님을 명시한다
* [x] `dev-preview`는 개발 편의층이며 제품 코드가 아님을 명시한다
* [x] 이후 모든 단계는 "UI 반입 / preview 제거" 기준으로 진행함을 고정한다

### 4.1 Merge Verdict

최종 판정:

* 이번 병합의 기준 소스는 `/Users/mac/Documents/kds-web-v3`다.
* 하지만 병합 방식은 `디렉터리 전체 복제`가 아니라 `UI/UX 정확 이식 + dev-preview 제거`다.
* 즉 v3에 있는 모든 코드가 반입 대상이 아니라, 제품 화면/UX를 구성하는 코드만 반입 대상이다.

왜 전체 복제가 아닌가:

* `kds-web-v3`에는 실제 제품 코드가 아닌 개발 편의층이 섞여 있다.
* 그 편의층은 backend 미연결 상태에서 v0 리팩토링 화면을 테스트하기 위해 넣은 것이다.
* 따라서 `src/lib/dev-preview.ts`, `.env.local`, `VITE_KDS_DEV_PREVIEW`, preview 계정 버튼, preview 주문 fixture 분기는 본체 반입 시 제거하는 것이 맞다.

왜 축소 재설계도 아닌가:

* 이번 작업 목표는 `현재 API에 맞는 최소한의 KDS`를 다시 만드는 것이 아니다.
* 목표는 `kds-web-v3`에서 사용자가 의도한 UI/UX 구조를 현재 제품 repo에 최대한 그대로 복구하는 것이다.
* backend 미구현 또는 정책 보류 기능이 있어도, UI 구조 자체를 임의로 삭제하거나 다른 형태로 창조하지 않는다.

이번 병합에서 반입 대상:

* `App.tsx`, `AuthPage.tsx`, `KdsPage.tsx`, `styles.css`에 반영된 v3 기준 시각 구조와 UX 흐름
* `lucide-react` 기반 아이콘 체계
* 카드 밀도, 컬럼 레이아웃, 패널 구조, 모달 구조, 설정/통계/내 업무의 표현 방식

이번 병합에서 제외 대상:

* `dev-preview` 파일, env, 세션, 계정, 주문 fixture, 상태 변경 분기 전체
* preview 전용 문구, 배너, 버튼, 로컬 인증 우회 로직

이 판정으로 고정되는 작업 규칙:

* 이후 단계에서 `v3에는 있지만 backend가 아직 약하다`는 이유만으로 UI를 축소하지 않는다.
* 이후 단계에서 `preview 제거`를 이유로 원본 UX를 다시 설계하지 않는다.
* 이후 단계는 항상 `v3 화면 일치 여부`와 `preview 반입 여부`를 함께 검증한다.

한 줄 결론 템플릿:

```text
이번 작업은 kds-web-v3의 UI/UX를 기준으로 병합하되,
dev-preview 계층은 명시적으로 제거하는 정확 이식 작업이다.
```

---

## 5. Dev Preview 제거 전략

목표:

```text
v3에만 존재하는 개발용 preview 계층을
파일/코드/환경변수 단위로 제거 계획화한다.
```

체크:

* [x] `src/lib/dev-preview.ts` 제거 계획을 적는다
* [x] `.env.local` 제거 계획을 적는다
* [x] `vite-env.d.ts`의 `VITE_KDS_DEV_PREVIEW` 제거 계획을 적는다
* [x] `App.tsx`의 preview session 분기 제거 계획을 적는다
* [x] `AuthPage.tsx`의 개발용 계정 버튼 제거 계획을 적는다
* [x] `KdsPage.tsx`의 preview 주문/상태 변경 분기 제거 계획을 적는다

### 5.1 제거 전략

제거 원칙:

```text
preview 제거는 "개발용 우회 경로 제거"이지,
"v3 화면을 현재 제품 기능 범위에 맞게 다시 설계"하는 작업이 아니다.
```

즉 다음 두 줄을 분리해서 처리한다.

```text
화면 구조/스타일/UX는 유지
preview 세션/fixture/env/분기만 제거
```

### 5.2 파일 단위 제거

제거 대상 파일:

* `/Users/mac/Documents/kds-web-v3/src/lib/dev-preview.ts`
* `/Users/mac/Documents/kds-web-v3/.env.local`

본체 이식 시 규칙:

* `src/lib/dev-preview.ts`는 현재 제품 repo에 생성하지 않는다.
* `.env.local`의 `VITE_KDS_DEV_PREVIEW=true`도 본체 repo에 복사하지 않는다.
* 즉 이번 병합에서 새 파일 반입은 있어도 `dev-preview` 관련 새 파일 반입은 없다.

### 5.3 Env / 타입 선언 제거

제거 대상:

* `VITE_KDS_DEV_PREVIEW`
* `vite-env.d.ts`의 preview env 선언

본체 이식 시 규칙:

* 현재 제품 repo의 `vite-env.d.ts`에는 preview env 타입을 추가하지 않는다.
* 코드 어디에서도 `import.meta.env.VITE_KDS_DEV_PREVIEW`를 참조하지 않게 만든다.
* build 시점에 preview env가 없더라도 아무 경고 없이 동작해야 한다.

### 5.4 App.tsx 제거 전략

제거 대상 분기:

* preview access token bootstrap
* preview refresh token reauthorize
* preview logout 예외 처리
* `handlePreviewLogin()`
* `AuthPage`로 내려가는 `previewAccounts`, `onPreviewLogin`

유지 대상:

* 실제 access token 기반 bootstrap
* 실제 refresh token 기반 reauthorize
* 실제 logout API 호출 흐름
* auth / pending / approved session 전환 흐름

적용 방식:

* v3의 전체 진입 구조를 기준으로 읽되, preview helper import와 해당 분기만 걷어낸다.
* 결과적으로 `App.tsx`는 `v3 시각/UX 흐름 + 현재 제품 auth API` 형태로 남아야 한다.

### 5.5 AuthPage.tsx 제거 전략

제거 대상:

* `PreviewAuthAccount` 타입
* `previewAccounts`, `onPreviewLogin` prop
* `개발용 프리뷰 모드` 배너
* 개발용 점주/직원 계정 버튼
* preview 설명 텍스트

유지 대상:

* 로그인/회원가입 탭 구조
* pending 전환 구조
* 좌측 hero / 우측 form 패널 구조
* `ChefHat` 브랜드 표현과 v3의 시각 구조

적용 방식:

* `AuthPage`는 v3 화면을 기준으로 유지하되, preview 계정 진입 UI만 삭제한다.
* 삭제 후에도 spacing, panel hierarchy, form density가 바뀌지 않도록 한다.

### 5.6 KdsPage.tsx 제거 전략

제거 대상:

* preview session 여부 판단
* preview 초기 주문 state 주입
* preview fetch 분기
* preview status update 분기
* preview 전용 helper import

유지 대상:

* v3의 전체 보드 레이아웃
* v3의 카드/상단바/사이드바/모달/패널 구조
* 실제 API를 통한 주문 조회
* 실제 API를 통한 상태 변경

적용 방식:

* `KdsPage`의 UI 레이어는 v3 기준으로 맞추고, 데이터 소스만 다시 본체 API로 연결한다.
* 즉 preview fixture를 걷어내되, 화면이 단순화되거나 원본과 다른 조합으로 재구성되면 안 된다.

### 5.7 제거 후 확인 포인트

제거가 제대로 됐는지 확인하는 기준:

* 본체 코드에 `dev-preview` 문자열이 남아 있지 않아야 한다.
* 본체 코드에 preview 계정 버튼/배너가 보이면 실패다.
* 본체 코드에 preview token/preview orders/local fixture 분기가 남아 있으면 실패다.
* 반대로 화면이 v3보다 축소되거나 다른 구조가 되면 그것도 실패다.

주의:

```text
preview 제거를 이유로 관련 UI 구조까지 함께 삭제하면 안 된다.
preview 제거는 동작 분기 제거이지, 화면 축소 작업이 아니다.
```

---

## 6. App 정확 이식

목표:

```text
App.tsx는 v3 기준 진입 흐름을 맞추되,
dev-preview 세션 분기만 제거한다.
```

체크:

* [x] `bootstrapSession()`을 v3 기준으로 읽고 preview 분기만 제거한다
* [x] `reauthorize()`를 v3 기준으로 읽고 preview 분기만 제거한다
* [x] `handleLogout()`을 v3 기준으로 읽고 preview 분기만 제거한다
* [x] 나머지 auth/pending/session 흐름은 v3 구조를 유지한다

### 6.1 작업 결과

판정:

* 현재 제품 repo의 `kds-web/src/App.tsx`는 이미 `kds-web-v3/src/App.tsx`의 진입 흐름을 대부분 유지하고 있었다.
* 차이점은 `dev-preview` 계층이 이미 제거되어 있다는 점이며, 이번 단계의 기준과 정확히 일치한다.

확인한 항목:

* `bootstrapSession()`
  * 실제 access token이 있으면 `apiGetCurrentUser()`로 세션을 복원한다.
  * 401 + refresh token이면 `reauthorize()`로 재시도한다.
  * preview access token bootstrap 분기는 존재하지 않는다.
* `reauthorize()`
  * 실제 refresh token으로 `apiRefresh()`를 호출하고 새 access token을 저장한다.
  * preview refresh token 재인가 분기는 존재하지 않는다.
* `handleLogout()`
  * 실제 refresh token이 있으면 `apiLogout()`을 호출한다.
  * preview 세션 예외 처리 분기는 존재하지 않는다.
* 렌더 흐름
  * `booting` -> `registeredPending` -> `unauthenticated` -> `approval pending` -> `approved session` 순서가 v3 구조와 동일하다.
  * `AuthPage`에 preview 계정 props를 전달하지 않는다.

이번 단계 결론:

* `App.tsx`는 추가 코드 수정 없이 현재 상태를 유지하는 것이 맞다.
* 즉 이번 단계의 실작업은 `이미 기준에 맞게 정리된 App 진입 흐름을 확인하고 문서로 고정`하는 것이다.

한 줄 정리:

```text
App.tsx는 "v3 기준 진입 흐름 + preview 제거" 상태가 이미 맞춰져 있으므로,
이번 단계에서는 불필요한 코드 변경 없이 기준 적합성을 확인하고 고정했다.
```

---

## 7. AuthPage 정확 이식

목표:

```text
AuthPage는 v3 기준 화면을 반영하되,
dev-preview 전용 로그인 배너/버튼만 제거한다.
```

체크:

* [x] 로그인/가입 탭 구조를 v3 기준으로 유지한다
* [x] pending 전환 UX를 v3 기준으로 유지한다
* [x] 기존 pending 관련 버그가 재유입되지 않는지 확인한다
* [x] preview 계정 버튼 UI만 제거한다
* [x] preview 관련 prop 정의만 제거한다

### 7.1 작업 결과

적용 내용:

* `kds-web/src/pages/AuthPage.tsx`에 `lucide-react`의 `ChefHat` 아이콘을 반영했다.
* 기존 텍스트 `D` 브랜드 아이콘을 v3 기준의 아이콘 표현으로 교체했다.
* 이를 위해 `kds-web/package.json`에 `lucide-react` 의존성을 추가했고 workspace install을 반영했다.

대조 결과:

* 현재 제품 repo의 `AuthPage`는 이미 다음을 만족하고 있었다.
  * 로그인 / 매장 가입 탭 구조
  * pending 뷰를 `AuthPage` 내부에서 전환하는 UX
  * `이전으로` 버튼 기반 pending 복귀 흐름
  * 자동 로그인 / 아이디 저장 체크박스
  * 주소 검색 팝업 연동
* 따라서 이번 단계에서 실제 코드 차이는 `ChefHat` 브랜드 아이콘과 그 의존성 추가가 핵심이었다.

preview 제거 기준 확인:

* `PreviewAuthAccount` 타입은 본체에 추가하지 않았다.
* `previewAccounts`, `onPreviewLogin` prop은 본체에 추가하지 않았다.
* 개발용 프리뷰 배너 / 점주 계정 / 직원 계정 버튼도 반입하지 않았다.

검증:

* `npm install --workspace kds-web`
* `npm --workspace kds-web run typecheck` 통과

한 줄 정리:

```text
AuthPage는 v3 기준 UX를 유지한 채, preview 계층 없이 브랜드 아이콘만 정확 이식했다.
```

---

## 8. KdsPage 정확 이식

목표:

```text
KdsPage는 v3 기준 UX를 유지하되,
preview 주문 fixture와 preview status 분기만 제거한다.
```

체크:

* [x] 보드 구조와 카드 UX를 v3 기준으로 맞춘다
* [x] 탭/사이드바/모달 구조를 v3 기준으로 맞춘다
* [x] `loadPreviewOrders()` 초기화 분기를 제거한다
* [x] preview fetch 분기를 제거한다
* [x] preview status update 분기를 제거한다
* [x] 제품 repo의 실제 API 흐름과 다시 연결한다

### 8.1 작업 결과

적용 방식:

* `kds-web-v3/src/pages/KdsPage.tsx`를 기준 소스로 삼았다.
* 여기서 `dev-preview` 관련 코드만 제거한 기준본을 만든 뒤, 현재 `kds-web/src/pages/KdsPage.tsx`에 반영했다.
* 즉 이번 단계는 부분 보정이 아니라 `v3 정확 이식 + preview 분기 제거` 방식으로 처리했다.

실제 반영된 v3 UI/UX 요소:

* `lucide-react` 기반 사이드바 / 상단바 / 모달 아이콘 체계
* `ORDER_CARD_STACK_GAP_PX`, `ORDER_CARD_SHORT_RATIO`
* `laneRef`, `laneHeight`, `orderCardHeights`
* `buildOrderLayoutColumns()` 기반 다단 보드 배치
* `StoreStatusDot` 기반 매장 상태 표시
* `kds-icon-btn`, `kds-notice-bar`를 사용하는 상단 액션 구조
* 상세 모달의 요약/섹션 구조
* `내 업무` 패널의 타일형 UX
* `통계` 패널의 `metric strip`
* `설정` 패널의 flat-row / divider 구조

제거된 preview 요소:

* `../lib/dev-preview` import
* `isDevPreviewAccessToken()`
* `loadPreviewOrders()`
* `updatePreviewOrderStatus()`
* preview 초기 주문 state
* preview fetch 분기
* preview status update 분기

실제 API 연결 상태:

* 주문 조회는 계속 `apiGetKdsOrders()`를 사용한다.
* 주문 상태 변경은 계속 `apiUpdateOrderStatus()`를 사용한다.
* 즉 데이터 경계는 본체 backend API를 유지하면서, 화면 구조만 v3 기준으로 교체한 상태다.

확인 결과:

* `rg` 기준 `KdsPage.tsx`에 `dev-preview`, `isDevPreviewAccessToken`, `loadPreviewOrders`, `updatePreviewOrderStatus`, `VITE_KDS_DEV_PREVIEW` 문자열이 남아 있지 않다.
* `npm --workspace kds-web run typecheck` 통과

한 줄 정리:

```text
KdsPage는 v3의 보드/패널/모달 UX를 그대로 이식했고,
preview 주문 fixture 분기는 제거한 채 본체 API 흐름에 다시 연결했다.
```

---

## 9. styles.css 정확 이식

목표:

```text
styles.css는 v3 기준으로 복구하되
preview helper 때문에 추가된 스타일이 있는지만 별도 확인한다.
```

체크:

* [x] v3 기준 스타일군을 현재 repo에 반영한다
* [x] preview 계정 배너 전용 스타일이 있다면 제거한다
* [x] 기존 v2 기준과 달라진 스타일군을 목록화한다
* [x] 임의 생성된 제품 repo 스타일이 다시 생기지 않았는지 확인한다

### 9.1 작업 결과

적용 방식:

* `kds-web-v3/src/styles.css`를 기준본으로 삼아 현재 `kds-web/src/styles.css`에 그대로 반영했다.
* 이번 단계는 부분 보정이 아니라 `v3 스타일 체계 정확 이식` 방식으로 처리했다.

왜 전체 교체가 맞았는가:

* 이번 단계 전 기준으로, 현재 제품 repo에는 이미 `KdsPage`의 v3 구조가 반영돼 있었다.
* 그런데 기존 스타일 파일은 그 구조를 전부 수용하지 못했다.
* 특히 다음 클래스/토큰은 v3 기준 스타일이 필요했다.
  * `kds-icon-btn`
  * `kds-lane-column*`
  * `kds-notice-bar`
  * `kds-metric-strip`
  * `kds-menu-tile*`
  * `kds-section-divider`, `kds-section-label`
  * `kds-btn-primary`, `kds-btn-ghost`, `kds-btn-sm`, `kds-btn-xs`

반영된 핵심 스타일 변화:

* light theme 토큰 재정렬
* auth shell density / hero / tab panel 구조 정렬
* sidebar / topbar / board spacing 재조정
* order card column layout 스타일
* modal / toast / notice bar / icon button 구조 정렬
* my tasks 타일 UI와 stats metric strip 스타일 반영
* settings flat-row / segmented / divider 스타일 반영

preview 관련 확인:

* `styles.css`에는 preview 전용 스타일을 반입하지 않았다.
* `rg` 기준 `preview`, `dev-preview`, `VITE_KDS_DEV_PREVIEW` 문자열은 존재하지 않는다.

검증:

* `npm --workspace kds-web run build` 통과

한 줄 정리:

```text
styles.css는 v3 기준으로 정확 교체했고,
현재 KdsPage/AuthPage 구조가 원본과 같은 스타일 체계로 렌더되도록 맞췄다.
```

---

## 10. 타입 / API / Env 경계

목표:

```text
v3 정확 이식 후에도 preview env는 본체로 들어오지 않게 하고,
실제 API와 프론트 로컬 상태의 경계를 문서화한다.
```

체크:

* [x] `vite-env.d.ts`에 `VITE_KDS_DEV_PREVIEW`를 추가하지 않는다
* [x] `types.ts`가 v3 전체 UI 구조를 수용하는지 확인한다
* [x] `lib/api.ts`, `lib/auth.ts` 변경 필요 여부를 판단한다
* [x] backend 필요 기능 목록을 별도로 유지한다
* [x] "로컬 상태 기반 기능"과 "실API 기능"을 혼동하지 않게 표시한다

### 10.1 작업 결과

Env 경계 확인:

* 현재 본체의 `kds-web/src/vite-env.d.ts`에는 `VITE_DEEPORDER_API_URL`만 선언되어 있다.
* `VITE_KDS_DEV_PREVIEW` 선언은 존재하지 않는다.
* `rg` 기준 `kds-web/src`와 `kds-web/package.json`에 preview env / preview helper 문자열이 남아 있지 않다.

타입 경계 확인:

* `kds-web/src/types.ts`는 현재 본체가 사용하는 실제 응답 구조를 수용한다.
* 핵심 타입:
  * `AuthResponse`, `CurrentUserResponse`, `RegisterResponse`
  * `AuthSession`, `AuthUser`, `AuthStore`
  * `Order`, `OrderItem`, `OrderAIAnalysis`
* `KdsPage`의 v3 UI/UX 확장은 대부분 프론트 내부 상태와 표현 로직이라, 별도 API 응답 타입 추가 없이 현재 타입 체계 안에서 수용 가능하다.
* `UserRole`은 현재 backend의 실제 enum(`STORE_OWNER`, `ADMIN`)과 일치한다.

API / auth 경계 확인:

* `kds-web/src/lib/api.ts`는 여전히 본체 backend API만 바라본다.
  * `POST /api/auth/login`
  * `POST /api/auth/register`
  * `POST /api/auth/refresh`
  * `POST /api/auth/logout`
  * `GET /api/auth/me`
  * `GET /api/kds/orders`
  * `PATCH /api/orders/{orderId}/status`
* `kds-web/src/lib/auth.ts`도 access/refresh token의 local/session 저장만 담당하며, preview 전용 저장소 분기는 없다.
* 따라서 이번 단계에서 `lib/api.ts`, `lib/auth.ts`의 코드 수정은 필요 없었다.

실API 기능 vs 로컬 상태 기능:

실API 기능:

* 로그인 / 회원가입 / 토큰 재발급 / 로그아웃
* 현재 사용자 / 매장 정보 복원
* KDS 주문 조회
* 주문 상태 변경

로컬 상태 기반 기능:

* `storeStatus` 및 일시중지 팝업
* `MY_TASKS` 담당 메뉴 관리
* `STAFF` 패널 내부 편집 흐름
* `STATS` 패널의 프론트 집계 표현
* `SETTINGS` 변경값 유지
* 비밀번호 변경 모달 제출 결과
* 주문 제거 / 완료 정리 / 메뉴 완료 체크

backend 필요 기능 목록:

* 매장 상태 저장/조회 API
* 담당 메뉴/내 업무 저장 API
* 직원 관리 CRUD API
* 설정 저장 API
* 비밀번호 변경 API
* 주문 숨김 / 완료 정리 / 항목 완료 토글 API

이번 단계 결론:

* preview env는 본체로 들어오지 않았다.
* 현재 타입/인증/API 경계는 v3 UI를 수용하는 데 충분하다.
* 미연동 기능은 코드상 우회가 아니라 `로컬 상태 기반 기능`으로 남겨 두고, backend 필요 목록으로 분리해 관리하는 것이 맞다.

한 줄 정리:

```text
본체는 `VITE_DEEPORDER_API_URL` + 실제 auth/KDS API만 유지하고,
v3에서 보강된 나머지 UX는 로컬 상태 기능과 backend 미구현 기능으로 명확히 분리했다.
```

---

## 11. 검증

정적 검증:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
npm --workspace kds-web run build
```

시각 검증:

* [x] 현재 화면이 `/Users/mac/Documents/kds-web-v3`와 구조적으로 동일한지 비교한다
* [x] 좌측 사이드바 아이콘 구성과 상단 탭 구성이 동일한지 비교한다
* [x] 카드 헤더/버튼/배지 배치가 동일한지 비교한다
* [x] pending / settings / modal 구조가 동일한지 비교한다

런타임 검증:

* [x] 로그인 -> pending -> 승인 -> KDS 진입 흐름 확인
* [x] 주문 수신 / 상태 변경 흐름 확인
* [x] dev-preview fallback이 본체에 남아 있지 않은지 확인
* [x] read-only / disabled / 안내 정책이 의도대로 동작하는지 확인

### 11.1 검증 결과

정적 검증:

* `npm --workspace kds-web run typecheck` 통과
* `npm --workspace kds-web run build` 통과

브라우저 비교 검증:

* 현재 본체 `http://127.0.0.1:5173`와 비교용 `http://127.0.0.1:4173`를 각각 실행해 구조를 비교했다.
* 비교 결과:
  * 본체 `5173` 로그인 화면은 `kds-web-v3`의 auth 구조와 동일한 레이아웃/탭/체크박스/브랜드 아이콘을 가진다.
  * 비교용 `4173`에는 의도대로 `개발용 프리뷰 모드` 배너와 개발용 계정 버튼이 남아 있었다.
  * 본체 `5173`에는 해당 preview 배너/버튼이 보이지 않았다.
* 따라서 `UI 정확 이식 + preview 제거` 기준이 실제 화면에서도 유지됨을 확인했다.

런타임 검증:

* 승인 계정 생성 및 승인:
  * `kdsv31jbcgv@example.com` / `STORE_005`
* pending 계정 생성:
  * `kdspendingrrvu06@example.com` / `STORE_006`
* webhook 주문 주입:
  * `STORE_005`에 `K3-1001` 주문 주입 완료

확인한 흐름:

* 승인 계정으로 `5173` 로그인 후 KDS 진입 성공
* `GET /api/kds/orders` 결과가 보드에 렌더되는 것 확인
* 주입한 `#K3-1001` 주문이 `접수` 탭에 노출되는 것 확인
* `조리 시작` 클릭 후 액션 버튼이 `완료`로 바뀌는 것 확인
* 별도 pending 계정으로 로그인 시 `가입 신청 완료 / 승인 대기 / 이전으로` 뷰로 전환되는 것 확인
* `설정` 진입 시 패널 구조와 함께 `설정 저장 기능은 아직 연동되지 않았습니다.` 게이트 문구 및 `설정 기능은 아직 백엔드 연동 전입니다.` 토스트가 노출되는 것 확인

추가 확인:

* preview 관련 문자열은 본체 `kds-web/src`에 남아 있지 않다.
* 브라우저 콘솔의 오류는 `favicon.ico 404`만 확인됐다.
* 비교용으로 띄운 `5175` 포트는 backend CORS 허용 포트가 아니어서 로그인 preflight가 막혔다.
  * 이는 본체 버그라기보다 현재 backend 허용 origin 정책이 `5173/5174` 중심으로 잡혀 있다는 의미다.

이번 단계 결론:

* 본체 `kds-web`은 현재 기준으로
  * auth 화면
  * pending 화면
  * 승인 후 KDS 진입
  * 주문 수신
  * 상태 변경
  * 로컬 전용 패널 게이트
  를 모두 정상적으로 확인했다.

한 줄 정리:

```text
검증 결과, 본체는 v3 UI를 유지하면서 preview 계층 없이 실제 backend와 다시 연결되어 동작한다.
```

검증 시 주의:

```text
v3에서 보였던 개발용 계정 버튼이나 preview 주문이
본체 병합 결과에 보이면 실패다.
```

---

## 12. 완료 기준

* [x] `kds-web-v3`의 UI/UX가 현재 제품 repo에 정확 이식된다
* [x] `dev-preview` 계층은 한 줄도 본체에 반입되지 않는다
* [x] 현재 제품 repo에 임의 창조된 UI가 생기지 않는다
* [x] `kds-web-v3`와 시각 구조가 다시 일치한다
* [x] backend 미구현 기능은 삭제가 아니라 정책적으로 제어된다
* [x] `npm --workspace kds-web run typecheck` 통과
* [x] `npm --workspace kds-web run build` 통과

### 12.1 마감 정리

최종 상태:

* 이번 문서의 범위였던 `kds-web-v3 -> DeepOrder_V2/kds-web` 정확 이식 작업은 완료 상태다.
* 완료의 의미는 `v3 UI/UX 반영`과 `dev-preview 완전 제외`가 동시에 충족됐다는 뜻이다.
* backend가 아직 없는 기능들은 제거하지 않고, 로컬 상태 기반 UX로 유지하면서 후속 backend 구현 대상으로 분리했다.

이번 문서에서 닫힌 것:

* auth 화면 / pending 화면 / KDS 보드 / 설정 / 통계 / 내 업무의 v3 기준 화면 구조 반영
* `ChefHat`, `lucide-react`, 보드 컬럼 레이아웃, metric strip, tile UI, detail modal 구조 반영
* `VITE_KDS_DEV_PREVIEW`, preview 계정 버튼, preview token/fixture/상태 분기 제거
* 실제 backend 인증/주문 API와의 런타임 재연결 확인

이번 문서에서 의도적으로 남긴 것:

* 매장 상태 저장/조회
* 담당 메뉴 저장
* 직원 관리 CRUD
* 설정 저장
* 비밀번호 변경
* 주문 숨김 / 완료 정리 / 항목 완료 토글

위 항목들은 이번 정확 이식 문서의 미완료가 아니라, 다음 backend 구현 작업의 범위다.

한 줄 마감:

```text
KDS Web v3 정확 이식 작업은 완료됐고,
이후 남은 일은 "보이는 구조"를 실제 backend 기능으로 치환하는 단계다.
```

---

## 13. 한 줄 작업 원칙

```text
이번 작업은 "v3 그대로 복사"가 아니라 "정확 UI 이식 + dev-preview 완전 제외"다.
```
