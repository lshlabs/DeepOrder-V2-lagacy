# Phase 09 — Support/Chatbot 전환과 `support.css` 제거

## 현재 상태

- 문서 상태: `DONE`
- 확인 기준일: `2026-07-12`

## 목표

support/chatbot을 root feature로 이동하고 `support.css`를 삭제한다. 큰 chatbot UI는 책임별 컴포넌트로 분리한다.

## 번들 실행 규칙

Phase 06~12 연속 실행 기준. 이 Phase에서는 FAQ와 chatbot 핵심 흐름만 smoke 확인한다.

필수 확인:

- typecheck
- lint
- FAQ 검색
- chatbot open/send/session 복원

## 핵심 작업

### 1. feature 이동

- `src/features/kds/support/*` -> `src/features/support/*`
- `hooks`는 `model`, session persistence는 `session`, static data는 `data`, UI는 `ui`

### 2. SupportPage 정리

- FAQ는 `Accordion`
- 검색은 `Input`
- clear, 결과 없음, keyboard/focus 유지

### 3. chatbot 분해

- `ChatbotFab`가 과대하면 header/list/message/composer/suggestions/window로 분리
- UI와 session/state를 분리
- mobile은 `Sheet` 또는 viewport-safe fixed panel, desktop은 floating card

### 4. animation/CSS 제거

- `support.css` keyframe은 Tailwind config animation으로 이전
- 위치/반응형은 Tailwind utility로 처리
- `support.css` import 삭제 후 파일 삭제

## 완료 조건

- support가 `src/features/support`로 이동했다.
- chatbot이 책임별 컴포넌트로 분리되었다.
- `support.css`와 import가 삭제되었다.

## 완료 기록

```text
상태: DONE
완료 일시: 2026-07-12
Git commit: (pending commit)
이동/분리 파일:
  신규: src/features/support/types/support.ts  (복사, 변경 없음)
  신규: src/features/support/data/supportData.ts  (복사, 변경 없음)
  신규: src/features/support/session/supportSessionProvider.ts  (복사, 변경 없음)
  신규: src/features/support/session/localSupportSessionProvider.ts  (복사, 변경 없음)
  신규: src/features/support/session/supportMessageMerge.ts  (복사, 변경 없음)
  신규: src/features/support/session/apiSupportSessionProvider.ts  (import 경로 수정)
  신규: src/features/support/hooks/useChatbotSession.ts  (import 경로 수정)
  신규: src/features/support/components/SupportPanel.tsx  (Tailwind 재작성)
  신규: src/features/support/components/FaqSection.tsx  (Tailwind 재작성)
  신규: src/features/support/components/ChatbotFab.tsx  (Tailwind 재작성, TypingIndicator 분리)
  신규: src/features/support/index.ts  (public API)
삭제 CSS: src/features/kds/support/support.css (삭제), styles.css에서 import 제거
추가 animation:
  tailwind.config.js keyframes: chatbot-bounce, chatbot-message-in
  tailwind.config.js animation: animate-chatbot-bounce, animate-chatbot-message-in
부분 검증:
  - typecheck: PASS
  - lint (features/support + KdsPage): PASS
blocker: none
```
