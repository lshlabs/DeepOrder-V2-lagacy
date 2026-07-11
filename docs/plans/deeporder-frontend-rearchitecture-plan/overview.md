# DeepOrder KDS Web Frontend Re-architecture Overview

## 문서 사용 방법

이 디렉터리는 `kds-web`을 **Vite + React + TypeScript + Tailwind CSS + shadcn/ui 기반의 Pragmatic Feature Architecture**로 전환하기 위한 실행 계획이다.

기본 원칙:

1. 항상 `overview.md`를 먼저 읽는다.
2. 단일 Phase 작업이면 현재 `IN_PROGRESS` 문서 한 개만 추가로 읽는다.
3. 연속 실행 최적화가 필요하면 아래 번들 단위로 읽는다.

권장 번들:

- Phase 01~05: 기반 정리와 auth 마감
- Phase 06~12: layout/store-status/settings/staff/tasks/support/stats/orders/shared-orchestration 연속 실행
- Phase 13~14: CSS 최종 정리, preflight, architecture enforcement

토큰 절약 원칙:

- Phase 06~12는 문서별 세부 단계보다 "이동 대상, 삭제 대상, public API, 검증 시점"만 지켜서 한 세션에 연속 처리한다.
- Phase 06~11에서는 `typecheck + lint + 핵심 smoke`만 보고 넘어간다.
- 통합 `npm run check`와 deep import/CSS 구조 검증은 Phase 12에서 한 번 수행한다.
- 전면 시각 회귀와 preflight 검증은 Phase 13에서 수행한다.
- 최종 architecture/문서/자동화 검증은 Phase 14에서 수행한다.

상태 값은 다음 네 가지만 사용한다.

- `PENDING`: 아직 시작하지 않음
- `IN_PROGRESS`: 현재 수행 중
- `DONE`: 모든 완료 조건 충족
- `BLOCKED`: 외부 환경 또는 선행 조건 문제로 중단

## 현재 상태 요약

- 기준일: 2026-07-12
- 현재 작업 중 Phase: `Phase 14`
- 이번 세션에서 실제 완료된 Phase: `Phase 08`, `Phase 09`, `Phase 10`, `Phase 11`, `Phase 12`, `Phase 13`
- `Phase 01~04`는 실제 코드 기준으로 빠르게 재판정했다.
  - `Phase 01`: `PENDING`
  - `Phase 02`: `PENDING`
  - `Phase 03`: `PENDING`
  - `Phase 04`: `PENDING`
- 이유:
  - `Phase 01`: `kds-web/docs/frontend-rearchitecture/baseline.md`가 없다.
  - `Phase 02`: `globals.css`, alias, `components.json`는 있으나 `npm run check`를 통과하지 못한다.
  - `Phase 03`: primitive/block 파일은 존재하나 Radix 의존성 누락으로 typecheck가 깨진다.
  - `Phase 04`: `app/pages/layout` 골격은 있으나 전체 완료 조건의 전제인 `npm run check`가 실패한다.
- `Phase 06~14`는 아직 시작 전으로 간주하고 `PENDING`으로 유지한다.

## 다음 작업자 인계 규칙

다음 v0 작업자는 원칙적으로 아래 두 문서만 읽고 시작한다.

1. `overview.md`
2. `phase-05.md`

이 두 문서에는 현재 실제 중단 지점, 선행 Phase 재판정 결과, 다음 작업 범위가 모두 반영되어 있다.

추가 문서는 아래 경우에만 읽는다.

- `Phase 05` 완료 후 `Phase 06`부터 시작할 때
- `Phase 05` 진행 중 선행 구조 가정이 실제 코드와 충돌할 때

동시에 두 개 이상의 Phase를 `IN_PROGRESS`로 두지 않는다. Phase 완료 후 `overview.md`의 상태를 `DONE`으로 바꾸고, 완료 기록을 채운 Phase 문서는 필요하면 `archive/`로 이동한다.

---

## 전체 목표

현재 `kds-web`의 legacy CSS, 전역 feature CSS, Ant Design 의존성, 혼합된 UI 규칙과 과도하게 집중된 페이지 조립 구조를 제거한다.

최종 상태는 다음과 같다.

```text
kds-web/
├─ components.json
├─ tailwind.config.js
├─ postcss.config.js
├─ vite.config.ts
├─ tsconfig.json
└─ src/
   ├─ main.tsx
   ├─ app/
   │  ├─ App.tsx
   │  ├─ kds/
   │  ├─ navigation/
   │  ├─ providers/
   │  └─ styles/
   │     └─ globals.css
   ├─ pages/
   │  ├─ auth/
   │  └─ kds/
   ├─ components/
   │  ├─ ui/
   │  ├─ blocks/
   │  └─ layout/
   ├─ features/
   │  ├─ auth/
   │  ├─ orders/
   │  ├─ settings/
   │  ├─ staff/
   │  ├─ stats/
   │  ├─ store-status/
   │  ├─ support/
   │  └─ tasks/
   └─ lib/
      ├─ api/
      ├─ config/
      ├─ date/
      ├─ storage/
      └─ utils.ts
```

최종 스타일 기준:

- CSS 파일은 `src/app/styles/globals.css` 하나만 존재한다.
- `globals.css`는 Tailwind directive, shadcn semantic token, 최소 전역 base 규칙만 가진다.
- 일반 UI primitive는 `src/components/ui`에 둔다.
- 도메인 중립 조합 UI는 `src/components/blocks`에 둔다.
- KDS shell, sidebar, topbar는 `src/components/layout`에 둔다.
- 도메인 UI와 상태·API·타입은 `src/features/<domain>`이 소유한다.
- 정적 스타일은 Tailwind utility를 사용한다.
- 반복되는 제한적 시각 variant는 CVA를 사용한다.
- 런타임 좌표·거리·크기만 inline style 또는 CSS custom property를 허용한다.
- 애니메이션은 Tailwind config의 `keyframes`와 `animation`으로 관리한다.
- Ant Design과 Ant Design reset/override는 존재하지 않는다.
- Tailwind preflight는 활성화한다.

---

## 공통 제약

모든 Phase에서 아래 규칙을 반드시 지킨다.

1. 현재 프로젝트는 Next.js가 아닌 Vite SPA다. Next.js App Router, Server Component, Server Action을 도입하지 않는다.
2. React, TypeScript strict mode, Vite와 현재 API 계약을 유지한다.
3. Tailwind 3.4 계열에서 migration을 완료한다. 이 작업과 Tailwind 4 업그레이드를 결합하지 않는다.
4. 인증, 자동 로그인, 승인 대기/거절, 주문 polling, 주문 상태 변경, 수동 새로고침, 매장 상태, 설정, 통계, 직원, 작업, 고객지원과 챗봇 동작을 보존한다.
5. 기존 시각 구조와 정보 우선순위를 유지한다. 별도 요구가 없는 한 전면적인 UI 재디자인을 하지 않는다.
6. 한 Phase에서는 해당 문서에 명시된 범위만 수정한다.
7. 이전 Phase 결과가 누락되어 있으면 임의로 우회하지 말고 상태를 `BLOCKED`로 바꾼다.
8. 기존 CSS 파일은 해당 사용처가 모두 전환되고 검색 결과가 0이 된 뒤에만 삭제한다.
9. 신규 feature CSS, CSS Module, styled-components, Emotion, Sass, `@apply` 기반 component class를 만들지 않는다.
10. 신규 전역 selector를 만들지 않는다. `globals.css`의 `@layer base`에는 `html`, `body`, `#root`, 전역 border 기본값처럼 최소 규칙만 허용한다.
11. 신규 코드에서 legacy class와 legacy token을 사용하지 않는다.
12. `components/ui`는 도메인 API, feature hook, 주문·직원·매장 타입을 import하지 않는다.
13. `components/blocks`와 `components/layout`은 feature 내부 구현을 deep import하지 않는다.
14. feature 간 직접 deep import를 금지한다. 교차 조립은 `app`, `pages` 또는 명시적인 public API를 통해 수행한다.
15. 새 import는 `@/` alias를 우선 사용한다.
16. `any`, `@ts-ignore`, 불필요한 non-null assertion을 추가하지 않는다.
17. 접근성을 유지한다. interactive element에는 올바른 semantic element, label, keyboard interaction, focus 상태와 `aria-*`를 제공한다.
18. 패키지 버전의 대규모 갱신은 하지 않는다. 현재 Phase에서 필요한 의존성만 추가·제거한다.
19. 단일 Phase 작업이면 종료 전 `npm run check`를 ���행한다.
20. 번들 작업이면 중간 Phase는 `typecheck + lint + 해당 smoke`, 번들 종료 Phase에서만 `npm run check`를 실행한다.
21. 명령 실패 상태에서는 Phase를 `DONE`으로 표시하지 않는다.
22. Phase 완료 시 해당 문서의 `완료 기록`을 채우고 `overview.md` 상태를 갱신한다.
23. Git 작업 트리가 Phase 시작 전에 깨끗하지 않다면 기존 사용자 변경을 삭제하거나 덮어쓰지 않는다.

---

## Phase 목록 및 상태

| Phase | 문서 | 목표 | 상태 |
|---:|---|---|---|
| 01 | `phase-01.md` | 기준선 수집과 migration 안전장치 확립 | PENDING |
| 02 | `phase-02.md` | Tailwind 전역 진입점, semantic token, alias 정상화 | PENDING |
| 03 | `phase-03.md` | shadcn primitive와 공통 block 계층 구축 | PENDING |
| 04 | `phase-04.md` | app/pages/layout 골격과 KDS shell 분리 | PENDING |
| 05 | `phase-05.md` | 인증 도메인 구조 및 `auth.css` 제거 | DONE |
| 06 | `phase-06.md` | layout, store-status, toast/floating 전환 | DONE |
| 07 | `phase-07.md` | settings 전환 및 Ant Design 제거 | DONE |
| 08 | `phase-08.md` | staff/tasks 전환 및 shared table selector 축소 | DONE |
| 09 | `phase-09.md` | support/chatbot 전환 및 `support.css` 제거 | DONE |
| 10 | `phase-10.md` | stats 전환 및 scoped reset/CSS 제거 | DONE |
| 11 | `phase-11.md` | orders 전환 및 `orders.css` 제거 | DONE |
| 12 | `phase-12.md` | shared/types 해체, public API, app orchestration 완성 | DONE |
| 13 | `phase-13.md` | legacy CSS 전면 삭제와 preflight 활성화 | DONE |
| 14 | `phase-14.md` | 아키텍처 자동 강제, 최종 검증과 문서화 | PENDING |
