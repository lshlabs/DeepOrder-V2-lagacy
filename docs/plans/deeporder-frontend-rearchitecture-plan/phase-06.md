# Phase 06 — Layout, Store Status, Toast/Floating 전환

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 비고: Phase 05 완료 후 시작한다. 이번 세션에서는 Phase 06 범위 코드를 검증하지 않았다.

## 목표

KDS shell, store status, toast/floating 책임을 정리하고 legacy CSS 2개를 제거한다.

삭제 대상:

- `src/features/kds/store-status/store-status.css`
- `src/features/kds/layout/kds-actions.css`

## 번들 실행 규칙

Phase 06부터 Phase 12까지는 한 세션에서 연속 실행해도 된다. 이 Phase에서는 상세 수동 테스트보다 구조 정리와 import 경계 정리에 집중한다.

이 Phase 종료 시 필수 확인:

- `npm run typecheck`
- `npm run lint`
- store status 변경
- account menu / logout
- toast 표시

`npm run build`와 광범위 수동 검증은 Phase 12 종료 시 한 번에 수행해도 된다.

## 핵심 작업

### 1. layout 전환

- `KdsShell`, `Sidebar`, `Topbar`, `AccountMenu`의 legacy class 제거
- `Sheet`, `DropdownMenu`, `Button`, `Badge`, `Tooltip`, `Separator` 우선 사용
- desktop sidebar와 mobile sheet는 같은 navigation source를 사용

### 2. store-status 승격

- `src/features/kds/store-status/*`를 `src/features/store-status/*`로 이동
- 구조는 `ui`, `model`, `api`, `types.ts` 중 필요한 것만 사용
- 색상은 semantic tone 사용

### 3. toast 교체

- `KdsToast`, `useToast` 제거
- Sonner 기반 `notify` adapter로 통일
- Toaster는 app root에 1회만 배치

### 4. floating 해체

- `src/shared/components/floating/*`를 책임에 따라 `components/ui`, `components/blocks`, `components/layout`, 해당 feature로 재배치
- `floating`이라는 포괄 폴더를 이름만 바꿔 유지하지 말 것

### 5. clock 이동

- `useKdsClock`은 `src/lib/date/use-clock.ts`로 이동
- KDS 전용 formatting이 섞여 있으면 hook과 formatter 분리

### 6. CSS/import 삭제

- `store-status.css`, `kds-actions.css` 사용처 제거
- `styles.css` import 제거
- 비어 있으면 legacy 디렉터리 삭제

## 완료 조건

- layout 컴포넌트가 Tailwind/shadcn만 사용한다.
- store-status feature가 root feature로 이동했다.
- `KdsToast`, `useToast`가 제거되었다.
- `store-status.css`, `kds-actions.css`가 삭제되었다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
이동 파일:
삭제 파일:
toast 전환 방식:
부분 검증:
blocker:
```
