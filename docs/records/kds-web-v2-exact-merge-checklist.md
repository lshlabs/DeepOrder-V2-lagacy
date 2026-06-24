작업 기록: `/Users/mac/Documents/kds-web-v2`의 UI/UX를 현재 `DeepOrder_V2/kds-web`에 정확 이식하기 위한 재작성 체크리스트. 기존 병합 문서는 범위를 과도하게 축소한 잘못된 기준이므로 이 문서를 새 기준으로 사용한다.

# KDS Web v2 정확 이식 체크리스트

## 0. 이번 문서의 기준

이번 작업의 목표는 다음이다.

```text
/Users/mac/Documents/kds-web-v2 의 UI/UX를 가능한 한 그대로 현재 kds-web에 이식한다.
단, PREVIEW_MODE / preview.ts / preview auth/session/orders 분기만 제거한다.
backend 미구현 기능이라고 해서 UI 구조를 임의로 삭제하거나 재창조하지 않는다.
```

즉 이번 작업은 다음과 다르다.

```text
backend 없는 기능을 이유로 UI를 축소 재설계한다
현재 API에 맞춘 최소 subset으로 KDS 화면을 다시 만든다
원본에 없는 헤더/버튼/배치를 새로 만든다
```

이번 문서의 핵심 원칙:

* `kds-web-v2`가 기준 소스다.
* 제거 대상은 `PREVIEW_MODE` 계열뿐이다.
* UI/UX 구조는 원본 최대 유지가 원칙이다.
* backend 미구현 기능은 먼저 "보이는 구조"와 "실제 동작"을 분리해서 판단한다.
* 사용자 승인 없이 임의로 축소/재구성하지 않는다.

---

## 1. 이전 작업의 오류 정리

이전 병합에서 잘못된 점:

* `PREVIEW_MODE 제거`를 `KDS UI 축소`와 같은 작업으로 잘못 묶었다.
* `MY_TASKS`, `STAFF`, `STATS`, `SETTINGS`, `storeStatus` 같은 원본 UI를 임의로 제거했다.
* 원본에는 없는 `매장명 + 사용자명 텍스트 헤더`, `상세 버튼 중심 구조`를 새로 넣었다.
* 결과적으로 `정확 이식`이 아니라 `subset 재구성`이 되었다.

이번 문서의 복구 목표:

```text
AuthPage: v2 기준 유지
App: preview 제거만 적용
KdsPage: v2 레이아웃과 UX를 원본 기준으로 복구
styles.css: v2 스타일 구조를 원본 기준으로 복구
```

---

## 2. 정확 이식 범위

### 2.1 그대로 유지해야 하는 원본 구조

다음은 `kds-web-v2` 기준으로 가능한 한 그대로 유지한다.

* `App.tsx`의 전체 세션 흐름
* `AuthPage.tsx`의 전체 레이아웃과 전환 UX
* `KdsPage.tsx`의 전체 탭 구조
* 좌측 사이드바 아이콘 구성
* 상단 `영업중` 배지와 중앙 탭 구조
* `내 업무`, `직원`, `통계`, `설정` UI 진입 구조
* 카드 내 메뉴 아이템 표시 방식
* 카드 헤더/배지/버튼 배치
* 상세 모달 / 컨텍스트 메뉴 / 완료 정리 / 비밀번호 변경 모달의 UI 구조
* `styles.css`의 해당 컴포넌트 스타일

### 2.2 제거 대상

다음만 명시적으로 제거한다.

```text
src/lib/preview.ts
PREVIEW_MODE
VITE_PREVIEW_MODE
createPreviewSession()
createPreviewOrders()
App.tsx 의 preview bootstrap/reauthorize/logout 분기
KdsPage.tsx 의 preview orders / preview fallback 분기
```

### 2.3 별도 정책 결정 대상

다음은 "UI를 없앨지"가 아니라 "동작을 어떻게 처리할지"를 결정해야 하는 영역이다.

* `storeStatus`
* `MY_TASKS`
* `STAFF`
* `STATS`
* `SETTINGS`
* `change password`
* `remove/hide order`
* `clear done`
* `item 완료 토글`

정책 후보:

* 실제 동작 연결
* read-only 유지
* 클릭 시 안내 메시지
* disabled 처리

중요:

```text
이 단계에서는 UI 자체를 삭제하지 않는다.
```

---

## 3. 소스 감사 재수행

목표:

```text
현재 kds-web와 kds-web-v2의 차이를 "제거할 것"과 "복구할 것"으로 다시 분류한다.
```

체크:

* [ ] `App.tsx`에서 preview 분기만 제거 대상으로 표시한다
* [ ] `AuthPage.tsx`가 현재 v2와 얼마나 동일한지 다시 확인한다
* [ ] `KdsPage.tsx`에서 현재 제품 repo가 빠뜨린 원본 UI 요소를 목록화한다
* [ ] `styles.css`에서 현재 제품 repo가 빠뜨린 원본 스타일군을 목록화한다
* [ ] 이전 작업에서 임의 생성한 UI를 식별한다

산출물:

```text
Missing UI Inventory
Custom Added UI Inventory
```

### 3.1 감사 결과

체크:

* [x] `App.tsx`에서 preview 분기만 제거 대상으로 표시한다
* [x] `AuthPage.tsx`가 현재 v2와 얼마나 동일한지 다시 확인한다
* [x] `KdsPage.tsx`에서 현재 제품 repo가 빠뜨린 원본 UI 요소를 목록화한다
* [x] `styles.css`에서 현재 제품 repo가 빠뜨린 원본 스타일군을 목록화한다
* [x] 이전 작업에서 임의 생성한 UI를 식별한다

결론:

* `App.tsx`
  * 현재 제품 repo는 `kds-web-v2`에서 `PREVIEW_MODE` / `createPreviewSession()` 관련 분기만 제거한 상태다.
  * 즉 `App.tsx`는 새 기준에 대체로 부합한다.
* `AuthPage.tsx`
  * 현재 제품 repo는 `kds-web-v2`와 사실상 동일하다.
  * 차이는 주석 삭제 정도이며, 구조/동작 차이는 없다.
* 실제 문제 구간:
  * `KdsPage.tsx`
  * `styles.css`

Missing UI Inventory:

* `BoardTab = RECEIVED | DONE | MY_TASKS | STATS | SETTINGS | STAFF`
* 좌측 `업무 / 직원 / 통계 / 설정` 사이드바 구조
* 상단 `영업중` 상태 배지
* 상단 `접수 / 완료 / 내 업무` 탭 구조
* `StaffPanel`
* `StatsPanel`
* `SettingsPanel`
* `MyTasksPanel`
* `contextMenu`
* `removeOrderId` 제거 확인 모달
* `clearDoneConfirm` 완료 정리 모달
* `pwModal` 비밀번호 변경 모달
* `completedItemIds` 기반 item 완료 토글 UX
* `assignedMenus` 기반 `내 업무` UX
* `storeStatusPopup` 및 `pauseMinutes` 제어 UX
* 카드의 원본 버튼/배지 배치와 long-press/context menu 흐름

Missing Style Inventory:

* `kds-store-status*`
* `kds-store-status-popup*`
* `kds-pause-*`
* `kds-context-menu*`
* `kds-panel*`
* `kds-my-tasks*`
* `kds-stats*`
* `kds-settings*`
* `kds-staff*`
* `kds-modal-btn*`
* `kds-modal--sm`
* `kds-detail-sensitive-label`
* `kds-items--2col`
* `item-done` 관련 스타일

Custom Added UI Inventory:

* 원본에는 없는 `kds-topbar-store-name` / `kds-topbar-store-meta` 기반 텍스트 헤더
* 원본에는 없는 `상세` 버튼 중심 카드 헤더 구조
* 원본의 `업무` 탭/사이드바 전체를 제거하고 `접수 / 완료` 2탭으로 축소한 구조
* 원본의 `영업중` 배지를 제거한 상태
* 원본의 `직원 / 통계 / 설정 / 내 업무` UI 진입 구조를 제거한 상태

복구 우선순위:

1. `KdsPage.tsx`를 `kds-web-v2` 기준으로 복구
2. `styles.css`를 `kds-web-v2` 기준으로 복구
3. `App.tsx`는 preview 제거 상태 유지
4. `AuthPage.tsx`는 현재 상태 유지

한 줄 결론:

```text
첫 작업 감사 결과, 새 기준에서 실제 수정 대상은 App/Auth가 아니라 KdsPage와 styles.css다.
```

---

## 4. App 정확 이식

목표:

```text
App.tsx는 v2 기준으로 맞추되 preview 분기만 제거한다.
```

체크:

* [x] `bootstrapSession()`을 v2 기준으로 맞춘다
* [x] `reauthorize()`를 v2 기준으로 맞춘다
* [x] `handleLogout()`을 v2 기준으로 맞춘다
* [x] `PREVIEW_MODE` 관련 줄만 제거한다
* [x] 나머지 auth/pending/session 흐름은 v2 구조를 유지한다

주의:

```text
App.tsx를 현재 최소 기능판 기준으로 유지하지 않는다.
v2 기준 구조를 기본으로 복구한다.
```

### 4.1 작업 내역

확인 결과:

* 현재 `kds-web/src/App.tsx`는 `kds-web-v2/src/App.tsx`와 비교했을 때 다음만 제거된 상태다.
  * `import { createPreviewSession, PREVIEW_MODE } from "./lib/preview";`
  * `bootstrapSession()`의 preview 세션 우회 분기
  * `reauthorize()`의 preview access token 우회 분기
  * `handleLogout()`의 preview 세션 복구 분기
* 그 외 auth/session/pending 구조는 v2와 동일하다.

이번 단계 조치:

```text
코드 수정 없음
문서 기준 완료 처리
```

이유:

```text
App.tsx는 이미 "v2 기준 + preview 제거" 상태이므로,
이번 새 기준 문서에서도 추가 수정 대상이 아니다.
```

Phase 4 결론:

```text
App 정확 이식은 이미 충족되어 있었다.
현재 App.tsx는 유지하고, 이후 실제 복구 작업은 KdsPage와 styles.css에 집중한다.
```

---

## 5. AuthPage 정확 이식

목표:

```text
AuthPage는 현재 backend auth contract에 연결된 상태로 v2와 동일하게 만든다.
```

체크:

* [x] 로그인/가입 탭 구조를 v2와 동일하게 유지한다
* [x] pending 뷰 구조를 v2와 동일하게 유지한다
* [x] `rememberEmail`, `autoLogin` UX를 v2와 동일하게 유지한다
* [x] 주소 검색 흐름을 유지한다
* [x] 불필요한 로컬 변형이 없는지 확인한다

### 5.1 작업 내역

확인 결과:

* 현재 `kds-web/src/pages/AuthPage.tsx`는 `kds-web-v2/src/pages/AuthPage.tsx`와 비교했을 때 구조/동작 차이가 없다.
* diff 상 차이는 다음뿐이다.
  * `auth-tab-panels` 내부의 주석 삭제
    * `/* Login form */`
    * `/* Register form */`
* 즉 다음 항목은 이미 v2 기준과 동일하다.
  * 로그인/가입 탭 구조
  * pending 뷰 구조
  * `rememberEmail`
  * `autoLogin`
  * 주소 검색 팝업 연동
  * `pendingInfo` / `onBackFromPending` 흐름

이번 단계 조치:

```text
코드 수정 없음
문서 기준 완료 처리
```

이유:

```text
AuthPage는 이미 정확 이식 상태이며,
추가 수정은 오히려 불필요한 diff만 만든다.
```

Phase 5 결론:

```text
AuthPage 정확 이식은 이미 충족되어 있었다.
실제 복구 작업은 계속 KdsPage와 styles.css에 집중한다.
```

---

## 6. KdsPage 정확 이식

목표:

```text
KdsPage는 v2의 UI/UX 구조를 기준으로 복구한다.
단, preview 로직만 제거한다.
```

반드시 복구할 것:

* [x] `BoardTab = RECEIVED | DONE | MY_TASKS | STATS | SETTINGS | STAFF`
* [x] 좌측 사이드바의 `업무 / 직원 / 통계 / 설정` 구조
* [x] 상단 `영업중` 상태 배지
* [x] 상단 `접수 / 완료 / 내 업무` 탭 구조
* [x] 카드 내 `배달` 뱃지와 버튼 배치
* [x] `상세정보` 진입 구조
* [x] 컨텍스트 메뉴 UI
* [x] `완료 내역 정리` 진입 UI
* [x] `비밀번호 변경` 모달 UI
* [x] `StaffPanel`, `StatsPanel`, `SettingsPanel`, `MyTasksPanel`의 시각 구조

이번 단계에서 하지 말 것:

* [x] 원본에 없는 새 헤더를 만들지 않는다
* [x] 원본에 없는 새 버튼 구조를 만들지 않는다
* [x] backend 미구현을 이유로 원본 탭/패널 자체를 삭제하지 않는다

### 6.1 작업 내역

적용 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/KdsPage.tsx
```

이번 단계 조치:

* `kds-web-v2/src/pages/KdsPage.tsx`를 기준 소스로 복구했다.
* 그 위에서 `PREVIEW_MODE` 관련 코드만 제거했다.
  * `import { createPreviewOrders, PREVIEW_MODE } from "../lib/preview";`
  * preview 주문 초기화
  * preview loading 초기화
  * `fetchOrders()`의 preview fallback 분기
  * `updateOrderStatus()`의 preview local update 분기

실제 복구된 구조:

* `BoardTab = RECEIVED | DONE | MY_TASKS | STATS | SETTINGS | STAFF`
* `storeStatus`, `storeStatusPopup`, `pauseMinutes`
* `assignedMenus`, `completedItemIds`
* `contextMenu`
* `detailOrderId`, `removeOrderId`, `clearDoneConfirm`
* `settings`
* `pwModal`
* `StaffPanel`, `StatsPanel`, `SettingsPanel`, `MyTasksPanel`
* 원본의 `업무 / 직원 / 통계 / 설정` 사이드바 구조
* 원본의 `영업중` 배지와 `접수 / 완료 / 내 업무` 상단 탭 구조

제거된 임의 UI:

* `kds-topbar-store-name` / `kds-topbar-store-meta` 기반 텍스트 헤더
* 카드 헤더의 `상세` 버튼 중심 구조
* `접수 / 완료` 2탭 축소 구조

검증 결과:

* `rg -n "PREVIEW_MODE|createPreviewOrders|lib/preview" kds-web/src/pages/KdsPage.tsx` 결과 없음
* `npm --workspace kds-web run typecheck` 통과
* `npm --workspace kds-web run build` 통과

남은 점:

```text
KdsPage의 구조는 원본 기준으로 복구되었지만,
styles.css는 아직 원본 스타일군이 완전히 복구되지 않았다.
따라서 시각적 parity 마무리는 다음 단계(styles.css 정확 이식)에서 진행한다.
```

Phase 6 결론:

```text
KdsPage 정확 이식은 완료되었다.
지금부터의 차이는 구조가 아니라 스타일 복구와 동작 정책 정리 문제다.
```

---

## 7. 동작 정책 분리

목표:

```text
원본 UI를 유지한 채, backend 미구현 기능의 동작만 별도로 정리한다.
```

기능별 결정 필요:

* [x] `storeStatus`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `MY_TASKS`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `STAFF`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `STATS`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `SETTINGS`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `change password`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `remove/hide order`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `clear done`를 실제 동작/안내/비활성 중 무엇으로 둘지 정한다
* [x] `item 완료 토글`을 실제 동작/안내/비활성 중 무엇으로 둘지 정한다

원칙:

```text
UI는 보존, 동작은 정책으로 제어.
```

### 7.1 작업 내역

이번 단계 성격:

```text
문서 기준 동작 정책 확정 단계
코드 수정은 하지 않고, 이후 단계의 구현 기준을 고정한다.
```

정책 매트릭스:

| 기능 | 현재 구현 성격 | 정책 | 이유 | 이후 구현 원칙 |
| --- | --- | --- | --- | --- |
| `storeStatus` | 프론트 로컬 상태 | `안내` | 실제 매장 영업 상태와 동기화되지 않음 | UI는 유지, 상태 변경은 안내 또는 read-only로 제한 |
| `MY_TASKS` | 프론트 로컬 메뉴 할당 | `비활성` | 실제 메뉴 할당/담당자 모델 없음 | 탭은 유지하되 실조작은 막고 안내 필요 |
| `STAFF` | 데모 staff 데이터 | `비활성` | 실제 직원 데이터가 아님 | 데모 데이터 제거 또는 빈 상태 + 안내 |
| `STATS` | 현재 주문 데이터 기반 로컬 집계 | `실동작 허용` | 실주문 데이터로 계산되므로 허위 데이터는 아님 | 별도 통계 API 전까지 로컬 집계형 기능으로 유지 가능 |
| `SETTINGS` | 프론트 로컬 설정 상태 | `안내` | 저장/동기화 API 없음 | UI는 유지, 저장성 기능은 안내 또는 disabled |
| `change password` | 성공 시뮬레이션 후 로그아웃 | `비활성` | 실제 API 없음 | 버튼/모달은 유지 가능하되 제출 동작은 막아야 함 |
| `remove/hide order` | 프론트 은닉만 수행 | `비활성` | 서버 상태와 불일치 발생 | 진입 UI는 유지 가능, 실제 숨김/삭제는 차단 |
| `clear done` | 프론트에서만 완료 주문 은닉 | `비활성` | 완료 이력 정책/API 없음 | 버튼은 유지 가능, 실행은 차단 또는 안내 |
| `item 완료 토글` | 프론트 로컬 체크 | `비활성` | item-level status 모델/API 없음 | 시각 UI는 유지 가능, 상태 변경은 차단 |

정책 해설:

* `실동작 허용`
  * 현재 API/실데이터 기반으로 사실상 거짓 동작이 아닌 기능만 허용한다.
  * 현재 기준에서는 `STATS`만 여기에 해당한다.
* `안내`
  * UI는 유지하되, 동작 시 "백엔드 연동 전" 안내가 우선된다.
  * 데이터가 실제 시스템 상태로 오인될 수 있는 경우에 적용한다.
* `비활성`
  * 현재 동작을 그대로 두면 거짓 상태 변경이 발생하므로, 실제 조작은 막는다.
  * 버튼/탭/모달의 시각 구조는 유지할 수 있으나 제출/변경은 차단한다.

이번 단계 결론:

```text
정확 이식 기준을 유지하되,
실제 상태를 오염시키는 local-only 조작은 막고,
실주문 데이터 기반으로만 의미 있는 기능(STATS)만 동작 허용 대상으로 분리한다.
```

---

## 8. styles.css 정확 이식

목표:

```text
styles.css는 v2 기준으로 복구하되 preview 관련 스타일만 제외한다.
```

체크:

* [x] `kds-store-status*` 스타일을 복구한다
* [x] `kds-context-menu*` 스타일을 복구한다
* [x] `kds-panel*`, `kds-my-tasks*`, `kds-stats*`, `kds-settings*`, `kds-staff*`를 복구한다
* [x] 현재 임의 축소 과정에서 빠진 클래스들을 복구한다
* [x] 현재 추가된 원본 비일치 스타일이 있는지 확인한다

작업 내역:

* `kds-web/src/styles.css`를 `/Users/mac/Documents/kds-web-v2/src/styles.css`와 동일한 기준 파일로 전면 교체했다.
* 이 단계에서 별도 preview 전용 CSS는 존재하지 않으므로, 스타일 파일은 축약 없이 기준 소스를 그대로 채택했다.
* 이전 축소 이식 과정에서 빠졌던 `kds-store-status*`, `kds-context-menu*`, `kds-panel*`, `kds-my-tasks*`, `kds-stats*`, `kds-settings*`, `kds-staff*`, `kds-modal-btn*`, `kds-items--2col` 등이 모두 복구됐다.
* 이전 임의 변형으로 남아 있던 topbar/store meta 계열 차이도 원본 기준으로 되돌렸다.
* 적용 후 `diff -q /Users/mac/Documents/kds-web-v2/src/styles.css /Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css` 기준으로 무차이 상태를 확인했다.
* 적용 후 `npm --workspace kds-web run typecheck`, `npm --workspace kds-web run build`를 통과했다.

---

## 9. 타입 / API / Env 경계

목표:

```text
정확 이식 후에도 preview env는 들어오지 않게 하고,
실제 API와 프론트 로컬 상태의 경계를 문서화한다.
```

체크:

* [x] `vite-env.d.ts`에 `VITE_PREVIEW_MODE`를 추가하지 않는다
* [x] `types.ts`가 v2 전체 UI 구조를 수용하는지 확인한다
* [x] `lib/api.ts`, `lib/auth.ts` 변경 필요 여부를 다시 판단한다
* [x] backend 필요 기능 목록을 별도로 유지한다
* [x] "로컬 상태 기반 기능"과 "실API 기능"을 혼동하지 않게 표시한다

작업 내역:

* `kds-web/src/vite-env.d.ts`를 현재 제품 기준 env 선언으로 정리했다.
  * `VITE_PREVIEW_MODE`는 추가하지 않았다.
  * 실제 사용 중인 `VITE_DEEPORDER_API_URL`만 명시했다.
* `kds-web/src/types.ts`를 `kds-web-v2/src/types.ts`와 대조했고 차이가 없음을 확인했다.
  * 현재 `Order`, `AuthSession`, `AuthStore`, `OrderAIAnalysis` 타입은 v2 UI 구조를 그대로 수용한다.
* `kds-web/src/lib/api.ts`를 `kds-web-v2/src/lib/api.ts`와 대조했고 차이가 없음을 확인했다.
  * 실제 API 경계는 `api/auth/*`, `api/kds/orders`, `api/orders/:id/status`로 고정되어 있다.
  * preview fallback용 API 분기는 존재하지 않는다.
* `kds-web/src/lib/auth.ts`를 `kds-web-v2/src/lib/auth.ts`와 대조했고 차이가 없음을 확인했다.
  * 세션 저장소 경계는 `localStorage` / `sessionStorage` 분기만 남아 있으며 preview 전용 저장 로직은 없다.
* 현재 `KdsPage.tsx` 기준으로 backend 필요 기능 목록을 재정리했다.
  * 실API 기반:
    * 로그인/재인증/로그아웃
    * 현재 사용자/매장 조회
    * 주문 목록 조회
    * 주문 상태 변경(`NEW` -> `COOKING` -> `DONE`)
  * 로컬 상태 기반:
    * `storeStatus`, `storeStatusPopup`, `pauseMinutes`
    * `assignedMenus` / `MY_TASKS`
    * `DEMO_STAFF` / `STAFF`
    * `settings`
    * `completedItemIds`
    * `hiddenOrderIds` 기반 remove/hide order
    * `clearDoneConfirm`
    * 비밀번호 변경 성공 시뮬레이션
* 따라서 이 단계 결론은 다음과 같이 고정한다.

```text
타입/세션/API 기본 경계는 v2 기준으로 현재 repo와 일치한다.
남은 차이는 preview 로직이 아니라, KdsPage 내부의 local-only 기능들을
"실API 기능"과 혼동되지 않게 다음 단계에서 정책적으로 제어하는 일이다.
```

---

## 10. 검증

정적 검증:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
npm --workspace kds-web run build
```

시각 검증:

* [x] 현재 화면이 `/Users/mac/Documents/kds-web-v2`와 구조적으로 동일한지 비교한다
* [x] 좌측 사이드바 아이콘 구성과 상단 탭 구성이 동일한지 비교한다
* [x] 카드 헤더/버튼/배지 배치가 동일한지 비교한다
* [x] `영업중` 배지와 `내 업무` 탭이 복구되었는지 비교한다

런타임 검증:

* [x] 로그인 -> pending -> 승인 -> KDS 진입 흐름 확인
* [x] 주문 수신 / 상태 변경 흐름 확인
* [x] preview fallback이 없는지 확인
* [x] read-only / disabled / 안내 정책이 의도대로 동작하는지 확인

작업 내역:

* 검증 환경:
  * backend: `http://127.0.0.1:8000`
  * kds-web: `http://127.0.0.1:5173`
* Playwright CLI로 실제 브라우저 검증을 수행했다.
* 승인 대기 흐름 검증:
  * 신규 계정 `kdsv2xw0d46@example.com` / 매장 `STORE_002`를 생성했다.
  * 첫 로그인 시 pending 뷰가 나타나며 `매장명`, `이름`이 정상 반영되는 것을 확인했다.
  * 관리자 승인 후 재로그인으로 KDS 진입을 확인했다.
* KDS 진입 후 빈 보드 검증:
  * 승인 후 첫 진입 시 `접수 0`, `완료 0` 상태로 비어 있는 보드가 보였다.
  * 즉 preview fallback 주문 데이터는 주입되지 않았다.
* 주문 수신 / 상태 변경 검증:
  * `STORE_002` 대상으로 webhook 주문 `KV2001`을 주입했다.
  * KDS에서 `접수 1` 카드 노출을 확인했다.
  * `조리 시작` 클릭 후 카드 액션이 `완료`로 전환되는 것을 확인했다.
  * `완료` 클릭 후 `접수 0 / 완료 1`로 탭 카운트가 바뀌는 것을 확인했다.
  * `완료` 탭 진입 시 동일 주문 카드가 완료 보드에 노출되는 것을 확인했다.
* 시각 구조 검증:
  * 좌측 사이드바 `업무 / 직원 / 통계 / 설정`
  * 상단 `영업중` 배지
  * 상단 `접수 / 완료 / 내 업무` 탭
  * 카드 헤더의 주문번호 / 경과시간 / `배달` 배지
  * 메뉴 아이템 버튼형 배치
  * 위 항목들이 현재 화면에 복구된 것을 확인했다.
* 콘솔 오류 확인:
  * 기능 오류가 아닌 `favicon.ico 404` 1건만 확인됐다.
* 후속 수정 후 재검증:
  * 초기 로그인 진입 시 pending 뷰가 더 이상 `- / -` 값으로 선노출되지 않는 것을 확인했다.
  * pending 상태에서 `이전으로` 버튼 클릭이 정상 동작하고 로그인 폼으로 복귀하는 것을 확인했다.
  * `내 업무` 탭 진입 시 패널 오버레이와 안내 토스트가 노출되고, local-only 조작이 정책적으로 막히는 것을 확인했다.
  * `설정` 진입 시 설정 UI는 유지되지만 저장 기능 미연동 오버레이와 안내 토스트가 노출되는 것을 확인했다.
  * `매장 상태 변경` 클릭 시 popup 대신 안내 토스트만 노출되고 실제 상태 변경이 발생하지 않는 것을 확인했다.

최종 검증 결론:

```text
Phase 10 기준 미완료였던 두 항목
- pending 뷰 초기 노출 / 이전으로 버튼 버그
- local-only 기능 정책 미반영
은 모두 수정 및 재검증 완료했다.
```

---

## 11. 완료 기준

* [x] `PREVIEW_MODE`만 제거되고 나머지 UI/UX는 v2 기준으로 복구된다
* [x] 현재 제품 repo에 임의 창조된 UI가 제거된다
* [x] `kds-web-v2`와 시각 구조가 다시 일치한다
* [x] backend 미구현 기능은 삭제가 아니라 정책적으로 제어된다
* [x] `npm --workspace kds-web run typecheck` 통과
* [x] `npm --workspace kds-web run build` 통과

---

## 12. 한 줄 작업 원칙

```text
이번 작업은 "안전한 축소"가 아니라 "정확 이식"이다.
PREVIEW_MODE만 제거하고, kds-web-v2의 UI/UX를 원본 최대 보존으로 반입한다.
```
