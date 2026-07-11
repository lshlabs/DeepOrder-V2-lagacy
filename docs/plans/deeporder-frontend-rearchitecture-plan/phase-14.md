# Phase 14 — 아키텍처 자동 강제와 최종 검증

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 비고: architecture enforcement와 최종 검증은 마지막 Phase로 아직 시작 전이다.

## 목표

완성된 구조가 다시 무너지지 않도록 architecture check, ESLint 경계, 최종 문서를 추가한다.

## 실행 규칙

이 Phase는 최종 봉인 단계다. 기능 추가 없이 규칙 자동화와 최종 검증만 수행한다.

## 핵심 작업

### 1. architecture check script

생성:

```text
kds-web/scripts/check-frontend-architecture.mjs
```

검사 항목:

1. CSS 파일이 `src/app/styles/globals.css` 하나인지
2. CSS import가 `src/main.tsx` globals import 한 건만 남았는지
3. `antd` import와 `.ant-` selector가 없는지
4. `src/shared`, `src/features/kds`, `src/types`가 없는지
5. legacy token/class 패턴이 없는지
6. `components/ui|blocks|layout`이 feature를 import하지 않는지
7. feature 외부 deep import가 없는지
8. `components/ui` 외부 raw form control을 탐지하는지
9. `@tailwind` directive가 globals.css에만 있는지
10. `preflight: false`가 없는지

### 2. package script

`package.json`

```json
"check:architecture": "node scripts/check-frontend-architecture.mjs",
"check": "npm run typecheck && npm run lint && npm run check:architecture && npm run build"
```

### 3. ESLint 경계

최소 규칙:

- `src/components/**/*` -> `@/features/*` import 금지
- `src/components/ui/**/*` -> `@/components/blocks|layout|@/pages|@/app` import 금지
- 외부에서 feature 내부 경로 deep import 금지
- `antd` import 금지
- `main.tsx` 외부 CSS import 금지

### 4. 현재 아키텍처 문서

생성:

```text
kds-web/docs/architecture/frontend.md
```

포함:

- stack
- 최종 tree
- layer 책임
- import 방향
- feature segment 기준
- `ui`/`blocks`/`layout` 차이
- token/class 원칙
- inline style 허용 기준
- 새 feature 추가 절차
- 금지 패턴
- 검증 명령

### 5. README 연결

- `kds-web/README.md`에 짧은 architecture 섹션 추가
- 상세 문서 링크만 제공

### 6. 최종 audit

- 미사용 file/component/dependency 제거
- Phase 01 기능 매트릭스 전항목 재검증
- 미검증 항목이 있으면 `DONE` 대신 `BLOCKED`

## 최종 검증

```bash
npm run check
```

추가로 수동 확인:

- 인증
- 주문
- 매장 상태
- 설정
- 직원/작업
- 통계
- 지원/chatbot
- desktop/mobile
- overlay/focus/disabled

## 완료 조건

- architecture 검사가 `npm run check`에 포함된다.
- 금지 구조가 자동 탐지된다.
- frontend architecture 문서가 현재 코드와 일치한다.
- README가 이를 연결한다.
- 모든 Phase 상태가 실제 완료 상태와 일치한다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
architecture check 항목:
ESLint 경계:
최종 CSS 수:
최종 dependency 정리:
npm run check:
전체 기능 매트릭스:
최종 blocker:
```
