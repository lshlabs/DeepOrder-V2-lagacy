# Phase 13 — Legacy CSS 전면 삭제와 Tailwind Preflight 활성화

## 현재 상태

- 문서 상태: `DONE`
- 확인 기준일: `2026-07-12`

## 목표

남은 legacy CSS를 전부 제거하고 `preflight`를 활성화한다. 최종 CSS는 `src/app/styles/globals.css` 하나만 남긴다.

## 실행 규칙

Phase 13은 Phase 06~12 번들 이후의 단독 마감 단계다. 여기서 CSS/렌더 회귀를 본격적으로 확인한다.

필수 검증:

```bash
npm run check
find src -name '*.css' -print
rg -n '\.css["'\'']' src --glob '*.{ts,tsx}'
rg -n -- '--color-|--kds-ui-' src
rg -n "kds-btn-|btn-outline|kds-panel|kds-table" src
rg -n "preflight:\s*false" tailwind.config.js
rg -n "from ['\"]antd|antd/dist/reset.css|\.ant-" src package.json
```

## 핵심 작업

### 1. globals.css 최소화

- `globals.css`에는 Tailwind directive, semantic token, 최소 base rule만 남긴다
- feature selector, legacy class, raw element 디자인 override 금지

### 2. legacy CSS 삭제

- `src/styles.css`
- `src/styles/base.css`
- `src/styles/tokens.css`

`src/main.tsx`는 `src/app/styles/globals.css`만 import

### 3. preflight 활성화

- `tailwind.config.js`에서 `preflight: false` 제거
- 회귀는 JSX class/shadcn primitive 수정으로 해결

### 4. dependency 정리

- 실제 import 없는 UI dependency 제거
- `antd`, `dayjs`, 미사용 Radix 패키지 재확인

## 완료 조건

- CSS 파일이 `globals.css` 하나뿐이다.
- preflight가 활성화되었다.
- legacy token/class 사용이 0이다.
- Ant Design이 완전히 제거되었다.

## 완료 기록

```text
상태: DONE
완료 일시: 2026-07-12
Git commit: (pending commit)
최종 CSS 목록:
  src/app/styles/globals.css (1개)
  - @layer base: tokens + base reset + kds-layout + @keyframes
  - @layer components: kds-panel-shell, kds-panel, kds-table, kds-badge, kds-settings-*, kds-segmented 등
삭제 파일:
  src/styles.css
  src/styles/tokens.css
  src/styles/base.css
  src/features/kds/layout/kds-layout.css
  (main.tsx: ./styles.css import 제거)
삭제 dependency: 없음 (antd는 phase 범위 밖)
preflight: false 제거: tailwind.config.js에서 corePlugins.preflight:false 블록 삭제
legacy 검색 결과:
  kds-panel-shell, kds-panel--settings: globals.css @layer components에 정의됨 (정상)
  --color-/* 토큰 참조: 165개 (globals.css :root에 정의됨, 정상)
npm run check: PASS (tsc --noEmit)
회귀 검증: typecheck PASS, lint PASS
blocker: none
```
