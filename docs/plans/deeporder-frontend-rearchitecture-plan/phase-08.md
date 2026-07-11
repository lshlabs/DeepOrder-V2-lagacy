# Phase 08 — Staff/Tasks 전환과 Shared Table Selector 축소

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 비고: staff/tasks root feature 이동과 shared selector 제거는 아직 시작 전으로 간주한다.

## 목표

staff/tasks를 root feature로 이동하고, 이 둘이 사용하던 `kds-shared.css` selector를 제거한다.

## 번들 실행 규칙

Phase 06~12 연속 실행 기준. 이 Phase에서는 CRUD와 접근 권한 smoke만 확인한다.

필수 확인:

- typecheck
- lint
- manager/employee 분기
- assigned menu CRUD

## 핵심 작업

### 1. Staff 이동

- `src/features/kds/staff/*` -> `src/features/staff/*`
- 외부 진입점은 `StaffPage`

### 2. Tasks 이동

- `src/features/kds/tasks/*` -> `src/features/tasks/*`
- 외부 진입점은 `TasksPage`

### 3. table 전환

- `kds-shared.css`의 staff/tasks 관련 selector를 Tailwind + shadcn Table로 치환
- 열 너비는 JSX class로 해결
- 좁은 화면은 horizontal scroll shell 사용

### 4. dialog/form 전환

- staff/tasks modal은 `Dialog`/`AlertDialog`
- raw control은 shadcn primitive로 교체

### 5. shared selector 삭제

- `kds-shared.css`에서 staff/tasks에 속한 selector만 제거
- orders/stats/support가 아직 쓰는 shared selector는 남겨둔다

## 완료 조건

- staff/tasks가 root feature로 이동했다.
- 두 feature의 UI가 Tailwind/shadcn만 사용한다.
- staff/tasks가 쓰던 shared CSS selector가 제거되었다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
이동 파일:
제거 selector 범주:
부분 검증:
blocker:
```
