# Phase 12 — Shared/Types 해체와 App Orchestration 완성

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 비고: `src/shared`, `src/features/kds`, `src/types` 해체는 아직 시작 전으로 간주한다.

## 목표

`src/shared`, `src/features/kds`, 전역 `src/types`를 해체하고 app-level orchestration을 확정한다. 이 Phase가 Phase 06~12 번들의 통합 검증 지점이다.

## 번들 실행 규칙

Phase 06~12를 한 번에 밀었다면 여기서 첫 통합 검증을 수행한다.

필수 검증:

```bash
npm run check
test ! -d src/shared
test ! -d src/features/kds
test ! -d src/types
rg -n "@/features/[^/]+/(ui|model|api|lib)/" src --glob '*.{ts,tsx}'
rg -n "features/" src/components --glob '*.{ts,tsx}'
rg -n "kds-shared\.css" src
```

## 핵심 작업

### 1. shared 분류

- `src/shared/*`를 `src/lib`, `components/*`, 해당 feature로 이동
- `shared`라는 새 이름의 쓰레기통 폴더를 만들지 말 것

### 2. 전역 types 해체

- `src/types/index.ts`, `src/features/kds/types.ts`를 owner feature/lib로 이동
- cross-feature는 owner의 public type만 import
- wildcard export 금지

### 3. feature public API 확정

- 각 feature `index.ts`는 명시적 export만 허용
- 외부 deep import를 public API import로 정리

### 4. app-level orchestration

- `src/app/kds/model/use-kds-workspace.ts`
- `src/app/kds/KdsSectionRenderer.tsx`
- `src/app/kds/index.ts`

위 구조를 만들어 KDS 전체 수준 조율만 app으로 올린다.

### 5. KdsPage 단순화

- `KdsPage`는 shell 조립과 renderer 호출에 집중
- 거대한 단일 파일로 책임을 재집중시키지 말 것

### 6. shared CSS 마무리 삭제

- `kds-shared.css` 사용처 0 확인 후 삭제
- `styles.css` import도 제거

## 완료 조건

- `src/shared`, `src/features/kds`, `src/types`가 없다.
- feature public API와 import 방향이 정리되었다.
- `KdsPage`가 shell/orchestration 중심으로 얇아졌다.
- `kds-shared.css`가 삭제되었다.
- `npm run check`가 통과한다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
삭제 디렉터리:
type 이동 목록:
shared 파일 이동 목록:
KdsPage 최종 줄 수:
deep import 검사:
npm run check:
통합 검증:
blocker:
```
