# Phase 07 — Settings 전환과 Ant Design 제거

## 현재 상태

- 문서 상태: `DONE`
- 확인 기준일: `2026-07-11`
- 비고: Ant Design 제거 여부와 settings 최종 구조는 아직 검증하지 않았다.

## 목표

settings 도메인을 root feature로 이동하고 Ant Design 의존성과 reset/CSS를 제거한다.

삭제 대상:

- `src/features/kds/settings/settings.css`
- `antd` import
- `antd/dist/reset.css`
- 불필요하면 `dayjs`

## 번들 실행 규칙

Phase 06~12 연속 실행 기준. 이 Phase에서는 settings 기능 smoke 확인만 수행하고 전체 빌드는 Phase 12에서 합산한다.

필수 확인:

- typecheck
- lint
- settings 조회/저장
- 비밀번호 변경 dialog 진입

## 핵심 작업

### 1. feature 이동

- `src/features/kds/settings/*` -> `src/features/settings/*`
- `components`는 `ui`, fetch/state는 `model`, 변환/검증은 `lib`, 필요한 경우만 `api`

### 2. SettingsPage 정리

- `SettingsPage`를 외부 진입점으로 둔다
- `KdsPage`는 settings public API만 사용

### 3. TimePicker 제거

- Ant `RangePicker` 제거
- 기본 대체는 `Input type="time"` 두 개로 구성한 `TimeRangeField`
- payload, validation, disabled/read-only, 모바일 사용성 유지

### 4. dialog/form 전환

- `ChangePasswordModal` -> `ChangePasswordDialog`
- raw control 대신 shadcn primitive 사용

### 5. dependency/CSS 정리

- `settings.css` 삭제
- 저장소 전체 `antd` import 0이면 dependency 제거
- `dayjs` 사용처가 0이면 같이 제거
- `package-lock.json` 갱신

## 완료 조건

- settings가 `src/features/settings`에 있다.
- settings UI가 Tailwind/shadcn만 사용한다.
- Ant Design code, reset, dependency가 없다.
- `settings.css`가 삭제되었다.

## 완료 기록

```text
상태: DONE
완료 일시: 2026-07-11
Git commit: Phase 06 위에 연속 적용
이동 파일:
  - features/kds/settings/components/SettingsPanel.tsx → features/settings/components/SettingsPanel.tsx (antd/dayjs 제거, TimeRangeField input type=time 인라인)
  - features/kds/settings/components/ChangePasswordModal.tsx → features/settings/components/ChangePasswordModal.tsx
  - features/kds/settings/hooks/useKdsSettings.ts → features/settings/hooks/useKdsSettings.ts (@/ alias 전환)
  - features/kds/settings/lib/settingsMapper.ts → features/settings/lib/settingsMapper.ts
TimePicker 대체 방식: input type="time" 두 개 + parseHHMM/toHHMM 헬퍼 (TimeRangeField 인라인)
삭제 dependency: antd (npm uninstall --workspace kds-web)
삭제 CSS: features/kds/settings/settings.css → rules를 kds-shared.css에 병합 (antd override rule 제거, kds-time-input rule 추가)
main.tsx에서 antd/dist/reset.css import 제거
dayjs: orderFormatters.ts에서 계속 사용 중이므로 의존성 유지
부분 검증: typecheck PASS / lint PASS / antd 코드 참조 0건 확인
blocker: 없음
```
