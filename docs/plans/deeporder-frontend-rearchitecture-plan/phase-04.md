# Phase 04 — app/pages/layout 골격과 KDS Shell 분리

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 빠른 재판정: `PENDING`
- 근거:
  - `src/app/App.tsx`, `src/pages/auth/AuthPage.tsx`, `src/pages/kds/KdsPage.tsx`, `src/components/layout/*`, `src/app/navigation/*`는 존재
  - 즉 구조 분리는 상당 부분 반영됨
  - 하지만 `npm run check`가 실패하고, legacy class 기반 shell도 그대로 남아 있어 완료 처리 불가

## 목표

Vite 애플리케이션의 bootstrap, 최상위 page, 공통 layout과 feature를 명확히 분리한다. 이 Phase는 파일 소유권과 조립 구조를 정리하며 feature 스타일 전환은 수행하지 않는다.

## 시작 조건

- `@/` alias가 동작한다.
- `src/components/ui`와 `src/components/blocks`가 존재한다.
- 기존 KDS 기능이 Phase 01 기준에서 동작한다.

## 목표 구조

```text
src/
├─ main.tsx
├─ app/
│  ├─ App.tsx
│  ├─ navigation/
│  │  ├─ kds-sections.ts
│  │  └─ types.ts
│  ├─ providers/
│  │  └─ AppProviders.tsx
│  └─ styles/
│     └─ globals.css
├─ pages/
│  ├─ auth/
│  │  └─ AuthPage.tsx
│  └─ kds/
│     └─ KdsPage.tsx
└─ components/
   └─ layout/
      ├─ KdsShell.tsx
      ├─ KdsSidebar.tsx
      ├─ KdsTopbar.tsx
      ├─ KdsAccountMenu.tsx
      └─ index.ts
```

## 작업 절차

### 1. App 이동

`src/App.tsx`를 `src/app/App.tsx`로 이동한다. `src/main.tsx`는 `@/app/App`을 import하도록 수정한다.

`App.tsx`의 인증 및 세션 동작은 이 Phase에서 재작성하지 않는다. 파일 이동과 import 정리만 한다.

### 2. Page 디렉터리 정리

다음을 이동한다.

```text
src/pages/AuthPage.tsx -> src/pages/auth/AuthPage.tsx
src/pages/KdsPage.tsx  -> src/pages/kds/KdsPage.tsx
```

`auth.css`는 아직 기존 위치에 유지한다. Auth 스타일 제거는 다른 Phase의 범위다.

### 3. Layout 컴포넌트 이동

다음을 `src/components/layout`으로 이동한다.

```text
src/features/kds/layout/components/KdsSidebar.tsx
src/features/kds/layout/components/KdsTopbar.tsx
src/features/kds/layout/components/KdsAccountMenu.tsx
```

이동 후 도메인 feature 내부 구현을 deep import하지 않도록 props 타입을 정리한다. 현재 UI와 className은 유지한다.

`src/components/layout/index.ts`에서 외부에 필요한 컴포넌트만 명시적으로 export한다.

### 4. KdsShell 생성

`src/components/layout/KdsShell.tsx`를 생성한다.

책임:

- 전체 viewport layout
- sidebar와 mobile overlay 위치
- topbar 위치
- main content slot
- sidebar open/close props
- 공통 shell 수준의 semantic markup

금지 책임:

- 주문 polling
- 설정 저장
- 통계 조회
- support session
- 직원/작업 비즈니스 로직

`KdsPage`는 기존 hook과 overlay orchestration을 유지하되, layout markup은 `KdsShell`로 이동한다.

### 5. Navigation registry 생성

`src/app/navigation/types.ts`에 section id type을 정의한다.

기존 `BoardTab` 값을 기준으로 누락 없이 정의한다.

예상 section:

```text
RECEIVED
MY_TASKS
STAFF
STATS
SETTINGS
SUPPORT
```

실제 코드에 다른 section이 있으면 기준선에 맞춰 포함한다.

`src/app/navigation/kds-sections.ts`에 다음 metadata를 둔다.

- id
- label
- icon
- managerOnly
- topbar 표시 여부
- sidebar 표시 여부

Sidebar와 Topbar가 label/icon/권한 조건을 중복 하드코딩하지 않고 registry를 사용하도록 한다.

이 Phase에서는 registry에 feature page component를 직접 넣지 않는다. 데이터 ownership은 아직 기존 KdsPage에 있다.

### 6. AppProviders 생성

현재 전역 provider가 없어도 `src/app/providers/AppProviders.tsx`를 억지로 복잡하게 만들지 않는다.

Sonner Toaster 등 실제 전역 provider가 Phase 03에서 추가되어 있다면 이 wrapper에서 조립한다. provider가 하나도 없다면 children passthrough 컴포넌트를 만들거나 디렉터리 생성을 생략할 수 있다.

### 7. Import 경로 정리

수정한 파일의 상대 경로를 `@/` alias로 바꾼다. 전체 저장소의 모든 상대 import를 한 번에 변경하지 않는다.

## 수정 금지

- feature CSS 제거
- AuthPage Tailwind 전환
- layout className 대규모 변경
- feature hook을 다른 폴더로 이동
- KdsPage의 주문·설정·통계 orchestration을 재설계
- React Router 도입
- Next.js식 route convention 도입

## 검증

```bash
npm run check
```

정적 확인:

```bash
test ! -f src/App.tsx
test -f src/app/App.tsx
test -f src/pages/auth/AuthPage.tsx
test -f src/pages/kds/KdsPage.tsx
test -f src/components/layout/KdsShell.tsx
rg -n "features/kds/layout/components" src
```

마지막 검색 결과는 0건이어야 한다.

수동 확인:

- 로그인 전 AuthPage 렌더링
- 승인 세션에서 KDS 진입
- sidebar 열기/닫기
- section 전환
- manager/employee 메뉴 차이
- topbar action
- 전체 새로고침
- logout

## 완료 조건

- app, pages, layout의 책임이 물리적으로 분리되었다.
- `KdsPage`의 layout markup이 `KdsShell`로 이동했다.
- navigation metadata가 한 곳에 존재한다.
- 기존 `features/kds/layout/components`는 비었다면 삭제되었다.
- feature 동작과 스타일 회귀가 없다.
- `npm run check`가 통과한다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
이동 파일:
생성 파일:
KdsPage 변경 전/후 줄 수:
npm run check:
수동 검증:
blocker:
```

완료 후 `overview.md`의 Phase 04 상태를 `DONE`으로 변경한다.
