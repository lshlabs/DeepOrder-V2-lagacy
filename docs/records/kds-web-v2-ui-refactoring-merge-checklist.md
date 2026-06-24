작업 기록: `/Users/mac/Documents/kds-web-v2`에서 새로 리팩토링한 KDS Web UI/UX를 현재 `DeepOrder_V2/kds-web`과 backend/API에 안전하게 병합하기 위한 상세 체크리스트.

# KDS Web v2 UI Refactoring Merge 체크리스트

## 0. 이번 병합의 핵심 결론

이번 병합은 단순히 다음 의미가 아니다.

```text
새 UI를 그대로 복붙해서 기존 kds-web 위에 덮는다
```

이번 병합의 실제 기준은 다음이다.

```text
/Users/mac/Documents/kds-web-v2 의 UI/UX 방향은 적극 채택한다.
단, preview/dev 전용 흐름은 전부 제외하고 backend 미구현 기능은 분리한다.
현재 DeepOrder backend/API 경계에 맞게 다시 연결한다.
```

즉 이번 작업의 본질은 아래와 같다.

```text
제품 UI/UX는 반입
frontend-only 시뮬레이션은 정책 결정 후 반입/보류
preview mode는 전부 반입 금지
현재 API 계약과 충돌하는 기능은 백엔드 선행 없이는 병합 금지
```

---

## 1. 리팩토링본 1차 리뷰 결과

리뷰 대상:

```text
/Users/mac/Documents/kds-web-v2
```

비교 기준:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web
```

현재 diff 기준 확인된 차이:

```text
App.tsx 다름
AuthPage.tsx 다름
KdsPage.tsx 다름
styles.css 다름
vite-env.d.ts 다름
src/lib/preview.ts 신규 추가
```

중요 포인트:

```text
이번 v2는 이전 리팩토링보다 범위가 더 크다.
특히 preview mode와 frontend-only 운영 기능이 많이 들어왔다.
```

### 1.1 App 흐름 변화

`App.tsx` 핵심 차이:

```text
PREVIEW_MODE import 추가
preview 모드일 때 createPreviewSession()으로 즉시 진입
reauthorize / logout 도 preview 모드 분기 포함
실운영 auth 흐름과 preview 전용 흐름이 App 레벨에서 공존
```

즉 이번 병합에서 먼저 확정해야 할 것은 이것이다.

```text
PREVIEW_MODE 관련 로직은 제품 repo에 절대 반입하지 않는다.
App.tsx 에서 preview 분기를 제거한 상태로만 병합한다.
```

### 1.2 AuthPage 변화

`AuthPage.tsx` 핵심 차이:

```text
이전 병합본의 AuthPage를 기반으로 추가 refinement가 들어감
auth-tab-panels 구조 추가
rememberEmail 유지
autoLogin 유지
주소 검색 UX 유지
```

현재 판단:

```text
AuthPage는 대체로 즉시 반입 가능 영역이다.
다만 layout class 변화와 tab panel 전환 구조를 기존 styles/types와 함께 맞춰야 한다.
```

### 1.3 KdsPage 변화

`KdsPage.tsx` 핵심 차이:

```text
기존 RECEIVED / DONE 외에 MY_TASKS / STATS / SETTINGS / STAFF 탭 추가
매장 상태 popup 추가
주문 상세 modal 추가
완료 주문 비우기 confirm 추가
프론트-only 숨김(hiddenOrderIds) 제거 흐름 추가
비밀번호 변경 modal 추가
직원 관리 UI 추가
내 업무 UI 추가
통계 UI 추가
설정 UI 추가
preview mode일 때 preview orders 사용
```

문제는 이 중 상당수가 현재 backend/API와 연결되어 있지 않다는 점이다.

현재 코드상 확인된 frontend-only 또는 mock 성격:

```text
storeStatus
assignedMenus
completedItemIds 기반 내 업무
hiddenOrderIds
detailOrderId / removeOrderId / clearDoneConfirm modal
settings state
change password modal (실제 API 미구현, 로그아웃 처리 only)
DEMO_STAFF
StaffPanel 전반
StatsPanel 전반
SettingsPanel 전반
PREVIEW_MODE + createPreviewOrders()
```

즉 이번 병합의 최대 위험은 이것이다.

```text
UI는 고급화되었지만,
운영 기능처럼 보이는 많은 영역이 아직 frontend-only 상태다.
```

### 1.4 Preview Mode 추가

신규 파일:

```text
/Users/mac/Documents/kds-web-v2/src/lib/preview.ts
```

포함 내용:

```text
VITE_PREVIEW_MODE
createPreviewSession()
createPreviewOrders()
```

이 기능의 성격은 분명하다.

```text
운영 기능이 아니라 디자인 프리뷰 / 데모 / 독립 시연용 기능이다.
```

따라서 이번 병합에서는 명시적으로 제외해야 한다.

이번 작업의 최종 결정:

```text
src/lib/preview.ts 반입 금지
VITE_PREVIEW_MODE 반입 금지
App.tsx / KdsPage.tsx 의 PREVIEW_MODE 분기 반입 금지
preview session / preview orders / preview auth 우회 로직 반입 금지
```

중간 상태로 두지 않는다.

### 1.5 타입 / env 변화

`vite-env.d.ts` 변화:

```text
VITE_PREVIEW_MODE env 선언 추가
```

현재 `types.ts`는 diff 기준 큰 구조 변경이 보이지 않는다.

즉 핵심은 타입보다 다음이다.

```text
preview env 제거 여부
KdsPage에 추가된 UI 상태들이 실제 타입/API 계약과 어떻게 연결되는지
```

### 1.6 README 변화

새 README에는 다음이 추가되었다.

```text
VITE_PREVIEW_MODE=false
preview mode 설명
```

이 부분은 본 프로젝트 기준으로 그대로 채택하면 안 된다.

```text
제품 앱 + preview 모드를 같은 코드베이스에서 공존시킨다
```

이번 병합에서는 이 방향을 채택하지 않는다.

---

## 2. 이번 병합에서 먼저 내려야 할 결정

### 2.1 Preview Mode 제외 정책

이번 작업의 확정 사항:

* [x] `VITE_PREVIEW_MODE`를 현재 제품 repo에 반입하지 않는다
* [x] `src/lib/preview.ts`를 현재 제품 repo에 반입하지 않는다
* [x] `App.tsx`의 preview session / preview auth 우회 분기를 제거 대상으로 본다
* [x] `KdsPage.tsx`의 preview orders / preview fallback 분기를 제거 대상으로 본다

반입 금지 범위:

```text
VITE_PREVIEW_MODE
src/lib/preview.ts
createPreviewSession()
createPreviewOrders()
PREVIEW_MODE 조건 분기 전체
```

### 2.2 Frontend-only 운영 UI 정책

다음 기능은 현재 backend 선행 없이는 “실제 기능”처럼 병합하면 안 된다.

```text
내 업무
직원 관리
통계
설정
매장 상태 변경
비밀번호 변경
주문 숨김/제거
완료 주문 비우기
상세 모달의 수정 가능 동작
```

반드시 결정:

* [ ] 즉시 반입 가능한가?
* [ ] UI만 반입하고 disabled/badge 처리할 것인가?
* [ ] 완전히 보류할 것인가?
* [ ] backend 미구현 기능을 preview 명목으로 그대로 반입하지 않을지 결정한다

권장 기본 결정:

```text
RECEIVED / DONE / 기존 실주문 흐름은 우선 반입
그 외 운영 탭은 Phase 분리 후 조건부 반입
backend 미구현 기능은 숨기거나 보류한다
```

---

## 3. 새 기준 제품 흐름 초안

이번 v2를 병합하더라도 제품 기준 핵심 흐름은 우선 아래를 유지해야 한다.

### 3.1 Auth / Pending

```text
비로그인: AuthPage form view
가입 직후: AuthPage pending view
미승인 로그인: AuthPage pending view
승인 완료: KdsPage
```

### 3.2 KDS 운영 핵심

우선 즉시 유지해야 할 범위:

```text
GET /api/kds/orders
PATCH /api/orders/{id}/status
Authorization: Bearer <accessToken>
/api/auth/refresh 기반 세션 복원
store context는 backend가 결정
```

### 3.3 Preview / Demo

이번 병합 기준:

```text
Preview / Demo 전용 경로는 현재 제품 repo에 반입하지 않는다.
실제 병합 대상은 auth + pending + KDS 실연동 경로뿐이다.
```

---

## 4. 파일별 병합 분류

### 4.1 즉시 리뷰 대상

```text
/Users/mac/Documents/kds-web-v2/src/App.tsx
/Users/mac/Documents/kds-web-v2/src/pages/AuthPage.tsx
/Users/mac/Documents/kds-web-v2/src/pages/KdsPage.tsx
/Users/mac/Documents/kds-web-v2/src/styles.css
/Users/mac/Documents/kds-web-v2/src/vite-env.d.ts
/Users/mac/Documents/kds-web-v2/src/lib/preview.ts
```

### 4.2 현재 제품 repo 기준 영향 파일

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/App.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/AuthPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/KdsPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css
/Users/mac/Documents/DeepOrder_V2/kds-web/src/vite-env.d.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/lib/api.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/lib/auth.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/types.ts
```

### 4.3 backend 선행 검토 가능 파일

```text
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/routers/auth.py
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/routers/kds_orders.py
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/routers/order_status.py
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/schemas.py
```

---

## 5. 상세 실행 단계

## 5.1 Phase 1. Source Audit

목표:

```text
v2 리팩토링본의 기능을 제품 기능 / 제거 대상 preview 기능 / backend 미구현 기능으로 분류한다.
```

체크:

* [x] `App.tsx`의 preview 분기를 전부 식별하고 제거 대상으로 표시한다
* [x] `KdsPage.tsx`에서 실API 기반 기능과 frontend-only 기능을 분리 표로 정리한다
* [x] `preview.ts`의 session/order 샘플 범위를 정리하고 반입 금지 대상으로 표시한다
* [x] `styles.css`가 Auth/KDS 외에 어떤 신규 패널/모달 스타일을 포함하는지 정리한다
* [x] `vite-env.d.ts`의 `VITE_PREVIEW_MODE` 추가를 제거 대상으로 기록한다

산출물:

```text
Feature Classification Table
즉시 반입 / 조건부 반입 / 보류 목록
```

### Phase 1 작업 내역

감사 기준:

```text
source: /Users/mac/Documents/kds-web-v2
target: /Users/mac/Documents/DeepOrder_V2/kds-web
```

확인 결과:

* `App.tsx`
  * preview 관련 의존성이 존재한다.
  * `bootstrapSession`, `reauthorize`, `handleLogout` 에서 `PREVIEW_MODE` 분기가 들어가 있다.
  * 따라서 `App.tsx`는 UI 구조만 참고 가능하며, preview 우회 로직은 제거 전제로만 병합 가능하다.
* `AuthPage.tsx`
  * `rememberEmail`, `autoLogin`, pending 뷰 통합, `auth-tab-panels` 구조가 추가되어 있다.
  * preview 전용 의존성은 없다.
  * 현재 제품 backend auth contract에 맞춰 연결하면 반입 가능성이 높다.
* `KdsPage.tsx`
  * 실제 API 연결 구간은 `apiGetKdsOrders`, `apiUpdateOrderStatus`, `onUnauthorized` 재인증 흐름이다.
  * 동시에 `PREVIEW_MODE`, `createPreviewOrders()` 및 다수의 frontend-only 상태가 섞여 있다.
  * 다음 항목은 현재 backend 연결 없이 로컬 상태로만 동작한다.
    * `storeStatus`, `storeStatusPopup`, `pauseMinutes`
    * `assignedMenus`, `completedItemIds`
    * `hiddenOrderIds`, `contextMenu`
    * `detailOrderId`, `removeOrderId`, `clearDoneConfirm`
    * `settings`
    * `change password` 모달
    * `STAFF`, `STATS`, `SETTINGS`, `MY_TASKS` 탭
* `src/lib/preview.ts`
  * `createPreviewSession()` 과 `createPreviewOrders()` 로 데모 세션과 데모 주문을 직접 생성한다.
  * `Order.id`, `store_id`, `external_order_id` 까지 샘플 데이터로 채워 넣으므로 제품 repo 반입 금지 대상이다.
* `styles.css`
  * Auth/KDS 코어 스타일 외에 다음 계열 스타일이 대량 포함되어 있다.
    * `kds-store-status*`
    * `kds-context-menu*`
    * `kds-modal*`
    * `kds-panel*`
    * `kds-stats*`
    * `kds-settings*`
    * `kds-staff*`
    * `kds-my-tasks*`
    * `auth-tab-panels`
  * 따라서 CSS도 전량 반입이 아니라 기능 단위 선별 반입이 필요하다.
* `vite-env.d.ts`
  * `VITE_PREVIEW_MODE` 선언이 추가되어 있다.
  * 이번 병합에서는 제외해야 한다.

Feature Classification Table:

| 구분 | 항목 | 판정 | 근거 |
| --- | --- | --- | --- |
| 즉시 반입 후보 | `AuthPage` 새 레이아웃, pending 내장 전환, `rememberEmail`, `autoLogin` UI | 반입 후보 | preview 의존성 없음, 현재 auth API에 연결 가능 |
| 즉시 반입 후보 | `App.tsx`의 auth 진입 UX 구조 | 조건부 반입 | preview 분기 제거가 선행되어야 함 |
| 즉시 반입 후보 | KDS core shell 시각 구조, 사이드바/상단바/주문 보드 개선 | 조건부 반입 | 실제 주문 조회/상태 변경 흐름에만 연결해야 함 |
| 반입 금지 | `src/lib/preview.ts` 전체 | 반입 금지 | v0 검증용 샘플 세션/주문 생성 로직 |
| 반입 금지 | `PREVIEW_MODE`, `VITE_PREVIEW_MODE` | 반입 금지 | 제품 repo에 존재하면 안 됨 |
| 반입 금지 | `App.tsx`, `KdsPage.tsx`의 preview 분기 | 반입 금지 | 인증 우회/샘플 주문 주입 경로 |
| backend 선행 필요 | `STAFF`, `STATS`, `SETTINGS`, `MY_TASKS` | 보류 | 실데이터/실API 없음 |
| backend 선행 필요 | `change password` | 보류 | 현재 v2 구현은 프론트 로컬 처리 |
| backend 선행 필요 | `store status` popup | 보류 | 매장 영업상태 API 없음 |
| backend 선행 필요 | `remove order`, `clear done`, `hidden order` | 보류 | 서버 상태와 동기화되지 않음 |

Phase 1 결론:

```text
이번 병합의 안전한 출발점은 AuthPage + App(auth-only path) + KDS core visual shell 이다.
PREVIEW_MODE / preview.ts / preview fallback 은 전부 완전 제외한다.
운영 기능처럼 보이지만 backend가 없는 패널과 모달은 이번 범위에서 보류한다.
```

## 5.2 Phase 2. Merge Verdict

목표:

```text
이번 v2 병합 범위를 먼저 잘라낸다.
```

반드시 결정:

* [x] `AuthPage`는 전면 반입 가능한지 결정
* [x] `App.tsx`의 PREVIEW_MODE 제거 계획을 확정한다
* [x] `KdsPage` 전체를 반입할지, RECEIVED/DONE 중심 subset만 반입할지 결정
* [x] `STAFF`, `STATS`, `SETTINGS`, `MY_TASKS`를 이번 범위에서 반입할지 결정
* [x] `change password`, `store status`, `remove order`, `clear done` 동작을 실기능으로 반입할지 결정

권장 기본 verdict:

```text
AuthPage: 반입
App preview support: 반입 금지
KdsPage core shell/visual refresh: 반입
STAFF/STATS/SETTINGS/MY_TASKS: 보류
frontend-only 운영 기능: backend 선행 전까지 disable 또는 보류
```

### Phase 2 작업 내역

Verdict:

* `AuthPage`
  * 전면 반입 대상으로 확정한다.
  * 이유:
    * preview 의존성이 없다.
    * 현재 backend auth API 계약을 유지한 채로 UX만 이식 가능하다.
    * pending 승인 대기 뷰를 `AuthPage` 내부에 통합한 구조가 현재 제품 방향과도 일치한다.
* `App.tsx`
  * 반입 대상이지만, preview 분기를 제거한 auth/session orchestration만 반입한다.
  * 유지 대상:
    * boot session 확인
    * refresh token 재발급
    * `apiGetCurrentUser`
    * logout 이후 auth 복귀
    * pending 승인 상태별 진입 분기
  * 비반입 대상:
    * `PREVIEW_MODE`
    * preview session 주입
    * preview auth 우회
* `KdsPage`
  * 전체 파일을 그대로 반입하지 않는다.
  * 이번 범위는 `RECEIVED` / `DONE` 중심의 core KDS UX subset 반입으로 확정한다.
  * 반입 대상:
    * 리팩토링본의 정보 구조
    * 상단 툴바와 계정 영역 UX
    * 수동 새로고침 UX
    * 주문 카드 시각 구조
    * 상세 모달/토스트 중 실주문 흐름과 직접 연결되는 부분
    * `session.user`, `session.store`, `apiGetKdsOrders`, `apiUpdateOrderStatus`, `requestWithReauth` 기반 흐름
  * 비반입/보류 대상:
    * `MY_TASKS`
    * `STATS`
    * `SETTINGS`
    * `STAFF`
    * local-only `storeStatus`
    * local-only `change password`
    * local-only `remove order`
    * local-only `clear done`
    * local-only `hidden order`
* `styles.css`
  * 전량 교체가 아니라, 이번 범위에서 실제로 쓰는 Auth/KDS 코어 스타일만 반입한다.
  * 보류 기능용 스타일은 필요 구간만 선별 반입한다.

범위 확정표:

| 영역 | 이번 병합 판정 | 비고 |
| --- | --- | --- |
| `AuthPage` | 전면 반입 | 현재 auth API 계약 유지 |
| `App.tsx` auth/session 흐름 | 조건부 반입 | preview 제거 필수 |
| `KdsPage` core shell | 부분 반입 | RECEIVED/DONE 중심 |
| `KdsPage` 전체 탭 구조 | 부분 반입 | 탭 골격은 가능, backend 없는 탭 내용은 제외 또는 숨김 |
| `STAFF` | 보류 | backend/API 없음 |
| `STATS` | 보류 | 실제 집계 API 없음 |
| `SETTINGS` | 보류 | 저장 API 없음 |
| `MY_TASKS` | 보류 | 메뉴 할당 데이터 모델/API 없음 |
| `change password` | 보류 | 실제 auth API 미연결 |
| `store status` | 보류 | 운영 상태 API 없음 |
| `remove order` / `clear done` | 보류 | 서버 상태와 불일치 위험 |
| `preview.ts` / `PREVIEW_MODE` | 반입 금지 | 완전 제외 대상 |

Phase 2 최종 결론:

```text
이번 v2 병합은 "리팩토링본 전체 복제"가 아니다.
AuthPage는 새 기준 그대로 반입하고,
App은 preview 제거 후 auth/session 흐름만 반입하고,
KdsPage는 RECEIVED/DONE 중심 core KDS UX만 선별 반입한다.
운영 기능처럼 보이지만 backend가 없는 기능은 이번 체크리스트에서 전부 보류한다.
```

## 5.3 Phase 3. Preview Mode Removal

목표:

```text
preview mode 관련 로직을 현재 제품 repo 병합 범위에서 완전히 제외한다.
```

체크:

* [x] `src/lib/preview.ts`를 반입하지 않는 것으로 확정한다
* [x] `App.tsx`에서 `PREVIEW_MODE` 관련 boot/reauthorize/logout 분기를 제거 대상으로 표시한다
* [x] `KdsPage.tsx`에서 `PREVIEW_MODE` 관련 preview orders 분기를 제거 대상으로 표시한다
* [x] `vite-env.d.ts`의 `VITE_PREVIEW_MODE` 선언을 반입하지 않는 것으로 확정한다
* [x] preview 관련 README/env 서술을 제품 repo 문서에 반입하지 않도록 기록한다

주의:

```text
preview mode는 이번 병합에서 단순 격리 대상이 아니라 완전 제외 대상이다.
현재 제품 repo에서는 존재 자체가 없어야 한다.
```

### Phase 3 작업 내역

확인 범위:

```text
target repo: /Users/mac/Documents/DeepOrder_V2/kds-web
source repo: /Users/mac/Documents/kds-web-v2/src
```

실제 확인 결과:

* 현재 제품 repo `kds-web/src`에는 다음 preview 코드가 존재하지 않는다.
  * `PREVIEW_MODE`
  * `VITE_PREVIEW_MODE`
  * `createPreviewSession()`
  * `createPreviewOrders()`
  * `src/lib/preview.ts`
* source `kds-web-v2`에는 다음 제거 대상이 명확히 존재한다.
  * `App.tsx`
    * boot 시 preview 세션 주입
    * `reauthorize()` 에서 preview access token 우회
    * `handleLogout()` 에서 preview 세션 복구
  * `KdsPage.tsx`
    * 초기 `orders` / `loading` 상태의 preview 분기
    * `fetchOrders()` 의 preview fallback
    * `updateOrderStatus()` 의 preview local update
  * `vite-env.d.ts`
    * `VITE_PREVIEW_MODE`
  * `src/lib/preview.ts`
    * demo session / demo order 생성 전체
* 문서 기준 확정:
  * 위 항목들은 전부 병합 제외 대상이다.
  * 제품 repo에는 새 파일로도, 조건 분기로도 반입하지 않는다.
* 예외 확인:
  * `kds-web/package.json` 의 `"preview": "vite preview"` 는 Vite 기본 미리보기 명령이다.
  * 이것은 dev/demo `PREVIEW_MODE` 와 무관하므로 제거 대상이 아니다.

제거/비반입 목록:

```text
/Users/mac/Documents/kds-web-v2/src/lib/preview.ts
/Users/mac/Documents/kds-web-v2/src/App.tsx 의 PREVIEW_MODE import 및 분기
/Users/mac/Documents/kds-web-v2/src/pages/KdsPage.tsx 의 PREVIEW_MODE import 및 분기
/Users/mac/Documents/kds-web-v2/src/vite-env.d.ts 의 VITE_PREVIEW_MODE 선언
preview env / preview README 서술
```

Phase 3 결론:

```text
preview mode 관련 로직은 "나중에 정리" 대상이 아니라 이번 병합의 명시적 비반입 대상이다.
이후 실제 코드 병합 단계에서는 preview.ts 신규 생성 금지, PREVIEW_MODE env 추가 금지, App/KdsPage preview 조건 분기 추가 금지를 기본 규칙으로 적용한다.
```

## 5.4 Phase 4. Auth Flow Merge

목표:

```text
AuthPage와 App의 v2 UX를 반입하되,
현재 backend auth contract에 계속 정확히 연결한다.
```

체크:

* [x] `AuthPage`의 새 구조를 현재 `apiLogin`, `apiRegister` 흐름에 연결한다
* [x] `rememberEmail`, `autoLogin` 동작이 현재 구현과 충돌하지 않는지 확인한다
* [x] pending view 전환이 현재 `registeredPending`, `approvalStatus` 흐름과 일치하는지 확인한다
* [x] `App.tsx`의 boot / me / refresh / logout 흐름이 preview 분기 제거 후에도 안전한지 확인한다
* [x] boot error / refresh failure / logout 이후 화면 복귀가 유지되는지 확인한다

### Phase 4 작업 내역

적용 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/AuthPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css
```

반영 내용:

* `AuthPage.tsx`
  * 기존의 `tab === "login" ? ... : ...` 조건부 렌더링을 제거했다.
  * v2 기준의 `auth-tab-panels` / `auth-tab-panel` 구조로 변경했다.
  * 로그인/가입 폼은 그대로 `apiLogin`, `apiRegister` 를 호출한다.
  * `rememberEmail`, `autoLogin` 로컬 저장 동작은 기존 구현을 그대로 유지했다.
  * pending 승인 대기 뷰는 기존처럼 `pendingInfo` 기반으로 동작하며, `onBackFromPending` 복귀 흐름도 유지했다.
* `styles.css`
  * `auth-tab-panels`
  * `auth-tab-panel`
  * `auth-tab-panel--visible`
  * 위 3개 클래스만 최소 추가해 로그인/가입 폼 fade 전환 UX를 반영했다.
* `App.tsx`
  * 이번 단계에서는 추가 수정하지 않았다.
  * 이유:
    * 현재 제품 repo의 `App.tsx`는 이미 preview 제거 상태다.
    * boot / reauthorize / logout / pending 분기 흐름이 이번 병합 목표와 일치한다.

검증 결과:

* `npm --workspace kds-web run typecheck` 통과
* `npm --workspace kds-web run build` 통과

Phase 4 결론:

```text
Auth Flow Merge는 "AuthPage UX 이식 + 기존 auth contract 유지" 방식으로 완료했다.
세션 로직은 건드리지 않고, 로그인/가입/pending 전환 UI만 v2 기준으로 올렸다.
이 단계에서 preview 로직은 추가되지 않았고, backend API 계약도 바뀌지 않았다.
```

## 5.5 Phase 5. KDS Core UX Merge

목표:

```text
KdsPage의 core visual/interaction만 우선 반입한다.
```

반드시 유지할 현재 동작:

```text
GET /api/kds/orders
PATCH /api/orders/{id}/status
requestWithReauth()
refresh 후 재호출
session.user / session.store 사용
실데이터만 사용
```

우선 반입 후보:

```text
사이드바 정보구조
상단 툴바 개선
수동 새로고침 UX
주문 카드 상세 시각 개선
토스트/모달 레이아웃 개선
접수/완료 탭 개선
계정 팝오버 개선
```

보류/조건부 후보:

```text
MY_TASKS
STATS
SETTINGS
STAFF
store status popup
change password modal
order remove/hide
clear done
```

체크:

* [x] core 주문 조회/상태 변경을 깨지 않는 범위만 먼저 반입한다
* [x] frontend-only 기능이 실기능처럼 보이지 않도록 숨기거나 제한한다
* [x] 실API 응답만 사용하고 preview fallback이 남지 않도록 확인한다
* [x] 빈 응답/에러 시 mock fallback이 다시 생기지 않도록 확인한다

### Phase 5 작업 내역

적용 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/KdsPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css
```

반영 내용:

* `KdsPage.tsx`
  * `refreshing` 상태를 추가하고, 수동 새로고침 시 최소 600ms 동안 회전 애니메이션이 보이도록 반영했다.
  * `receivedOrders` 정렬을 `NEW -> COOKING` 우선순위 유지 + 주문 시간 오름차순으로 변경했다.
  * `doneOrders` 정렬을 `updated_at` 기준 최신순으로 변경했다.
  * 상단바 좌측에 현재 `storeName` / 사용자 컨텍스트를 표시하는 core 헤더 구조를 추가했다.
  * 실제 주문 데이터만 사용하는 `detailOrderId` 기반 상세 모달을 추가했다.
  * `OrderCard`에 `상세` 버튼을 추가해 상세 모달을 열 수 있게 했다.
* `styles.css`
  * `kds-topbar-left`
  * `kds-topbar-store-name`
  * `kds-topbar-store-meta`
  * `kds-card-head-actions`
  * `kds-order-detail-btn`
  * `kds-modal*`
  * `kds-detail-*`
  * 위 클래스만 최소 추가해 실제 반입한 KDS core UX를 지원했다.

이번 단계에서 의도적으로 제외한 항목:

* `MY_TASKS`
* `STATS`
* `SETTINGS`
* `STAFF`
* `store status popup`
* `change password modal`
* `order remove/hide`
* `clear done`
* item 완료 토글
* context menu

검증 결과:

* `npm --workspace kds-web run typecheck` 통과
* `npm --workspace kds-web run build` 통과

Phase 5 결론:

```text
KDS Core UX Merge는 실데이터 기반 기능만 남기고 진행했다.
주문 조회, 상태 변경, 재인증, 새로고침, 상세 확인은 유지/개선했고,
frontend-only 운영 기능과 preview fallback은 이번 단계에서도 반입하지 않았다.
```

## 5.6 Phase 6. Feature Gate / Hold Matrix

목표:

```text
v2의 추가 기능을 gate/hold 기준으로 문서화한다.
```

분류 표 필수:

* [x] `MY_TASKS` = 반입 / 보류
* [x] `STATS` = 반입 / 보류
* [x] `SETTINGS` = 반입 / 보류
* [x] `STAFF` = 반입 / 보류
* [x] `storeStatus` = 반입 / 보류
* [x] `change password` = 반입 / 보류
* [x] `remove/hide order` = 반입 / 보류
* [x] `clear done` = 반입 / 보류

권장:

```text
backend/API가 없는 기능은 이번 병합에서 기본 보류
```

### Phase 6 작업 내역

Feature Gate / Hold Matrix:

| 기능 | 판정 | 현재 상태 | 판단 근거 | 다음 조건 |
| --- | --- | --- | --- | --- |
| `MY_TASKS` | 보류 | 로컬 `assignedMenus`, `completedItemIds` 기반 | 메뉴 할당 모델/API 없음 | 매장별 업무 할당 schema + API 필요 |
| `STATS` | 보류 | 프론트 계산/표시 중심 | 운영용 통계 API 없음 | 기간/집계 기준이 있는 stats API 필요 |
| `SETTINGS` | 보류 | 로컬 `settings` 상태만 존재 | 저장/동기화 API 없음 | 사용자/매장 설정 저장 API 필요 |
| `STAFF` | 보류 | 데모 staff 목록 사용 | 실제 직원 계정/권한 모델과 미연결 | staff CRUD + role/PIN 정책 API 필요 |
| `storeStatus` | 보류 | 로컬 `OPEN/PAUSED/CLOSED` 상태 | 영업 상태를 backend에 반영하지 않음 | 매장 영업 상태 API 필요 |
| `change password` | 보류 | 프론트 성공 시뮬레이션 후 로그아웃 | 실제 비밀번호 변경 API 없음 | auth password change API 필요 |
| `remove/hide order` | 보류 | `hiddenOrderIds` 프론트 은닉 | 서버 상태와 불일치 가능 | archive/hide 정책과 API 필요 |
| `clear done` | 보류 | 완료 주문을 프론트에서만 숨김 | 실제 완료 이력 보존 정책 불명확 | done archive/purge API 및 정책 필요 |
| `context menu` | 보류 | 상세/제거 진입용 프론트 메뉴 | 제거 기능이 보류라 함께 보류 | 상세/보관/조치 정책 확정 필요 |
| `item 완료 토글` | 보류 | 메뉴 단위 client-only 완료 표시 | item-level 상태 모델/API 없음 | item status schema + KDS UX 규칙 필요 |

이번 단계 최종 판정:

```text
Phase 6 기준으로 hold 대상 기능은 전부 "보류"로 확정한다.
이번 병합에서 gate를 열어 반입하는 추가 기능은 없다.
현재 반입 범위는 Auth / Pending / KDS core(received, done, refresh, detail)로 유지한다.
```

문서상 운영 규칙:

* backend/API가 없는 기능은 "UI가 있으니 먼저 넣고 비활성화" 방식으로도 반입하지 않는다.
* 실데이터와 동기화되지 않는 프론트 로컬 상태는 운영 기능처럼 보이면 안 된다.
* 다음 단계 이후에도 hold 기능을 반입하려면 별도 backend contract와 검증 단계가 먼저 추가되어야 한다.

## 5.7 Phase 7. styles.css 반입 전략

목표:

```text
v2 styles.css를 반입하되,
현재 실제 반입 범위의 컴포넌트와 클래스만 기준으로 정리한다.
```

체크:

* [x] Auth / Pending / KDS core styles를 우선 반입한다
* [x] 보류된 패널/탭/모달용 스타일은 같이 반입할지 결정한다
* [x] 미사용 old class와 미사용 신규 class를 정리한다
* [x] 모바일/태블릿 breakpoint 기준을 다시 확인한다

### Phase 7 작업 내역

스타일 반입 원칙:

```text
styles.css는 v2 전체를 복제하지 않는다.
현재 실제 반입된 화면(Auth / Pending / KDS core)에서 사용하는 클래스만 유지한다.
보류 기능 전용 스타일은 이번 단계에서 반입하지 않는다.
```

현재 실제 반입/사용 중인 신규 스타일군:

* Auth / Pending
  * `auth-tab-panels`
  * `auth-tab-panel`
  * `auth-tab-panel--visible`
  * 기존 `auth-view`, `pending-*`, `login-options`, `checkbox-label`
* KDS core
  * `kds-topbar-left`
  * `kds-topbar-store-name`
  * `kds-topbar-store-meta`
  * `kds-card-head-actions`
  * `kds-order-detail-btn`
  * `kds-modal*`
  * `kds-detail-*`
  * 기존 `kds-sidebar*`, `kds-topbar*`, `kds-tab*`, `kds-board`, `kds-card*`, `kds-item*`, `kds-request*`, `kds-toast*`

이번 단계에서 보류로 확정한 스타일군:

* `kds-store-status*`
* `kds-context-menu*`
* `kds-panel*`
* `kds-my-tasks*`
* `kds-stats*`
* `kds-settings*`
* `kds-staff*`
* `kds-modal-btn*`
* `kds-detail-sensitive-label`

미사용/비반입 정리 결론:

* 현재 제품 repo에는 hold 기능 전용 스타일군을 추가하지 않는다.
* 기존 old class 중 즉시 제거가 필요한 충돌 클래스는 발견되지 않았다.
* 따라서 이번 단계에서는 스타일 삭제보다 "반입 범위 고정"이 우선이다.

반응형 기준 점검:

* 현재 `kds-web/src/styles.css`의 모바일/태블릿 breakpoint는 유지한다.
* 이번 단계에서 추가한 `AuthPage` 패널 전환 및 KDS 상세 모달 스타일은 기존 breakpoint 체계와 충돌하지 않는다.
* 별도의 새 breakpoint 추가는 하지 않는다.

Phase 7 결론:

```text
styles.css 반입 전략은 "필요 클래스만 선별 유지"로 확정한다.
보류 기능용 스타일은 지금 미리 들여오지 않고,
실제 기능이 반입되는 시점에 해당 스타일군도 같이 검토한다.
```

## 5.8 Phase 8. 타입 / API / Env Boundary

목표:

```text
v2에서 추가된 env 제거, 그리고 신규 state가 현재 타입과 API 계약을 깨지 않는지 확인한다.
```

체크:

* [x] `vite-env.d.ts`에 `VITE_PREVIEW_MODE`를 추가하지 않는 것으로 확정한다
* [x] `types.ts`가 v2 KdsPage core 반입에 충분한지 확인한다
* [x] `lib/api.ts`, `lib/auth.ts`는 현재 버전을 유지할지 점검한다
* [x] backend endpoint 추가가 필요한 기능 목록을 분리한다
* [x] frontend-only 상태를 실API 계약으로 오인하는 부분이 없는지 확인한다

### Phase 8 작업 내역

확인 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/vite-env.d.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/types.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/lib/api.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/lib/auth.ts
```

점검 결과:

* `vite-env.d.ts`
  * 현재 제품 repo는 `/// <reference types="vite/client" />`만 유지한다.
  * `VITE_PREVIEW_MODE` 선언은 추가하지 않는다.
* `types.ts`
  * 현재 core 반입 범위에 필요한 타입은 이미 충족한다.
  * `AuthSession`, `AuthUser`, `AuthStore`, `Order`, `OrderItem`, `OrderAIAnalysis`, `OrderStatus` 만으로 현재 `AuthPage` / `KdsPage` 구현이 가능하다.
  * 이번 단계에서 신규 타입 추가는 불필요하다.
* `lib/api.ts`
  * 현재 유지 계약:
    * `POST /api/auth/login`
    * `POST /api/auth/register`
    * `POST /api/auth/refresh`
    * `POST /api/auth/logout`
    * `GET /api/auth/me`
    * `GET /api/kds/orders`
    * `PATCH /api/orders/{id}/status`
  * 현재 반입 범위는 위 계약만 사용한다.
  * 따라서 `lib/api.ts`는 현재 버전을 유지한다.
* `lib/auth.ts`
  * access/refresh token 저장, `local`/`session` 분기, access token 갱신 저장 로직이 현재 auth UX와 일치한다.
  * `rememberEmail`, `autoLogin` UI는 `AuthPage` 내부 로컬 저장과 충돌하지 않는다.
  * 따라서 `lib/auth.ts`도 현재 버전을 유지한다.

backend endpoint 선행 필요 목록:

* `PATCH /api/auth/password`
  * change password
* `GET/POST/PATCH /api/kds/settings`
  * 사용자/매장 설정 저장
* `GET /api/kds/stats`
  * 통계 집계
* `GET/POST/PATCH /api/staff`
  * 직원 관리
* `PATCH /api/stores/{storeId}/status`
  * 매장 영업 상태
* `POST /api/orders/{id}/hide` 또는 archive 계열 API
  * remove/hide order
* `POST /api/orders/clear-done` 또는 archive 정책 API
  * clear done
* item-level status API
  * item 완료 토글
* menu assignment API
  * `MY_TASKS`

계약 경계 결론:

* 현재 제품 repo에 들어간 KDS core UX는 전부 기존 실API 계약만 사용한다.
* 프론트에만 존재하는 로컬 상태를 실운영 API처럼 보이게 하는 코드는 이번 병합 범위에 포함하지 않는다.
* 이후 hold 기능을 반입하려면 타입 추가보다 먼저 backend contract 확정이 선행되어야 한다.

Phase 8 결론:

```text
타입/API/Env 경계는 현재 안정적이다.
새로 추가된 UX는 기존 auth/kds API 계약 위에서 동작하고,
보류 기능은 필요한 backend endpoint가 생기기 전까지 문서상 hold로 유지한다.
```

## 5.9 Phase 9. 검증

정적 검증:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
npm --workspace kds-web run build
```

수동 검증:

* [x] 일반 모드에서 비로그인 -> 로그인 -> pending -> 승인 후 KDS 진입 흐름이 유지된다
* [x] 일반 모드에서 `GET /api/kds/orders`와 `PATCH /api/orders/{id}/status`가 유지된다
* [x] 일반 모드에서 mock/preview fallback이 나타나지 않는다
* [x] 보류된 기능이 실동작처럼 보이지 않는지 확인한다

### Phase 9 작업 내역

정적 검증 결과:

* `npm --workspace kds-web run typecheck` 통과
* `npm --workspace kds-web run build` 통과

런타임 검증 환경:

* backend: `http://127.0.0.1:8000`
* kds-web dev: `http://127.0.0.1:5173`
* 검증용 계정:
  * email: `phase9m46nuq@example.com`
  * store: `phase9m46nuq-store`
  * storeId: `STORE_001`

실행 검증 내역:

* 승인 대기 흐름
  * 검증용 계정을 신규 등록했다.
  * 승인 전 로그인 시 `AuthPage` 내부 pending 뷰로 전환되는 것을 브라우저에서 확인했다.
* 승인 후 진입 흐름
  * 관리자 승인 API로 계정을 `APPROVED` 처리했다.
  * 같은 계정으로 재로그인 후 KDS 메인 화면 진입을 확인했다.
* 주문 수신 표시
  * `POST /api/external/orders/webhook` 으로 `P91001` 주문을 주입했다.
  * KDS 접수 탭에 `#P91001` 카드가 실제로 표시되는 것을 확인했다.
* 상세 모달
  * `상세` 버튼 클릭 시 주문번호, 주문 시간, 플랫폼, 결제금액, 메뉴, 요청사항, 배달 요청을 보여주는 모달이 열리는 것을 확인했다.
* 상태 변경
  * KDS에서 `조리 시작` 클릭 후 버튼이 `완료`로 바뀌는 것을 확인했다.
  * 이어서 `완료` 클릭 후 접수 카운트가 `0`, 완료 카운트가 `1` 로 바뀌는 것을 확인했다.
  * 완료 탭으로 전환했을 때 `#P91001` 주문이 완료 목록에 나타나는 것을 확인했다.
  * API 재검증 결과 주문 상태는 `DONE` 으로 저장되어 있었다.
* preview/mock fallback 배제
  * `kds-web/src` 기준 `PREVIEW_MODE`, `VITE_PREVIEW_MODE`, `createPreviewSession`, `createPreviewOrders`, `lib/preview` 반입이 없음을 재확인했다.
* 보류 기능 노출 점검
  * 현재 화면에는 `STAFF`, `STATS`, `SETTINGS`, `MY_TASKS`, `storeStatus`, `remove/hide order`, `clear done`, `change password` 등 hold 기능이 실동작처럼 노출되지 않음을 확인했다.

Phase 9 결론:

```text
현재 병합 범위(Auth / Pending / KDS core)는 정적 검증과 런타임 검증을 모두 통과했다.
승인 대기 -> 승인 -> 로그인 -> 주문 수신 -> 상세 확인 -> 상태 변경 -> 완료 반영까지 실제 backend와 연결된 흐름으로 확인했다.
```

---

## 6. 완료 기준

* [x] `/Users/mac/Documents/kds-web-v2`의 리팩토링 의도를 분해해서 병합 범위를 먼저 확정한다
* [x] preview mode 관련 로직을 전부 제외 대상으로 확정한다
* [x] AuthPage / App의 새 UX는 현재 auth backend와 정확히 연결된다
* [x] KDS core 실주문 흐름은 유지된다
* [x] frontend-only 기능은 반입/보류로 명확히 분류된다
* [x] preview 관련 코드가 현재 제품 repo에 반입되지 않게 경계가 문서화된다
* [x] `npm --workspace kds-web run typecheck` 통과
* [x] `npm --workspace kds-web run build` 통과

완료 판정:

```text
이번 체크리스트 범위는 완료다.
반입 범위는 Auth / Pending / KDS core로 고정되었고,
preview 완전 제외, hold 기능 보류, 런타임 검증까지 모두 끝났다.
```

---

## 7. 작업 후 기록 필수 사항

실제 병합 후 반드시 기록:

* [x] 수정 파일 목록
* [x] 즉시 반입한 기능 목록
* [x] 보류한 기능 목록
* [x] preview 반입 금지 목록
* [x] 제거한 dev / preview 코드 목록
* [x] backend 추가 수정 여부
* [x] 검증 명령 결과
* [x] 남은 parity gap 또는 후속 backend 필요 목록

### 최종 기록

수정 파일 목록:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/AuthPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/KdsPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css
/Users/mac/Documents/DeepOrder_V2/docs/records/kds-web-v2-ui-refactoring-merge-checklist.md
```

즉시 반입한 기능 목록:

* `AuthPage`의 패널 전환형 로그인/가입 UX
* `pendingInfo` 기반 승인 대기 뷰 통합
* `rememberEmail`, `autoLogin` UX 유지
* `App`의 기존 auth/session 흐름 위에서 새 auth 화면 연결
* KDS core 상단 컨텍스트 표시
* KDS 수동 새로고침 UX
* KDS 접수/완료 정렬 개선
* 주문 상세 모달

보류한 기능 목록:

* `MY_TASKS`
* `STATS`
* `SETTINGS`
* `STAFF`
* `storeStatus`
* `change password`
* `remove/hide order`
* `clear done`
* `context menu`
* `item 완료 토글`

preview 반입 금지 목록:

```text
PREVIEW_MODE
VITE_PREVIEW_MODE
src/lib/preview.ts
createPreviewSession()
createPreviewOrders()
App.tsx / KdsPage.tsx 의 preview 조건 분기
preview env / preview README 서술
```

제거한 dev / preview 코드 목록:

```text
이번 제품 repo 병합에서는 preview 코드를 새로 반입하지 않았다.
즉 "제거"보다 "비반입 유지"가 적용되었다.
```

backend 추가 수정 여부:

```text
없음.
이번 병합은 kds-web 프론트 범위에서만 진행했고,
기존 backend auth / kds API 계약을 그대로 사용했다.
```

검증 명령 결과:

```text
npm --workspace kds-web run typecheck  -> 통과
npm --workspace kds-web run build      -> 통과
브라우저 런타임 검증                    -> 통과
주문 상태 API 재검증                    -> DONE 확인
```

남은 parity gap / 후속 backend 필요 목록:

* 비밀번호 변경 API
* 매장 영업 상태 API
* 직원 관리 API
* KDS 설정 저장 API
* KDS 통계 API
* 메뉴 할당 / `MY_TASKS` API
* 주문 hide/archive 정책 및 API
* 완료 주문 정리 정책 및 API
* item-level status API

---

## 8. 한 줄 작업 원칙

```text
kds-web-v2의 UI/UX 진화는 적극 채택하되,
preview 전용 흐름은 완전히 제외하고 backend 미구현 운영 기능은 분리한 상태로 안전하게 병합한다.
```
