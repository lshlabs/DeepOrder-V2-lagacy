작업 기록: `/Users/mac/Documents/kds-web-v3`에서만 사용하는 개발용 preview 계층 추가 내역과, 이후 본 프로젝트로 UI를 이식할 때 반드시 제외해야 할 파일/분기를 정리한 문서.

# kds-web-v3 Dev Preview Layer

## 1. 목적

`/Users/mac/Documents/kds-web-v3`는 v0 UI 리팩토링 작업을 위한 별도 작업 디렉터리다.

이 디렉터리에서는:

* 실제 backend 없이도 로그인 화면 진입을 건너뛸 수 있어야 한다.
* 주문 fixture를 바로 띄워서 `접수 / 완료 / 통계` UI를 눈으로 검증할 수 있어야 한다.
* v0 환경에서 API가 붙지 않아도 화면 리팩토링을 진행할 수 있어야 한다.

반대로 이 preview 계층은:

* `/Users/mac/Documents/DeepOrder_V2/kds-web` 본체에는 반입하면 안 된다.
* 다음 병합 시 명시적으로 제거해야 한다.

---

## 2. 이번에 추가한 v3 전용 요소

### 2.1 새 파일

* `/Users/mac/Documents/kds-web-v3/src/lib/dev-preview.ts`
* `/Users/mac/Documents/kds-web-v3/.env.local`

### 2.2 수정 파일

* `/Users/mac/Documents/kds-web-v3/src/App.tsx`
* `/Users/mac/Documents/kds-web-v3/src/pages/AuthPage.tsx`
* `/Users/mac/Documents/kds-web-v3/src/pages/KdsPage.tsx`
* `/Users/mac/Documents/kds-web-v3/src/vite-env.d.ts`

---

## 3. 동작 방식

### 3.1 개발용 계정

`AuthPage`에 다음 개발용 계정 버튼을 추가했다.

* `개발용 점주 계정`
* `개발용 직원 계정`

이 버튼은 실제 API 로그인 요청을 보내지 않고 `dev-preview` 세션을 직접 만든다.

세션 정보는 `src/lib/dev-preview.ts`의 다음 요소로 관리한다.

* `DEV_PREVIEW_MODE`
* `PREVIEW_ACCOUNTS`
* `createPreviewSession()`
* `createPreviewCurrentUser()`
* `isDevPreviewAccessToken()`

### 3.2 개발용 주문 fixture

`KdsPage`는 preview 세션일 경우 실제 API 대신 `dev-preview` 주문 fixture를 읽는다.

관련 함수:

* `loadPreviewOrders()`
* `savePreviewOrders()`
* `resetPreviewOrders()`
* `updatePreviewOrderStatus()`

현재 fixture에는 다음 상태가 포함된다.

* `NEW` 주문
* `COOKING` 주문
* `DONE` 주문
* AI 분석 / 알레르기 경고 / 포장 요청 / 옵션 데이터

### 3.3 상태 변경

preview 세션에서의 `조리 시작`, `완료`는 API 호출이 아니라 로컬 스토리지 기반 fixture 상태 갱신으로 동작한다.

즉 v3에서는 backend 없이도 다음이 가능하다.

* 로그인
* 주문 보드 진입
* 접수 주문 확인
* 완료 탭 확인
* 통계 탭 확인
* `NEW -> COOKING -> DONE` 전환 확인

---

## 4. env

v3 전용 env:

```env
VITE_KDS_DEV_PREVIEW=true
```

반영 위치:

* `/Users/mac/Documents/kds-web-v3/.env.local`
* `/Users/mac/Documents/kds-web-v3/src/vite-env.d.ts`

중요:

```text
VITE_KDS_DEV_PREVIEW 는 v3 전용이다.
DeepOrder_V2/kds-web 본체에 다시 추가하면 안 된다.
```

---

## 5. 다음 병합 시 제외 대상

UI를 다시 `DeepOrder_V2/kds-web`로 반입할 때 아래 항목은 제외한다.

### 5.1 파일 단위 제외

* `/Users/mac/Documents/kds-web-v3/src/lib/dev-preview.ts`
* `/Users/mac/Documents/kds-web-v3/.env.local`

### 5.2 코드 분기 제외

`App.tsx`에서 제거 대상:

* `DEV_PREVIEW_MODE` import
* `PREVIEW_ACCOUNTS` import
* `createPreviewSession()` import
* `createPreviewCurrentUser()` import
* `isDevPreviewAccessToken()` import
* preview 세션 bootstrap 분기
* preview 세션 reauthorize 분기
* preview 로그인 버튼 연결용 `handlePreviewLogin()`
* `AuthPage`에 넘기는 `previewAccounts`, `onPreviewLogin` props

`AuthPage.tsx`에서 제거 대상:

* `previewAccounts` prop
* `onPreviewLogin` prop
* `개발용 프리뷰 모드` 배너
* 개발용 계정 버튼 UI

`KdsPage.tsx`에서 제거 대상:

* `dev-preview` import
* preview 세션 여부 판단 분기
* `loadPreviewOrders()` 초기화
* preview 주문 fetch 분기
* preview 상태 변경 분기

`vite-env.d.ts`에서 제거 대상:

* `VITE_KDS_DEV_PREVIEW`

---

## 6. 이식 원칙

다음번에 `kds-web-v3`의 UI/UX를 본 프로젝트로 반입할 때 원칙은 다음과 같다.

```text
UI/UX는 반입 가능
dev-preview 계층은 반입 금지
```

즉 병합 체크리스트에는 반드시 아래 문장을 포함한다.

```text
이번 병합에서는 kds-web-v3의 dev-preview 계층
(dev-preview.ts, VITE_KDS_DEV_PREVIEW, preview 로그인/주문 fixture 분기)
를 모두 제외한다.
```

---

## 7. 한 줄 결론

```text
kds-web-v3는 v0 리팩토링 작업을 위해 backend 없는 개발용 preview 계층을 가진다.
하지만 이 계층은 본 프로젝트로 병합할 때 반드시 제거해야 하는 v3 전용 도우미 계층이다.
```
