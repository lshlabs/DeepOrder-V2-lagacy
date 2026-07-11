# Phase 05 — 인증 도메인 구조화와 `auth.css` 제거

## 현재 상태

- 문서 상태: `IN_PROGRESS`
- 확인 기준일: `2026-07-11`
- 중단 지점: `features/auth` 구조 생성과 `AuthPage` 1차 슬림화까지 반영됨. `App.tsx -> useAuthSession` 이관, `auth.css` 제거, 빌드 복구는 미완료.

## 다음 작업자 시작 규칙

다음 v0 작업자는 `overview.md`와 이 문서만 읽고 바로 작업을 시작해도 된다.

선행 Phase 해석:

- `Phase 01~04`는 문서상 `PENDING`이지만, Phase 05 진행에 필요한 최소 구조는 이미 코드에 존재한다.
- 따라서 Phase 05 작업자는 선행 Phase를 다시 수행하지 말고, 이 문서의 `현재 중단 스냅샷`을 기준으로 이어서 진행한다.
- 단, 아래 두 가지는 현재 blocker 후보로 간주한다.
  - Radix/shadcn 의존성 누락
  - `AuthPage.tsx`의 `loginIdRef` 타입 오류

## 목표

인증 API·상태·UI를 `features/auth`에 응집시키고 `App.tsx`, `AuthPage.tsx`를 얇게 만든다. 인증 화면의 legacy class를 Tailwind/shadcn으로 전환한 뒤 `auth.css`를 삭제한다.

## 현재 중단 스냅샷

다음 상태까지는 이미 반영된 것으로 확인했다.

- `src/features/auth/{api,lib,model,ui}` 구조 생성 완료
- 생성 파일 존재
  - `src/features/auth/api/auth-api.ts`
  - `src/features/auth/lib/auth-storage.ts`
  - `src/features/auth/model/types.ts`
  - `src/features/auth/model/use-auth-session.ts`
  - `src/features/auth/ui/AuthShell.tsx`
  - `src/features/auth/ui/LoginForm.tsx`
  - `src/features/auth/ui/SignupForm.tsx`
  - `src/features/auth/ui/ApprovalPendingView.tsx`
  - `src/features/auth/index.ts`
- `src/pages/auth/AuthPage.tsx`는 feature UI를 조합하는 얇은 형태로 1차 전환 완료

아직 끝나지 않은 부분:

- `src/app/App.tsx`는 아직 기존 bootstrap/login/logout/session 로직을 직접 소유
- `useAuthSession`은 존재하지만 `App.tsx`가 아직 사용하지 않음
- `useAuthSession` 내부도 `features/auth/api`, `features/auth/lib` 경계 대신 `@/lib/api`, `@/lib/auth`를 직접 참조
- `src/pages/auth.css`가 아직 살아 있고 `src/styles.css`에서 import 중
- `App.tsx`가 여전히 `auth-shell`, `status-card`, `boot-banner` class를 사용
- 현재 빌드 실패
  - 실제 코드 이슈: `LoginForm`의 `loginIdRef` 타입 불일치
  - 환경 이슈: `@radix-ui/*` 패키지가 설치되어 있지 않아 shadcn primitive import들이 해석되지 않음

즉, 끊긴 지점은 다음 두 작업 사이이다.

1. `features/auth` 생성 + `AuthPage` 얇게 만들기: 거의 완료
2. `App.tsx`를 `useAuthSession` 기반으로 단순화하고 `auth.css`를 제거하기: 미완료

## 시작 조건

- `src/app/App.tsx`
- `src/pages/auth/AuthPage.tsx`
- `src/pages/auth.css`
- `src/styles.css`
- `src/features/auth/**/*`

위 파일들을 실제 기준선으로 삼는다. 문서상 경로와 현재 저장소 구조가 다르면 실제 경로를 우선한다.

## 남은 작업

### 1. auth 경계 정리

- `useAuthSession`이 `@/lib/api`, `@/lib/auth`를 직접 import하지 않게 수정
- 가능하면 auth feature 내부 코드는 아래 경계만 사용
  - API: `features/auth/api/auth-api.ts`
  - storage: `features/auth/lib/auth-storage.ts`
  - types: `features/auth/model/types.ts`
- `features/auth/index.ts`는 App과 AuthPage가 실제로 쓰는 공개 항목만 export

### 2. `App.tsx` 단순화

`App.tsx`는 다음만 담당해야 한다.

- `useAuthSession()` 호출
- `booting`, `unauthenticated`, `pending`, `authenticated` 상태 분기
- `AuthPage` 또는 `KdsPage` 렌더
- 필요한 최소 callback/prop 전달

App 내부에 남기지 말 것:

- 로그인 request body 조립
- 토큰 저장/복원 구현
- refresh/logout 세부 구현
- 승인 상태 판정

### 3. boot/error UI 정리

현재 `App.tsx`가 사용 중인 아래 legacy class를 제거한다.

- `auth-shell`
- `status-card`
- `boot-banner`

boot/loading/error UI는 Tailwind + shadcn block/primitive로 교체한다.

### 4. `auth.css` 제거

모든 auth 관련 JSX에서 legacy styling class 사용을 0으로 만든다.

검색 기준:

```bash
rg -n "auth-|login-|signup-|pending-|boot-banner|status-card" src --glob '*.{ts,tsx}'
```

그 후:

- `src/styles.css`에서 `auth.css` import 제거
- `src/pages/auth.css` 삭제

### 5. 빌드 복구

코드 측면 최소 수정:

- `loginIdRef` 타입을 `useRef<HTMLInputElement | null>(null)`와 호환되게 정리

환경 측면:

- shadcn primitive가 실제 의존하는 `@radix-ui/*` 패키지가 설치되어 있는지 확인
- 설치 누락이면 현재 Phase blocker로 기록하거나, 작업 세션에서 의존성 설치 후 계속 진행

## 수정 금지

- KDS 도메인 구조 변경
- 주문/설정/통계/지원 기능 수정
- storage 정책 변경
- auth endpoint 또는 payload 변경
- auth 전용 CSS 신규 생성
- preflight 활성화

## 검증

```bash
npm run check
rg -n "auth\.css" src
rg -n '\.css["'\'']' src/features/auth src/pages/auth --glob '*.{ts,tsx}'
rg -n "auth-|login-|signup-|pending-|boot-banner|status-card" src --glob '*.{ts,tsx}'
```

예상 결과:

- `auth.css` import 0건
- auth feature/pages 내부 CSS import 0건
- legacy styling class 0건
- `npm run check` 통과

수동 확인:

- 최초 boot
- 잘못된 로그인
- 정상 로그인
- 자동 로그인 on/off
- refresh token 복구
- 가입 신청
- 승인 대기
- 거절
- logout 후 token 제거
- mobile/desktop overflow 없음

## 완료 조건

- 인증 관련 API, storage, model, UI가 `features/auth`에 응집되었다.
- `App.tsx`와 `AuthPage.tsx`가 얇아졌다.
- 인증 UI에 legacy styling class/token이 없다.
- `auth.css`와 import가 삭제되었다.
- 인증 흐름이 유지된다.
- `npm run check`가 통과한다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
생성/이동 파일:
삭제 CSS:
App.tsx 줄 수:
AuthPage.tsx 줄 수:
npm run check:
수동 검증:
blocker:
```

완료 후 `overview.md`의 Phase 05 상태를 `DONE`으로 변경한다.
