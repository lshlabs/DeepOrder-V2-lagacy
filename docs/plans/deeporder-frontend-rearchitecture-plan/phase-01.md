# Phase 01 — 기준선 수집과 Migration 안전장치

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 빠른 재판정: `PENDING`
- 근거:
  - `kds-web/docs/frontend-rearchitecture/baseline.md`가 존재하지 않음
  - `package.json`의 `check` script는 존재함
  - 따라서 Phase 01 산출물은 부분 반영 상태로 보이나 완료 조건 충족으로 볼 수 없음

## 목표

현재 `kds-web`의 빌드 가능 상태, 파일 구조, CSS 의존성, UI 라이브러리 의존성, legacy selector 사용처를 재현 가능한 문서로 남긴다. 이 Phase에서는 애플리케이션 구조나 스타일을 바꾸지 않는다.

## 시작 조건

- `overview.md`의 공통 제약을 읽었다.
- 이 Phase의 상태를 `IN_PROGRESS`로 변경했다.
- 저장소 루트가 아니라 `kds-web` 디렉터리에서 명령을 실행한다.
- 기존 사용자 변경이 있으면 삭제하지 않고 `git status --short` 결과를 완료 기록에 남긴다.

## 작업 범위

### 1. 패키지 설치 기준 확립

1. `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock` 존재 여부를 확인한다.
2. 기존 lockfile이 있으면 해당 package manager를 사용한다.
3. lockfile이 없고 현재 프로젝트가 npm을 사용한다면 `npm install`을 실행해 `package-lock.json`을 생성한다.
4. 의존성 버전을 임의로 갱신하지 않는다.

### 2. 현재 검증 명령 실행

다음을 순서대로 실행하고 결과를 기록한다.

```bash
npm run typecheck
npm run lint
npm run build
```

실패가 있으면 migration 작업으로 숨기지 않는다. 실패 항목, 오류 메시지 요약, 기존 오류인지 여부를 `docs/frontend-rearchitecture/baseline.md`에 기록한다.

### 3. 통합 검증 스크립트 추가

`package.json`의 `scripts`에 다음을 추가한다.

```json
"check": "npm run typecheck && npm run lint && npm run build"
```

기존 script는 삭제하거나 이름을 변경하지 않는다.

### 4. 기준선 문서 생성

다음 파일을 만든다.

```text
kds-web/docs/frontend-rearchitecture/baseline.md
```

반드시 아래 내용을 포함한다.

- 기준선 작성 일시
- 현재 Git branch와 commit hash
- Node.js와 npm 버전
- `git status --short`
- 현재 `src` 최상위 구조
- 모든 `.css` 파일 경로와 각 줄 수
- `styles.css`의 import 목록
- `tailwind.config.js`의 `preflight` 상태
- `components.json`의 CSS 경로와 alias
- `package.json`의 UI 관련 의존성
- `components/ui` 현재 파일 목록
- `src/shared` 현재 파일 목록
- `src/features/kds` 도메인 목록
- `KdsPage.tsx`가 import하는 feature hook과 overlay 목록
- 아래 정적 검색 결과 개수

```bash
rg -n '<button|<input|<select|<textarea' src --glob '*.tsx'
rg -n 'className=.*kds-|className=.*btn-outline|className=.*panel-' src --glob '*.tsx'
rg -n -- '--color-|--kds-ui-' src
rg -n "from ['\"]antd|antd/dist/reset.css" src package.json
rg -n '@tailwind' src --glob '*.css'
rg -n '\.css["'\'']' src --glob '*.{ts,tsx}'
```

검색 결과는 전체 내용을 문서에 복사하지 말고 다음 형식으로 요약한다.

```text
패턴:
결과 개수:
대표 파일:
비고:
```

### 5. 핵심 기능 검증 매트릭스 작성

`baseline.md`에 아래 화면과 상태를 체크리스트로 만든다. 실행 환경이 제공되면 실제로 확인하고, backend나 계정이 없어 확인할 수 없으면 `NOT RUN — 사유`로 명시한다.

- 앱 boot/loading/error
- 로그인
- 자동 로그인 체크/해제
- 가입 신청
- 승인 대기
- 거절 상태
- 승인 계정 KDS 진입
- 주문 NEW/COOKING/DONE
- 주문 상세
- 주문 context menu
- 주문 삭제/완료 주문 정리 dialog
- 매장 운영/일시정지 상태
- 수동 전체 새로고침
- 설정 저장과 비밀번호 변경
- 직원
- 내 작업/배정 메뉴
- 통계 날짜 선택과 차트
- FAQ 검색
- 챗봇 열기/닫기/메시지 전송
- desktop과 좁은 viewport

## 수정 금지

- `src` 파일 이동
- CSS selector 수정
- Tailwind config 수정
- Ant Design 제거
- UI 컴포넌트 추가
- 코드 formatting을 이유로 한 광범위한 diff
- 기존 오류를 unrelated refactor로 고치는 작업

## 완료 조건

- `docs/frontend-rearchitecture/baseline.md`가 생성되었다.
- `package.json`에 `check` script가 있다.
- `npm run check` 결과가 기록되었다.
- 모든 legacy CSS 파일과 주요 패턴의 기준 개수가 기록되었다.
- 기능 검증 매트릭스가 작성되었다.
- 애플리케이션 동작과 스타일에 의도적인 변경이 없다.

## 완료 기록

완료 시 아래를 채운다.

```text
상태:
완료 일시:
Git commit:
npm run check:
생성/수정 파일:
확인하지 못한 기능:
후속 Phase에 전달할 blocker:
```

그 후 `overview.md`의 Phase 01 상태를 `DONE`으로 변경한다.
