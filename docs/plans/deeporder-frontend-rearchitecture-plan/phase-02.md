# Phase 02 — Tailwind 전역 진입점과 Semantic Token 정상화

## 현재 상태

- 문서 상태: `PENDING`
- 확인 기준일: `2026-07-11`
- 빠른 재판정: `PENDING`
- 근거:
  - `src/app/styles/globals.css` 존재
  - `@/` alias가 `tsconfig.json`, `vite.config.ts`에 존재
  - `components.json`이 `src/app/styles/globals.css`를 가리킴
  - `preflight: false` 유지 중
  - 하지만 `npm run check`를 통과하지 못하므로 완료 처리 불가

## 목표

Tailwind directive가 feature CSS에 들어 있는 비정상 구조를 제거하고, shadcn/ui가 사용할 공식 전역 CSS와 `@/` import alias를 만든다. 기존 legacy CSS는 이 Phase에서 삭제하지 않으며 화면 외형을 유지한다.

## 시작 조건

다음 항목이 존재해야 한다.

- `docs/frontend-rearchitecture/baseline.md`
- `package.json`의 `check` script
- Phase 01 기준에서 `npm run check` 결과가 알려져 있음

누락 시 이 Phase를 진행하지 않고 `BLOCKED`로 표시한다.

## 목표 파일

```text
src/app/styles/globals.css
src/main.tsx
tailwind.config.js
components.json
tsconfig.json
vite.config.ts
package.json
src/features/kds/stats/dashboard/statsDashboard.css
```

기존 `src/styles.css`, `src/styles/base.css`, `src/styles/tokens.css`는 유지한다.

## 작업 절차

### 1. `@/` alias 설정

`tsconfig.json`에 다음 의미의 설정을 추가한다.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

`vite.config.ts`에도 동일한 `@ -> src` alias를 추가한다. Node path API를 사용한다면 `@types/node`를 devDependency로 추가한다. alias가 build와 editor 양쪽에서 동일하게 해석되어야 한다.

### 2. 공식 전역 CSS 생성

`src/app/styles/globals.css`를 만들고 Tailwind 3 기준 directive를 이 파일 한 곳에 둔다.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`@layer base` 안에는 다음만 둔다.

- shadcn semantic CSS variables
- `html`, `body`, `#root`의 최소 높이
- body의 배경, 전경, font-family, antialiasing
- 필요하면 `* { @apply border-border; }`

현재 UI와 일치하도록 기존 token 값을 semantic token으로 옮긴다. 신규 canonical token 이름은 다음을 사용한다.

```text
--background
--foreground
--card
--card-foreground
--popover
--popover-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--destructive
--destructive-foreground
--border
--input
--ring
--radius
--success
--success-foreground
--warning
--warning-foreground
--chart-1 ... --chart-5
```

이 Phase에서는 기존 `--color-*`, `--kds-ui-*`를 삭제하지 않는다. legacy 화면이 계속 사용하기 때문이다.

### 3. Tailwind config를 canonical token에 연결

`tailwind.config.js`의 색상과 radius를 위 canonical token에 연결한다.

현재 `hslVar` helper가 alpha placeholder를 올바르게 지원하도록 다음 형태를 사용한다.

```js
const hslVar = (name) => `hsl(var(${name}) / <alpha-value>)`;
```

기존 `corePlugins.preflight = false`는 그대로 유지한다.

`success`, `warning`, `chart` token도 Tailwind theme에 등록한다.

### 4. feature 내부 Tailwind directive 제거

`src/features/kds/stats/dashboard/statsDashboard.css`에서 다음을 제거한다.

```css
@tailwind utilities;
```

이 파일의 scoped reset과 나머지 CSS는 아직 유지한다. Tailwind directive는 `globals.css`에만 존재해야 한다.

### 5. 전역 import 순서 변경

`src/main.tsx`의 import 순서를 다음 의미로 맞춘다.

1. React/Vite 코드
2. 임시 Ant Design reset
3. 기존 `styles.css`
4. 새 `app/styles/globals.css`
5. App import

Tailwind utilities가 legacy CSS 뒤에 생성되어 신규 utility가 불필요하게 밀리지 않도록 `globals.css`를 기존 `styles.css` 다음에 import한다.

### 6. shadcn 설정 수정

`components.json`에서 Tailwind CSS 경로를 다음으로 변경한다.

```json
"css": "src/app/styles/globals.css"
```

alias 값은 최종 구조와 맞도록 `@/components`, `@/components/ui`, `@/lib` 형태로 정상 동작하게 유지한다.

### 7. 기존 shadcn 컴포넌트 검증

`components/ui`의 `Button`, `Input`, `Card`, `Popover`, `Calendar`, `Chart`, `Badge`가 canonical token으로 정상 렌더링되는지 확인한다.

legacy token을 신규 shadcn 컴포넌트에 직접 참조시키지 않는다.

## 수정 금지

- preflight 활성화
- `styles.css`, `base.css`, `tokens.css` 삭제
- 기존 feature CSS 대규모 변환
- Ant Design 삭제
- Tailwind 4 업그레이드
- 신규 `.kds-*` selector 추가
- `globals.css`에 feature-specific selector 추가

## 검증

```bash
rg -n '@tailwind' src --glob '*.css'
```

결과는 `globals.css`의 세 directive만 존재해야 한다.

```bash
npm run check
```

추가 확인:

- 기존 전체 화면이 Phase 01 기준과 동일하게 표시됨
- shadcn Button/Input/Card가 깨지지 않음
- Tailwind arbitrary class와 responsive class가 build 결과에 포함됨

## 완료 조건

- `src/app/styles/globals.css`가 공식 Tailwind 진입점이다.
- `components.json`이 새 CSS를 가리킨다.
- `@/` alias가 typecheck와 Vite build에서 동작한다.
- feature CSS에 `@tailwind` directive가 없다.
- preflight는 아직 false다.
- 기존 legacy CSS는 유지되어 회귀가 없다.
- `npm run check`가 통과한다.

## 완료 기록

```text
상태:
완료 일시:
Git commit:
추가한 dependency:
npm run check:
수정 파일:
시각 회귀:
blocker:
```

완료 후 `overview.md`의 Phase 02 상태를 `DONE`으로 변경한다.
