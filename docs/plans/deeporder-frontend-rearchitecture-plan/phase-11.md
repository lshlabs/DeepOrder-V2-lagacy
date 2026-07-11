# Phase 11 — Orders 전환과 `orders.css` 제거

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 비고: orders 전환은 가장 후반 범위이며 아직 시작 전으로 간주한다.

## 목표

orders를 root feature로 이동하고 정적 스타일을 Tailwind/shadcn으로 전환한 뒤 `orders.css`를 삭제한다.

## 번들 실행 규칙

Phase 06~12 연속 실행 기준. 이 Phase는 가장 복잡하므로 orders 핵심 플로우 smoke는 반드시 수행한다.

필수 확인:

- typecheck
- lint
- polling
- NEW/COOKING/DONE 전이
- detail/context menu
- pin/hide/archive

## 핵심 작업

### 1. feature 이동

- `src/features/kds/orders/*` -> `src/features/orders/*`
- hook은 `model`, helper는 `lib`, 타입은 `types.ts`, 외부 공개는 `index.ts`

### 2. board/card 전환

- board/column/card를 Tailwind 중심으로 재구성
- 정보 우선순위와 상태 표현 유지
- status tone과 variant는 semantic token + CVA 사용

### 3. overlay 전환

- context menu는 `ContextMenu` 또는 `DropdownMenu`
- detail은 `Dialog`
- destructive confirm은 `AlertDialog`

### 4. runtime gesture/animation 정리

- drag/swipe/pull 거리값만 inline style 또는 CSS custom property 허용
- 정적 스타일은 inline 금지
- `orders.css` keyframe은 필요한 것만 `tailwind.config.js`로 이동

### 5. CSS/shared selector 삭제

- `orders.css` 삭제
- `kds-shared.css`의 orders 관련 selector 제거

## 완료 조건

- orders가 `src/features/orders`로 이동했다.
- 주문 UI가 Tailwind/shadcn만 사용한다.
- `orders.css`가 삭제되었다.
- runtime gesture는 동적 값에만 inline style을 사용한다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
이동/분리 파일:
삭제 CSS:
Tailwind animation:
허용한 raw control/inline style:
부분 검증:
blocker:
```
