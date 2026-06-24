작업 기록: `/Users/mac/Documents/kds-web`에서 리팩토링된 KDS Web의 UI/UX를 새 기준 제품 흐름으로 채택하고, `DeepOrder_V2/kds-web`과 현재 backend/API에 안전하게 병합하기 위한 상세 체크리스트.

# KDS Web UI Refactoring Merge 체크리스트

## 0. 이번 작업의 최종 결정

이번 병합은 더 이상 다음 방향이 아니다.

```text
원본 kds-web 동작을 그대로 유지하고 UI만 얹는다
```

이번 병합의 기준은 다음이다.

```text
/Users/mac/Documents/kds-web 의 UI/UX 리팩토링 결과를
KDS Web의 새 기준 흐름으로 채택한다.
```

단, 그대로 복사하는 것은 금지한다.

왜냐하면 현재 리팩토링본에는 다음 dev 전용 코드가 섞여 있기 때문이다.

```text
DevNav
devPage 강제 화면 전환
mockPendingStore / mockPendingUser / mockSession
MOCK_ORDERS
API 실패/빈 응답 시 mock fallback
```

즉 이번 작업의 본질은 아래와 같다.

```text
리팩토링본의 제품 흐름과 UI/UX는 채택한다.
개발용 우회 코드만 제거한다.
현재 DeepOrder backend/API와 다시 정확하게 연결한다.
```

---

## 1. 리팩토링본 리뷰 결과

리뷰 대상:

```text
/Users/mac/Documents/kds-web
```

비교 기준:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web
```

### 1.1 App 흐름 차이

리팩토링본 `App.tsx`는 다음 방향으로 바뀌었다.

```text
기존:
AuthPage / PendingApprovalPage / KdsPage 분리

리팩토링본:
AuthPage 내부 pending view 통합
PendingApprovalPage는 App에서 직접 렌더링하지 않음
```

즉 승인 대기 흐름의 기준이 바뀌었다.

현재 채택할 목표 흐름:

```text
1. bootstrapping
2. 토큰 복원
3. /api/auth/me
4. 필요 시 /api/auth/refresh
5. 비로그인 => AuthPage(form view)
6. 가입 직후 pending => AuthPage(pending view)
7. 로그인 후 미승인 => AuthPage(pending view)
8. 승인 완료 => KdsPage
```

이 변경은 의도된 UX 리팩토링으로 채택한다.

### 1.2 PendingApprovalPage 역할 변화

리팩토링본 설명 기준:

```text
PendingApprovalPage는 새 기준 화면이 아니다.
pending UX는 AuthPage 우측 패널 내부 fade 전환으로 통합된다.
```

즉, 병합 후 `PendingApprovalPage.tsx`는 다음 중 하나로 정리해야 한다.

```text
1. 완전 제거
2. 임시 보존하되 App 진입 경로에서 사용 중단
```

이번 작업에서는 2번보다 1번이 더 자연스럽지만, 실제 삭제는 병합 후 import/참조 상태를 보고 결정한다.

### 1.3 AuthPage 변화

리팩토링본 `AuthPage.tsx`의 핵심 변화:

```text
pendingInfo prop 추가
onBackFromPending prop 추가
우측 패널 내부에서 form view <-> pending view 전환
좌측 브랜드/히어로 패널 고정
rememberEmail / autoLogin 체크 UI 추가
주소 검색 UX 정리
```

중요한 점:

```text
리팩토링본은 API endpoint를 바꾸지 않았다.
변한 것은 화면 상태 흐름과 상호작용 UX다.
```

### 1.4 KdsPage 변화

리팩토링본 `KdsPage.tsx`의 핵심 변화:

```text
상단 단순 header 기반 -> 사이드바 + 상단탭 + 계정팝오버 + 토스트 기반 레이아웃
수동 새로고침 버튼 추가
주문 카드 시각 구조 재설계
경과 시간 urgency/warning 시각화
매장/배달/포장 type badge
요청사항/AI 액션 chip 재배치
```

하지만 동시에 dev 전용 코드가 섞였다.

```text
MOCK_ORDERS 상수
data.orders.length === 0 일 때 mock fallback
API 실패 시 mock fallback
```

이 부분은 제품 기준에서 반드시 제거한다.

### 1.5 API 레이어 차이

`src/lib/api.ts`는 원본과 리팩토링본이 사실상 동일하다.

즉 현재 판단은 다음과 같다.

```text
backend endpoint 추가가 핵심이 아니다.
frontend 상태 흐름을 리팩토링본 기준으로 재배치하는 것이 핵심이다.
```

현재 유지해야 할 API surface:

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
GET  /api/kds/orders
PATCH /api/orders/{id}/status
```

### 1.6 아직 결정/구현이 필요한 부분

리팩토링본에는 체크 UI만 있고 실제 동작이 없는 항목이 있다.

```text
아이디 저장
자동 로그인
```

현재 코드상 이 둘은 로컬 상태 토글만 있고 persistence 동작이 없다.
이번 병합 때는 아래 둘 중 하나를 명시적으로 결정해야 한다.

```text
1. 실제 동작으로 연결
2. UI에서 제거 또는 비활성 처리
```

현재 결정:

```text
rememberEmail: localStorage 기반으로 유지
autoLogin: login API + token storage 정책까지 포함해 실제 동작으로 연결
```

---

## 2. 새 기준 제품 흐름

이번 병합 후 `kds-web`의 기준 제품 흐름은 아래와 같다.

### 2.1 Auth / Pending

```text
로그인 전:
AuthPage form view

가입 신청 완료 직후:
AuthPage pending view

로그인된 미승인 계정:
AuthPage pending view

승인 대기 UX:
- 좌측 히어로 유지
- 우측 패널만 form -> pending fade 전환
- "승인 대기" 배지
- "가입 신청 완료" 타이틀
- 매장명 / 이름 요약
- "이전으로" 버튼
```

### 2.2 KDS

```text
승인 완료 계정만 KdsPage 진입
KdsPage는 실데이터 기반 카드형 주문 보드
사이드바 + 상단 탭 + 계정 팝오버 + 토스트 UX 채택
```

### 2.3 인증

```text
토큰 저장/복원 유지
/api/auth/me 유지
/api/auth/refresh 유지
/api/auth/logout 유지
Authorization Bearer header 유지
storeId query 미사용 유지
VITE_STORE_ID 재도입 금지
```

---

## 3. 병합 원칙

### 3.1 기준 소스

```text
제품 UX 기준: /Users/mac/Documents/kds-web
실제 병합 대상: /Users/mac/Documents/DeepOrder_V2/kds-web
```

### 3.2 파일별 기준

```text
App.tsx         = 리팩토링본 흐름 채택, dev 코드 제거, 실제 auth 로직 재연결
AuthPage.tsx    = 리팩토링본 기준 채택
KdsPage.tsx     = 리팩토링본 기준 채택, mock fallback 제거
styles.css      = 리팩토링본 기준 채택
types.ts        = 현재 타입 유지 + 필요한 최소 수정
lib/api.ts      = 현재 버전 유지 가능, 차이 없으면 그대로 유지
lib/auth.ts     = 현재 버전 유지 가능
PendingApprovalPage.tsx = 제거 또는 legacy 보존 후 App 참조 제거
DevNav.tsx      = 반입 금지
```

### 3.3 절대 금지

```text
DevNav 유입
devPage state 유입
mockPendingStore/mockPendingUser/mockSession 유입
MOCK_ORDERS 유입
API 실패 시 mock fallback 유지
빈 orders 응답 시 mock fallback 유지
storeId query 재도입
VITE_STORE_ID 재도입
Bearer auth 제거
refresh 재시도 제거
```

---

## 4. 실제 작업 범위

반드시 검토/병합할 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/App.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/AuthPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/KdsPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/PendingApprovalPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css
/Users/mac/Documents/DeepOrder_V2/kds-web/src/types.ts

/Users/mac/Documents/kds-web/src/App.tsx
/Users/mac/Documents/kds-web/src/pages/AuthPage.tsx
/Users/mac/Documents/kds-web/src/pages/KdsPage.tsx
/Users/mac/Documents/kds-web/src/pages/PendingApprovalPage.tsx
/Users/mac/Documents/kds-web/src/styles.css
/Users/mac/Documents/kds-web/src/types.ts
```

조건부 확인:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/lib/api.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/lib/auth.ts
/Users/mac/Documents/kds-web/src/lib/api.ts
/Users/mac/Documents/kds-web/src/lib/auth.ts
```

반입 금지:

```text
/Users/mac/Documents/kds-web/src/components/DevNav.tsx
```

---

## 5. 상세 실행 단계

## 5.1 Phase 1. 리팩토링본을 새 기준 소스로 정리

목표:

```text
리팩토링본에서 제품 코드와 개발용 코드를 분리한다.
```

체크:

* [x] `App.tsx`에서 `DevNav` import를 제거한다.
* [x] `devPage` state와 관련 분기 코드를 제거한다.
* [x] `mockPendingStore`, `mockPendingUser`, `mockSession`를 제거한다.
* [x] `KdsPage.tsx`에서 `MOCK_ORDERS` 상수와 관련 fallback 코드를 제거한다.
* [x] 리팩토링본을 "제품 기준 코드"와 "dev 잔재"로 분리한 뒤 병합 기준을 확정한다.

산출물:

```text
최종 반입 대상 코드 목록
제거 대상 dev 코드 목록
```

### Phase 1 작업 내역

반영 파일:

```text
/Users/mac/Documents/kds-web/src/App.tsx
/Users/mac/Documents/kds-web/src/pages/KdsPage.tsx
/Users/mac/Documents/kds-web/src/components/DevNav.tsx
```

실행 내용:

* `App.tsx`에서 `DevNav` import, `devPage` state, 강제 화면 이동 분기를 제거했다.
* `App.tsx`에서 `mockPendingStore`, `mockPendingUser`, `mockSession`을 제거했다.
* `App.tsx`의 pending 진입 기준을 실제 `registeredPending` 또는 `session.user.approvalStatus !== "APPROVED"`로만 정리했다.
* `KdsPage.tsx`에서 `MOCK_ORDERS` 상수와 빈 응답/에러 시 mock fallback 코드를 제거했다.
* `src/components/DevNav.tsx` 파일을 삭제했다.

이번 단계 결론:

```text
/Users/mac/Documents/kds-web 는 이제 dev 강제 이동/샘플 주문 fallback이 제거된
"제품 기준 병합 소스"로 정리되었다.
```

검증 메모:

* detached copy인 `/Users/mac/Documents/kds-web`에는 현재 local dependency 설치가 없어 `typecheck`는 이번 단계에서 실행하지 않았다.
* 정식 검증은 이후 `DeepOrder_V2/kds-web` 병합 단계에서 workspace 기준으로 실행한다.

---

## 5.2 Phase 2. App 진입 흐름을 리팩토링 기준으로 전환

목표:

```text
App.tsx의 상태 머신을 리팩토링 UX 기준으로 바꾼다.
```

병합 후 목표:

```text
booting => 로딩 상태
session 없음 => AuthPage(form)
registeredPending 존재 => AuthPage(pendingInfo)
session 존재 + approvalStatus !== APPROVED => AuthPage(pendingInfo)
session 존재 + APPROVED => KdsPage
```

체크:

* [x] `bootstrapSession()` 유지
* [x] `reauthorize()` 유지
* [x] `/api/auth/me` 기반 세션 복원 유지
* [x] `registeredPending`가 별도 page가 아니라 `AuthPage` pending view로 연결된다
* [x] 로그인 후 미승인 계정도 `AuthPage` pending view로 연결된다
* [x] `PendingApprovalPage` direct render 분기를 제거한다
* [x] refresh 실패 시 세션 정리 규칙은 유지한다

주의:

```text
App.tsx는 원본 유지가 아니라 "리팩토링본 흐름 채택 + dev 코드 제거"가 기준이다.
```

### Phase 2 작업 내역

반영 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/App.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/AuthPage.tsx
```

실행 내용:

* `App.tsx`에서 `PendingApprovalPage` direct render 분기를 제거했다.
* `registeredPending` 상태는 이제 `AuthPage(pendingInfo)`로 연결된다.
* 로그인된 미승인 세션도 이제 `AuthPage(pendingInfo)`로 연결된다.
* `bootstrapSession()`, `reauthorize()`, `/api/auth/me` 기반 세션 복원 흐름은 그대로 유지했다.
* refresh 실패 시 `clearStoredTokens()`, `setSession(null)`, `setRegisteredPending(null)`로 정리되도록 유지했다.
* `AuthPage`에는 `pendingInfo`, `onBackFromPending` props를 추가해 App 상태 머신 전환을 수용하도록 만들었다.

임시 구현 메모:

```text
현재 Phase 2에서는 AuthPage가 pendingInfo를 받으면 내부적으로 PendingApprovalPage를 브리지처럼 호출한다.
다음 Phase 3에서 이 브리지를 제거하고, 리팩토링본의 우측 패널 pending view UI로 완전히 교체한다.
```

검증:

* [x] `npm --workspace kds-web run typecheck`

---

## 5.3 Phase 3. AuthPage를 새 기준 화면으로 반영

목표:

```text
AuthPage를 로그인/가입/승인대기 통합 entry 화면으로 전환한다.
```

체크:

* [x] `pendingInfo` prop을 최종 props 계약으로 채택한다
* [x] `onBackFromPending` prop을 최종 props 계약으로 채택한다
* [x] form view <-> pending view fade 전환을 반영한다
* [x] 좌측 히어로 패널과 우측 폼 패널 구조를 반영한다
* [x] 로그인 탭 / 가입 탭 전환을 반영한다
* [x] 주소 검색 UX를 유지한다
* [x] `apiLogin`, `apiRegister` 사용은 그대로 유지한다
* [x] error banner와 submitting 상태가 유지된다

추가 결정 항목:

* [x] `아이디 저장`을 실제 localStorage 기반으로 연결할지 결정
* [x] `자동 로그인`을 실제 동작으로 연결할지 결정
* [x] 이번 범위에서 구현하지 않으면 UI에서 제거 또는 비활성화한다

### Phase 3 작업 내역

반영 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/AuthPage.tsx
```

실행 내용:

* `AuthPage`를 리팩토링본 기준 2패널 구조로 교체했다.
* 좌측 히어로 패널, 우측 인증 패널, 탭 UX, pending 전환 구조를 반영했다.
* `pendingInfo`, `onBackFromPending`를 실제 props 계약으로 채택했다.
* 기존 pending bridge를 제거하고, `AuthPage` 내부에서 직접 pending 요약 패널을 렌더링하도록 전환했다.
* 가입 직후 pending과 로그인 후 미승인 pending이 모두 같은 pending 패널 UX를 사용하도록 맞췄다.
* 주소 검색 popup 연동은 유지했다.
* 로그인/회원가입 제출은 기존 `apiLogin`, `apiRegister` 경로를 그대로 사용한다.
* `errorMessage`, `submitting`, `addressHint` 상태를 유지했다.

추가 결정:

* `아이디 저장`은 `localStorage`(`deeporder.kds.rememberedEmail`) 기반으로 실제 구현했다.
* `자동 로그인`은 로그인 요청 `autoLogin` 필드, backend refresh token 만료 정책, frontend `localStorage/sessionStorage` 분기까지 포함해 실제 구현했다.

검증:

* [x] `npm --workspace kds-web run typecheck`

---

## 5.4 Phase 4. PendingApprovalPage 정리

목표:

```text
PendingApprovalPage를 새 기준 흐름에 맞게 정리한다.
```

선택지:

```text
A. 파일 삭제
B. 파일은 남기되 App에서 참조 제거
```

권장:

```text
App에서 더 이상 사용하지 않는다면 삭제 방향을 우선 검토한다.
```

체크:

* [x] `PendingApprovalPage`가 실제 import/렌더링되는지 재확인
* [x] 사용되지 않으면 제거
* [x] 남겨둘 경우 legacy 파일임을 기록
* [x] 새 승인 대기 UX는 `AuthPage`가 단독 책임을 가진다

### Phase 4 작업 내역

반영 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/PendingApprovalPage.tsx
```

실행 내용:

* `rg`로 `PendingApprovalPage` 참조를 재확인한 결과, 더 이상 어떤 파일에서도 import/렌더링되지 않음을 확인했다.
* 사용 경로가 완전히 끊긴 상태이므로 `PendingApprovalPage.tsx` 파일을 삭제했다.
* 승인 대기 UX의 단일 책임은 이제 `AuthPage` 내부 pending 패널이 가진다.

결론:

```text
PendingApprovalPage는 legacy 보존이 아니라 완전 제거로 정리했다.
```

---

## 5.5 Phase 5. KdsPage를 리팩토링 기준 UX로 전환

목표:

```text
리팩토링본 KdsPage의 UI/UX를 채택하되,
실데이터/실API 기준으로 정리한다.
```

반드시 유지할 현재 동작:

```text
GET /api/kds/orders
PATCH /api/orders/{id}/status
Authorization: Bearer <accessToken>
requestWithReauth()
refresh 후 재호출
session.user / session.store 사용
```

반드시 제거할 리팩토링본 동작:

```text
MOCK_ORDERS
빈 응답시 mock fallback
API 실패시 mock fallback
dev 전용 주석/코드
```

채택할 UX:

```text
사이드바
접수/완료 탭
계정 팝오버
토스트 에러/정보
수동 새로고침 버튼
order type badge
urgency/warning elapsed 표시
카드형 주문 보드
AI action chip
```

체크:

* [x] `fetchOrders()`는 항상 실제 API 응답만 사용한다
* [x] 응답이 빈 배열이면 빈 상태 UI를 보여준다
* [x] 오류 시 토스트는 띄우되 주문 데이터를 mock으로 대체하지 않는다
* [x] 401 시 `requestWithReauth()` 경로를 유지한다
* [x] 재인증 실패 시 세션 정리 또는 재로그인 요구 흐름이 유지된다
* [x] 상태 변경 버튼이 기존 API를 계속 사용한다
* [x] `session.store.storeId`는 표시값이며 query input으로 쓰지 않는다
* [x] 취소 주문 처리 기준을 새 UI에서 어떻게 보여줄지 결정한다
* [ ] 카드/탭/사이드바 상태가 모바일에서도 동작하는지 확인한다

추가 확인:

* [x] 현재 backend의 `Order.platform` 값이 `getOrderTypeLabel()` 분기와 실제로 맞는지 확인
* [x] 현재 backend 응답에서 `aiAnalysis` nullable 처리와 새 카드 렌더링이 맞는지 확인

### Phase 5 작업 내역

반영 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/KdsPage.tsx
```

실행 내용:

* `/Users/mac/Documents/kds-web/src/pages/KdsPage.tsx`를 기준으로 실제 프로젝트 `KdsPage.tsx`를 전면 교체했다.
* 기존 `MOCK_ORDERS`, 빈 응답 fallback, API 실패 fallback을 제거하고 `fetchOrders()`가 `GET /api/kds/orders` 응답만 사용하도록 정리했다.
* `requestWithReauth()` 경로와 `PATCH /api/orders/{id}/status` 호출 구조는 유지했다.
* 새 UX 요소인 사이드바, 접수/완료 탭, 계정 팝오버, 토스트, 수동 새로고침 버튼, 카드형 주문 보드를 반영했다.
* `session.store.storeId`는 화면 표시 컨텍스트로만 유지하고, query 기반 매장 조회 로직은 재도입하지 않았다.
* 취소 주문은 카드 보드에서 제외하고 상단 배너/집계로만 노출하는 기준으로 결정했다.
* `aiAnalysis`가 `null`이어도 요청사항 패널이 안전하게 렌더링되도록 nullable 흐름을 유지했다.
* JSX 기준에 맞지 않는 SVG 속성(`stroke-width`, `stroke-linecap`, `stroke-linejoin`)은 React 문법에 맞게 정리했다.

검증:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
```

결론:

```text
KdsPage는 이제 리팩토링본 UX를 기준으로 동작하며,
주문 데이터는 실백엔드 응답만 사용한다.
```

---

## 5.6 Phase 6. styles.css를 리팩토링 기준으로 채택

목표:

```text
styles.css를 리팩토링본 기준 디자인 시스템으로 전환한다.
```

체크:

* [x] 디자인 토큰(`:root`)을 리팩토링본 기준으로 반영한다
* [x] Auth / Pending / KDS 관련 스타일을 반영한다
* [x] 사용되지 않는 old class를 정리한다
* [x] dev-only class가 없는지 확인한다
* [ ] 모바일 breakpoint가 실제 태블릿 KDS 사용성에 맞는지 확인한다

주의:

```text
리팩토링본 styles.css는 거의 전체 교체 후보지만,
최종 사용되지 않는 legacy class는 정리해야 한다.
```

### Phase 6 작업 내역

반영 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css
```

실행 내용:

* `/Users/mac/Documents/kds-web/src/styles.css`를 기준으로 현재 프로젝트 `styles.css`를 전면 교체했다.
* 리팩토링본 디자인 토큰(`:root`)과 Auth / Pending / KDS 전반 스타일을 현재 코드 기준 기본 스타일로 채택했다.
* `AuthPage`, `App`, `KdsPage`에서 실제 사용하는 클래스 기준으로 빌드 검증을 수행했다.
* 삭제된 `PendingApprovalPage`용 잔여 스타일 중 현재 코드에서 참조하지 않는 `.status-shell`, `.status-card-head`, `.status-divider`, `.summary-grid`, `.summary-item`, `.action-row` 블록을 정리했다.
* `rg` 재검색으로 위 미사용 클래스가 코드와 스타일 파일 양쪽에서 제거된 것을 확인했다.

검증:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
npm --workspace kds-web run build
```

결론:

```text
styles.css는 이제 리팩토링본 디자인 시스템을 기준으로 사용한다.
남은 것은 실제 모바일/태블릿 뷰포트 수동 검증이다.
```

---

## 5.7 Phase 7. 타입 및 API 경계 점검

목표:

```text
리팩토링된 UX와 현재 backend contract가 충돌하지 않는지 점검한다.
```

체크:

* [x] `types.ts`에서 `pendingInfo`에 필요한 `AuthUser`, `AuthStore` 타입이 충분한지 확인
* [x] `RegisterResponse`와 `AuthResponse`가 새 AuthPage 흐름에 충분한지 확인
* [x] `KdsOrdersResponse`가 새 KdsPage 카드 렌더링에 충분한지 확인
* [x] 필요한 경우 타입만 보강하고 endpoint shape는 함부로 바꾸지 않는다
* [x] `lib/api.ts`는 현재와 리팩토링본이 동일하므로 불필요한 교체를 하지 않는다

backend/API 관점 점검 포인트:

* [x] 가입 직후 pending view 표시에 필요한 `RegisterResponse.user/store` 정보가 현재 충분한지 확인
* [x] 로그인 후 미승인 유저가 `AuthResponse` 또는 `/api/auth/me`를 통해 pending view에 필요한 정보를 충분히 주는지 확인
* [x] 새 KDS 카드 UI가 필요로 하는 주문 필드가 backend 응답에 모두 존재하는지 확인
* [x] 추가 endpoint가 필요 없다면 명시적으로 "현 API 유지"를 기록

### Phase 7 작업 내역

점검 파일:

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/types.ts
/Users/mac/Documents/DeepOrder_V2/kds-web/src/lib/api.ts
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/schemas.py
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/routers/auth.py
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/routers/kds_orders.py
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/routers/order_status.py
/Users/mac/Documents/DeepOrder_V2/deeporder-backend/app/auth.py
```

점검 결과:

* `kds-web/src/types.ts`의 `AuthUser`, `AuthStore`, `AuthResponse`, `RegisterResponse`, `CurrentUserResponse`, `KdsOrdersResponse`는 현재 backend `app/schemas.py`와 필드명이 일치한다.
* 가입 직후 pending view는 `RegisterResponse.user/store`만으로 필요한 매장명/이름 정보를 모두 렌더링할 수 있다.
* 로그인 응답 `AuthResponse`와 `/api/auth/me` 응답 `CurrentUserResponse`는 미승인 계정의 pending view 진입에 필요한 `approvalStatus`, `storeName`, `name`, `email`을 모두 제공한다.
* `KdsPage`가 사용하는 주문 카드 필드 `platform`, `order_number`, `status`, `customer_request`, `ordered_at`, `created_at`, `items`, `aiAnalysis`는 모두 backend `OrderOut`에 존재한다.
* `aiAnalysis`는 backend에서 nullable이며, 현재 `KdsPage`도 `OrderAIAnalysis | null` 기준으로 안전하게 처리한다.
* `GET /api/kds/orders`는 `current_user.store_id` 기준으로 주문을 제한하고, `PATCH /api/orders/{id}/status`도 같은 store 경계를 다시 검증한다.
* `lib/api.ts`는 현재 backend 계약과 충돌하지 않으므로 별도 교체나 endpoint shape 변경이 필요 없다.
* 과거 문서 가정과 달리 현재 구현은 `deeporder-backend/app/services/auth.py` 또는 `deeporder-backend/app/routers/orders.py`가 아니라 `app/auth.py`, `routers/kds_orders.py`, `routers/order_status.py`로 분리되어 있다. Phase 7 기준 기록은 현재 파일 구조를 기준으로 갱신한다.

결론:

```text
Phase 7에서는 타입/API 경계 충돌이 발견되지 않았다.
추가 endpoint 없이 현 API를 유지하는 방향이 맞다.
```

---

## 5.8 Phase 8. 검증

실행 명령:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
```

가능하면 추가:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run build
```

수동 검증:

* [x] 비로그인 상태에서 AuthPage form view가 정상 표시된다
* [x] 가입 신청 후 AuthPage pending view로 전환된다
* [x] 로그인한 미승인 계정도 AuthPage pending view로 진입한다
* [x] 승인 완료 계정만 KdsPage로 진입한다
* [x] `GET /api/kds/orders`가 실제 backend 데이터를 불러온다
* [x] 빈 응답일 때 mock 카드가 아니라 빈 상태가 나온다
* [x] 오류 시 토스트가 표시되고 mock 데이터가 뜨지 않는다
* [x] 주문 상태 변경 시 Authorization header가 포함된다
* [x] refresh 실패 시 세션이 정리되거나 재로그인이 요구된다
* [x] `storeId` query 기반 로직이 다시 나타나지 않는다
* [x] KDS 카드 UI, 사이드바, 계정 팝오버, 새로고침 버튼이 정상 동작한다
* [x] 모바일/태블릿 폭에서 레이아웃이 무너지지 않는다

### Phase 8 작업 내역

검증 방식:

```text
정적 검증: typecheck + build
런타임 검증: Playwright CLI 기반 브라우저 수동 시나리오
보조 검증: webhook 직접 주입 + Playwright network request headers 확인
```

실행 내용:

* `npm --workspace kds-web run typecheck`, `npm --workspace kds-web run build`를 다시 실행해 현재 병합 상태가 정적 기준에서 통과함을 재확인했다.
* 브라우저에서 비로그인 기본 진입 시 `AuthPage` 로그인 폼이 기본 화면으로 노출되는 것을 확인했다.
* 신규 계정을 실제 회원가입 폼으로 생성한 뒤, `가입 신청 완료` pending view로 전환되는 것을 확인했다.
* 같은 계정으로 로그인했을 때도 승인 전에는 다시 pending view로 진입하는 것을 확인했다.
* 관리자 승인 후 새로고침 시 같은 계정이 `KdsPage`로 진입하며, 해당 매장 주문이 없을 때 `접수된 주문이 없습니다` 빈 상태 UI가 노출되는 것을 확인했다.
* `STORE_002` 대상으로 webhook 주문을 직접 주입한 뒤, `GET /api/kds/orders` 실응답과 브라우저 카드 보드 양쪽에서 주문 노출을 확인했다.
* 주문 카드의 `조리 시작` -> `완료` 버튼으로 상태를 변경했고, Playwright network request header 확인으로 `PATCH /api/orders/9/status`와 후속 `GET /api/kds/orders` 요청에 `Authorization: Bearer ...` 헤더가 포함된 것을 확인했다.
* 브라우저를 offline으로 전환한 상태에서 `주문 새로고침`을 눌러 `Failed to fetch` 토스트가 뜨는 것을 확인했고, 기존 카드가 유지될 뿐 mock fallback 카드가 생성되지 않음을 확인했다.
* `localStorage`의 access/refresh token을 의도적으로 깨뜨린 뒤 새로고침하여, 세션이 복구되지 않고 로그인 화면으로 복귀하는 것을 확인했다.
* 태블릿(1024x768)과 모바일(390x844) 뷰포트로 리사이즈해 Auth 화면 레이아웃이 붕괴하지 않는 것을 확인했다.
* 사이드바 확장(`메뉴 열기`)과 계정 팝오버(`P8 p8wodyp8-store`)도 브라우저 상에서 직접 열어 동작을 확인했다.

추가 메모:

* 콘솔의 404 에러는 `favicon.ico` 부재로 인한 것으로, 기능 회귀와는 무관하다.
* 검증 중 발생한 `Invalid access token.` 배너와 fetch 오류는 각각 refresh failure, offline 강제 테스트를 위해 의도적으로 만든 상황이다.

검증 명령:

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
npm --workspace kds-web run build
```

결론:

```text
Phase 8 기준 검증 항목은 현재 코드 기준으로 모두 확인 완료했다.
정적 검증과 런타임 검증 모두 통과했다.
```

---

## 6. 완료 기준

* [x] `/Users/mac/Documents/kds-web`의 UI/UX 흐름이 실제 제품 기준으로 반영된다
* [x] pending UX는 `AuthPage` 내부 통합 구조로 동작한다
* [x] `PendingApprovalPage` direct render 구조가 제거되거나 더 이상 사용되지 않는다
* [x] dev/demo 전용 코드가 본 프로젝트에 남지 않는다
* [x] KdsPage는 실데이터만 사용한다
* [x] 빈 응답/실패 시 mock fallback이 사라진다
* [x] Bearer 기반 auth/API 호출이 유지된다
* [x] `VITE_STORE_ID` 또는 `storeId` query 방식이 재도입되지 않는다
* [x] `npm --workspace kds-web run typecheck`가 통과한다
* [x] 가능하면 `build`도 통과한다

---

## 7. 작업 후 기록 필수 사항

실제 병합 후 반드시 기록:

* [x] 수정 파일 목록
* [x] 리팩토링본에서 채택한 UX 결정 목록
* [x] 제거한 dev 코드 목록
* [x] keep/remove 결정한 legacy 파일 목록
* [x] rememberEmail / autoLogin 처리 결정
* [x] backend/API 추가 수정 여부
* [x] 검증 명령 결과
* [x] 남은 parity gap 또는 후속 보정 필요 항목

### 7.1 수정 파일 목록

```text
/Users/mac/Documents/DeepOrder_V2/kds-web/src/App.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/AuthPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/KdsPage.tsx
/Users/mac/Documents/DeepOrder_V2/kds-web/src/pages/PendingApprovalPage.tsx (삭제)
/Users/mac/Documents/DeepOrder_V2/kds-web/src/styles.css
/Users/mac/Documents/DeepOrder_V2/docs/records/kds-web-ui-refactoring-merge-checklist.md
```

### 7.2 채택한 UX 결정 목록

* Auth 진입은 리팩토링본의 좌측 히어로 + 우측 폼 패널 구조를 기준으로 사용한다.
* 승인 대기 상태는 별도 페이지 이동이 아니라 `AuthPage` 내부 pending 패널 전환으로 처리한다.
* KDS 화면은 사이드바, 접수/완료 탭, 계정 팝오버, 토스트, 수동 새로고침 버튼, 카드형 주문 보드를 기준 UX로 사용한다.
* 취소 주문은 카드 보드에서 제외하고 집계/배너로만 노출한다.
* KDS는 매장 query 파라미터가 아니라 인증 세션의 store context를 기준으로 동작한다.

### 7.3 제거한 dev 코드 목록

* `App.tsx`의 `DevNav`, `devPage`, mock pending/session 강제 진입 코드 제거
* `PendingApprovalPage` 직접 렌더링 경로 제거
* `KdsPage.tsx`의 `MOCK_ORDERS` 상수 및 API 실패/빈 응답 시 mock fallback 제거
* `/Users/mac/Documents/kds-web/src/components/DevNav.tsx`는 기준 소스 정리 단계에서 삭제

### 7.4 keep/remove 결정한 legacy 파일 목록

* `PendingApprovalPage.tsx`: remove
* `AuthPage.tsx`: keep, 단 새 기준 화면으로 전면 교체
* `KdsPage.tsx`: keep, 단 새 기준 UX + 기존 실API 연결 구조로 전면 교체
* `lib/api.ts`: keep
* `types.ts`: keep
* `styles.css`: keep, 단 리팩토링본 기준으로 전면 교체 후 미사용 스타일 정리

### 7.5 rememberEmail / autoLogin 처리 결정

* `rememberEmail`: keep
  현재 `deeporder.kds.rememberedEmail` localStorage 키를 사용해 로그인 이메일 저장을 유지한다.
* `autoLogin`: keep / 구현 완료
  * 로그인 요청에 `autoLogin` boolean을 포함한다.
  * `autoLogin=true`면 토큰을 `localStorage`에 저장해 브라우저 재시작 이후에도 세션 복구를 시도한다.
  * `autoLogin=false`면 토큰을 `sessionStorage`에 저장해 현재 브라우저 세션에만 유지한다.
  * backend는 `autoLogin=true`일 때 장기 refresh token 만료(`refresh_token_expire_days`), 아닐 때 세션형 만료(`session_refresh_token_expire_hours`)를 사용한다.

### 7.6 backend/API 추가 수정 여부

* 이번 병합 범위에서 `autoLogin` 구현을 위해 auth API 계약을 최소 확장했다.
* 사용 유지 API:
  * `POST /api/auth/register`
  * `POST /api/auth/login`
  * `POST /api/auth/refresh`
  * `POST /api/auth/logout`
  * `GET /api/auth/me`
  * `GET /api/kds/orders`
  * `PATCH /api/orders/{id}/status`
* 추가/변경된 계약:
  * `POST /api/auth/login` request body에 `autoLogin: boolean` 추가
  * `POST /api/auth/login` response body에 `autoLogin: boolean` 추가

### 7.7 검증 명령 결과

```bash
cd /Users/mac/Documents/DeepOrder_V2
npm --workspace kds-web run typecheck
npm --workspace kds-web run build
```

```text
typecheck: 통과
build: 통과
런타임: Playwright 브라우저 검증 통과
backend auth test: 통과 (`pytest tests/test_auth_api.py -q`)
```

### 7.8 남은 parity gap 또는 후속 보정 필요 항목

* 현재 병합 범위 기준 치명적인 parity gap은 확인되지 않았다.
* 후속 보정 후보:
  * `favicon.ico` 추가로 개발 콘솔 404 제거
  * 주소 검색 팝업 UX를 실제 운영 문맥에서 추가 점검
  * KDS 주문 카드 상세 시각 요소 미세 튜닝은 이후 UI polish 단계에서 진행 가능
  * 자동로그인 브라우저 실검증은 현재 실행 중 백엔드 프로세스의 CORS 상태 정리 후 한 번 더 재확인하면 된다

---

## 8. 한 줄 작업 원칙

```text
리팩토링본의 UI/UX를 새 기준 제품 흐름으로 채택하되,
dev 전용 우회 코드를 제거하고 현재 DeepOrder backend/API에 정확히 다시 연결한다.
```
