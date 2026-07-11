# Phase 03 — shadcn Primitive와 공통 Block 계층 구축

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 빠른 재판정: `PENDING`
- 근거:
  - `src/components/ui`와 `src/components/blocks` 산출물은 존재
  - 그러나 `@radix-ui/*` 의존성 해석 실패로 `npm run typecheck`가 깨짐
  - 따라서 primitive/block 계층은 부분 생성 상태지만 완료로 볼 수 없음

## 목표

legacy CSS를 대체할 수 있도록 도메인 중립 UI primitive와 조합형 block을 준비한다. 이 Phase에서는 기존 feature 화면을 전환하지 않는다.

## 시작 조건

- `src/app/styles/globals.css`에 Tailwind directive와 canonical token이 존재한다.
- `components.json`이 `src/app/styles/globals.css`를 가리킨다.
- `@/` alias가 동작한다.
- preflight는 아직 false다.

## 디렉터리 기준

```text
src/components/
├─ ui/       # shadcn/Radix 기반 primitive
├─ blocks/   # 여러 화면에서 공유하는 도메인 중립 조합 UI
└─ layout/   # 이 Phase에서는 생성만 가능하며 실제 shell 이동은 하지 않음
```

## 작업 절차

### 1. 필요한 primitive 추가

현재 존재하는 컴포넌트를 먼저 확인하고 중복 생성하지 않는다.

현재 프로젝트에 없는 것 중 아래 항목을 shadcn CLI 또는 동일한 공식 패턴으로 추가한다.

```text
accordion
alert
alert-dialog
checkbox
context-menu
dialog
dropdown-menu
label
radio-group
scroll-area
select
separator
sheet
skeleton
sonner
switch
table
tabs
textarea
tooltip
```

CLI를 사용한다면 기존 `globals.css`, `tailwind.config.js`, `components.json` 변경을 검토하고 Phase 02 설정을 되돌리지 않는다.

각 primitive는 다음 규칙을 지킨다.

- feature, API, auth session을 import하지 않음
- canonical semantic token 사용
- `cn()` 사용
- 접근성 primitive 유지
- domain-specific text를 기본값으로 넣지 않음
- 별도 CSS 파일을 만들지 않음

### 2. 기존 primitive 정리

`src/components/ui/index.ts`가 있다면 공개 API를 명시적으로 관리한다. 사용하지 않는 wildcard export를 피한다.

기존 컴포넌트의 variant 이름을 통일한다.

```text
default
secondary
outline
ghost
destructive
link
```

size는 실제 필요 범위만 둔다.

```text
default
sm
lg
icon
```

기존 화면 호환을 이유로 `.kds-btn-*`와 같은 class를 primitive 안에 넣지 않는다.

### 3. 공통 block 생성

다음 파일을 생성한다.

```text
src/components/blocks/PageHeader.tsx
src/components/blocks/PageSection.tsx
src/components/blocks/EmptyState.tsx
src/components/blocks/ErrorState.tsx
src/components/blocks/LoadingState.tsx
src/components/blocks/ConfirmDialog.tsx
src/components/blocks/DataTableShell.tsx
src/components/blocks/StatusBadge.tsx
src/components/blocks/index.ts
```

각 block의 책임:

- `PageHeader`: title, description, optional actions
- `PageSection`: section heading과 Card 기반 content shell
- `EmptyState`: icon, title, description, optional action
- `ErrorState`: 오류 설명과 optional retry
- `LoadingState`: Skeleton 또는 spinner 기반 공통 loading
- `ConfirmDialog`: AlertDialog 기반 확인/취소
- `DataTableShell`: table header/body와 overflow shell
- `StatusBadge`: `neutral`, `info`, `success`, `warning`, `danger` 정도의 제한된 tone

block은 API 호출, feature hook, 특정 도메인 타입을 포함하지 않는다. 데이터를 props로만 받는다.

### 4. CVA 사용 기준

CVA는 동일한 컴포넌트의 제한된 시각 variant에만 사용한다.

허용:

```text
Button variant/size
Badge tone
StatusBadge tone
PageSection density
```

금지:

- 주문 상태별 비즈니스 로직
- 컴포넌트 구조가 달라지는 수십 개 boolean variant
- feature 이름을 variant로 사용

### 5. 개발 확인용 임시 화면 금지

storybook, demo route, production에 노출되는 showcase page를 추가하지 않는다. 필요한 경우 테스트 파일 또는 개발 중 로컬 임시 코드로 확인한 후 제거한다.

## 수정 금지

- 기존 feature JSX의 class 전환
- 기존 CSS 파일 삭제
- `KdsPage` 구조 변경
- Ant Design 제거
- preflight 활성화
- block에서 feature import
- `@apply` 기반 공통 CSS class 생성

## 검증

```bash
npm run check
```

정적 검사:

```bash
rg -n "features/" src/components/ui src/components/blocks
rg -n "\.css" src/components --glob '*.{ts,tsx}'
rg -n -- '--color-|--kds-ui-' src/components
```

예상 결과:

- `components/ui`, `components/blocks`에서 feature import 0건
- CSS import 0건
- legacy token 직접 참조 0건

## 완료 조건

- 필요한 shadcn primitive가 존재한다.
- 모든 primitive가 canonical token과 Tailwind를 사용한다.
- 지정한 공통 block이 구현되어 있다.
- 공통 block에 도메인 로직이 없다.
- 신규 CSS 파일이 없다.
- 기존 화면 동작은 변경되지 않았다.
- `npm run check`가 통과한다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
추가한 primitive:
추가한 block:
추가/제거 dependency:
npm run check:
blocker:
```

완료 후 `overview.md`의 Phase 03 상태를 `DONE`으로 변경한다.
