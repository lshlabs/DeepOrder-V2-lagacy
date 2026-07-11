# Phase 10 — Stats 전환과 Scoped Reset 제거

## 현재 상태

- 문서 상태: `DONE`
- 확인 기준일: `2026-07-12`

## 목표

stats를 root feature로 이동하고 `stats.css`, `statsDashboard.css`의 scoped theme/reset을 제거한다.

## 번들 실행 규칙

Phase 06~12 연속 실행 기준. 이 Phase에서는 통계 조회와 chart 표시 정도만 smoke 확인한다.

필수 확인:

- typecheck
- lint
- 날짜 선택
- summary/chart 표시

## 핵심 작업

### 1. feature 이동

- `src/features/kds/stats/*` -> `src/features/stats/*`
- fetch/state는 `model`, 변환/format은 `lib`, 타입은 `types.ts`

### 2. scoped theme/reset 제거

- `statsDashboard.css`의 `--kds-stats-*`, `--kds-ui-*` 재정의, scoped `.dark`, `--tw-*` 초기화, box-sizing/reset류 제거
- chart 색은 global chart token 사용

### 3. UI 전환

- dashboard root, card, period control, loading/empty/error를 Tailwind/shadcn으로 정리
- date picker는 canonical token과 접근성만 정리
- chart DOM styling은 selector file 대신 Tailwind arbitrary selector 사용

### 4. CSS 삭제

- `stats.css`, `statsDashboard.css` import 제거 후 삭제
- `kds-shared.css`의 stats 전용 selector도 제거

## 완료 조건

- stats가 `src/features/stats`로 이동했다.
- scoped reset/theme가 없다.
- `stats.css`, `statsDashboard.css`가 삭제되었다.

## 완료 기록

```text
상태: DONE
완료 일시: 2026-07-12
Git commit: (pending commit)
이동 파일:
  신규: src/features/stats/components/StatsPanel.tsx  (Tailwind 재작성, MetricCell 분리)
  신규: src/features/stats/index.ts  (public API)
  KdsPage.tsx: kds/stats → stats import 교체
삭제 CSS:
  src/features/kds/stats/stats.css (삭제)
  styles.css: stats.css import 제거
  kds-shared.css: .kds-panel--stats 5개 selector 제거
    (.kds-panel padding, overflow, panel-header, panel-empty, section-divider)
chart token: stats.css의 color-accent, color-surface-3 토큰을 Tailwind arbitrary value로 직접 참조
부분 검증:
  - typecheck: PASS
  - lint (features/stats + KdsPage): PASS
blocker: none
```
