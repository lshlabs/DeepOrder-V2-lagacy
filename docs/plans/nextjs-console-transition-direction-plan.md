작업 기록: 기존 Jinja2 콘솔을 별도 React/Next 콘솔로 분리할지 방향을 정리할 때 만든 초기 전환 방향 문서.

아래는 그대로 `README.md`, `docs/frontend-migration-plan.md`, 또는 작업 노트에 붙여 넣을 수 있는 형태로 정리한 문서야.

---

# Menu Management Console 전환 작업 방향 정리

## 1. 현재 프로젝트 구성

현재 DeepOrder 관련 프로젝트는 크게 4개의 구성요소로 나뉜다.

```txt
DeepOrder_V2/
├─ deeporder-backend/
│  └─ 실제 주문 처리 백엔드
│
├─ mock-delivery-api/
│  └─ 모의 배달 플랫폼 API 서버
│
├─ kds-web/
│  └─ 주방 디스플레이 화면
│
└─ menu-management-console/
   └─ 메뉴 관리용 관리자 콘솔 UI
```

각 프로젝트의 역할은 다음과 같다.

---

## 2. 각 프로젝트의 역할

### 2.1 KDS Web

```txt
프로젝트명: kds-web
핵심 프레임워크: React, Vite
언어: TypeScript
역할: 주방 디스플레이 화면
```

`kds-web`은 주방에서 주문 상태와 조리 요청사항 분석 결과를 확인하기 위한 클라이언트 사이드 웹 애플리케이션이다.

역할은 명확히 **주방 화면 표시**에 한정한다.

```txt
담당 역할
- 주문 목록 표시
- 주문 상태 표시
- 조리 요청사항 분석 결과 표시
- 주방 작업자가 보는 화면 제공
```

`kds-web`은 메뉴 관리 기능이나 Mock Delivery API의 관리 콘솔 역할을 맡지 않는다.

---

### 2.2 Mock Delivery API

```txt
프로젝트명: mock-delivery-api
핵심 프레임워크: FastAPI
언어: Python
DB / ORM: SQLite, SQLAlchemy
검증: Pydantic
기존 화면: Jinja2 + Vanilla JS
역할: 모의 배달 플랫폼 API 서버
```

`mock-delivery-api`는 단순한 화면 서버가 아니라, 외부 배달 플랫폼을 흉내 내는 API 서버이다.

현재 주요 역할은 다음과 같다.

```txt
담당 역할
- Store/Menu/Option 데이터 관리
- SQLite 데이터베이스 관리
- SQLAlchemy 기반 모델 관리
- Pydantic 기반 요청/응답 검증
- Gemini 기반 샘플 주문 생성
- DeepOrder 백엔드로 주문 Webhook 전송
- API 문서 제공
```

따라서 `mock-delivery-api`는 유지한다.

다만 기존에 포함되어 있던 Jinja2 기반 `/console` 화면은 최종적으로 사용하지 않는 방향으로 간다.

---

### 2.3 기존 Jinja2 Console

```txt
위치: mock-delivery-api 내부
기술: Jinja2, Vanilla JS, CSS
역할: 기존 메뉴 관리 콘솔 화면
```

기존 `/console`은 FastAPI 서버 내부에서 HTML을 직접 렌더링하는 방식이다.

현재 구조는 다음과 같다.

```txt
Browser
↓
FastAPI /console
↓
Jinja2 Template Rendering
↓
HTML + Vanilla JS + CSS
```

이 방식은 단순한 콘솔 화면에는 충분하지만, 모던한 관리자 UI/UX를 구성하기에는 한계가 있다.

따라서 최종적으로는 Jinja2 콘솔을 제거하거나 비활성화하고, Next.js 기반 콘솔로 대체한다.

---

### 2.4 Menu Management Console

```txt
프로젝트명: menu-management-console
핵심 프레임워크: Next.js, React
언어: TypeScript
UI: shadcn/ui, Tailwind CSS
역할: 메뉴 관리용 관리자 콘솔
```

`menu-management-console`은 기존 `mock-delivery-api` 내부의 Jinja2 콘솔을 대체하기 위한 별도 프론트엔드 프로젝트이다.

현재는 인메모리 mock API 또는 가짜 데이터를 기반으로 화면만 그리는 상태이다.

향후 목표는 다음과 같다.

```txt
목표 역할
- Store 관리
- Menu 관리
- Option 관리
- Gemini 샘플 주문 생성 요청
- 생성된 주문 Webhook 전송 요청
- mock-delivery-api의 실제 데이터를 사용하는 관리자 UI
```

즉, `menu-management-console`은 FastAPI를 대체하는 것이 아니라, **FastAPI의 관리 화면만 대체하는 프론트엔드**이다.

---

# 3. 핵심 방향성

## 잘못된 방향

이번 작업을 다음처럼 이해하면 안 된다.

```txt
FastAPI를 버리고 Next.js로 전체 백엔드를 갈아엎는다.
```

이 경우 다음 작업이 필요해진다.

```txt
SQLAlchemy → Prisma 또는 Drizzle로 재작성
Pydantic → Zod로 재작성
FastAPI Router → Next.js Route Handler로 재작성
Python Gemini 로직 → TypeScript Gemini 로직으로 재작성
Webhook 로직 → TypeScript로 재작성
Swagger 문서 → 별도 문서화 필요
```

이는 단순한 UI 개선이 아니라 백엔드 전체 재작성에 가깝다.

현재 프로젝트에서는 이득보다 손해가 크다.

---

## 올바른 방향

이번 작업의 올바른 방향은 다음과 같다.

```txt
FastAPI는 API 서버로 유지한다.
Jinja2 콘솔만 Next.js 콘솔로 대체한다.
```

최종 구조는 다음과 같다.

```txt
Browser
↓
Next.js Menu Management Console
↓
FastAPI REST API
↓
SQLite / SQLAlchemy / Gemini / Webhook
```

즉, FastAPI는 JSON API 서버로 남고, Next.js가 화면을 담당한다.

---

# 4. 최종 목표 구조

## 현재 구조

```txt
mock-delivery-api
├─ FastAPI API
├─ SQLite
├─ SQLAlchemy
├─ Pydantic
├─ Gemini 주문 생성
├─ Webhook 전송
└─ Jinja2 Console
```

## 목표 구조

```txt
mock-delivery-api
├─ FastAPI REST API
├─ SQLite
├─ SQLAlchemy
├─ Pydantic
├─ Gemini 주문 생성
└─ Webhook 전송

menu-management-console
├─ Next.js
├─ React
├─ TypeScript
├─ shadcn/ui
├─ Tailwind CSS
└─ FastAPI REST API 호출
```

최종적으로는 다음과 같이 정리한다.

```txt
Jinja2 Console ❌
Vanilla JS Console ❌
FastAPI REST API ✅
Next.js Admin Console ✅
```

---

# 5. 역할 경계

각 프로젝트의 역할을 명확히 분리한다.

```txt
deeporder-backend
→ 실제 주문 처리 백엔드

mock-delivery-api
→ 모의 배달 플랫폼 API 서버

menu-management-console
→ 모의 배달 플랫폼의 메뉴 관리 콘솔

kds-web
→ 주방 디스플레이 화면
```

더 구체적으로는 다음과 같다.

```txt
mock-delivery-api
- 데이터 저장
- 메뉴 API 제공
- 샘플 주문 생성
- Webhook 발송

menu-management-console
- 관리자 화면 제공
- Store/Menu/Option 관리 UI 제공
- FastAPI API 호출

kds-web
- 주방 작업자용 주문 화면 제공

deeporder-backend
- 실제 주문 수신
- 주문 상태 관리
- 조리 요청사항 분석
```

---

# 6. 작업 원칙

## 원칙 1. FastAPI는 유지한다

`mock-delivery-api`는 계속 API 서버로 유지한다.

이 프로젝트의 핵심은 외부 배달 플랫폼을 흉내 내는 것이다.

따라서 FastAPI는 다음 역할을 계속 담당한다.

```txt
- REST API 제공
- DB 접근
- Gemini 주문 생성
- Webhook 전송
- API 문서 제공
```

---

## 원칙 2. Next.js는 관리자 UI만 담당한다

`menu-management-console`은 백엔드 서버가 아니라 관리자 콘솔 프론트엔드로 둔다.

```txt
Next.js가 담당할 것
- 화면 구성
- 폼
- 테이블
- 드래그 앤 드롭
- 토스트 알림
- 사용자 경험
- FastAPI 호출
```

Next.js가 직접 SQLite에 접근하지 않는다.

```txt
비추천
Next.js → SQLite 직접 접근

추천
Next.js → FastAPI REST API → SQLite
```

---

## 원칙 3. Jinja2는 점진적으로 제거한다

처음부터 Jinja2를 바로 삭제하지 않는다.

초기에는 기존 콘솔을 유지한다.

```txt
/console
→ 기존 Jinja2 콘솔, 임시 유지

menu-management-console
→ 신규 Next.js 콘솔
```

Next.js 콘솔이 충분히 동작하면 그때 Jinja2 관련 코드를 제거한다.

삭제 후보는 다음과 같다.

```txt
- templates/
- static/console 관련 파일
- Jinja2Templates 설정
- /console 라우터
- 콘솔 전용 Vanilla JS
- 콘솔 전용 CSS
```

---

# 7. 작업 순서

## Step 1. 기존 FastAPI API 확인

먼저 `mock-delivery-api`에 어떤 API가 있는지 확인한다.

확인 대상:

```txt
- Store 목록 조회
- Store 생성/수정/삭제
- Menu 목록 조회
- Menu 생성/수정/삭제
- Option 목록 조회
- Option 생성/수정/삭제
- 샘플 주문 생성
- Webhook 전송
```

Swagger에서 확인한다.

```txt
http://localhost:8001/docs
```

---

## Step 2. Next.js에서 사용할 REST API 정리

Next.js 콘솔이 사용할 API를 명확히 정리한다.

예상 API 구조는 다음과 같다.

```txt
GET    /api/stores
POST   /api/stores
GET    /api/stores/{store_id}
PUT    /api/stores/{store_id}
DELETE /api/stores/{store_id}

GET    /api/stores/{store_id}/menus
POST   /api/stores/{store_id}/menus

GET    /api/menus/{menu_id}
PUT    /api/menus/{menu_id}
DELETE /api/menus/{menu_id}

GET    /api/menus/{menu_id}/options
POST   /api/menus/{menu_id}/options

PUT    /api/options/{option_id}
DELETE /api/options/{option_id}

POST   /api/sample-orders/generate
POST   /api/sample-orders/send-webhook
```

API가 이미 있으면 그대로 사용한다.

없거나 Jinja2 콘솔에 종속되어 있으면 JSON API로 분리한다.

---

## Step 3. FastAPI CORS 설정

Next.js와 FastAPI는 서로 다른 포트에서 실행될 가능성이 높다.

예상 실행 포트:

```txt
FastAPI mock-delivery-api: http://127.0.0.1:8001
Next.js menu-management-console: http://127.0.0.1:3000
```

따라서 FastAPI에 CORS 설정을 추가한다.

```py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 4. Next.js 환경변수 설정

`menu-management-console`에 FastAPI 주소를 환경변수로 설정한다.

`.env.local`

```env
NEXT_PUBLIC_MOCK_DELIVERY_API_URL=http://127.0.0.1:8001
```

이후 Next.js에서는 이 값을 기준으로 API를 호출한다.

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_MOCK_DELIVERY_API_URL;
```

---

## Step 5. Next.js의 mock data layer 찾기

현재 `menu-management-console`은 인메모리 가짜 데이터를 사용하고 있다.

먼저 다음 파일들을 찾는다.

```txt
- mock-data.ts
- data.ts
- api.ts
- store.ts
- actions.ts
- lib/api.ts
- app/api/*
```

목표는 UI 컴포넌트를 최대한 유지하고, 데이터 공급원만 교체하는 것이다.

기존 구조 예시:

```ts
export async function getStores() {
  return mockStores;
}
```

변경 후:

```ts
export async function getStores() {
  const res = await fetch(`${API_BASE_URL}/api/stores`);

  if (!res.ok) {
    throw new Error("매장 목록을 불러오지 못했습니다.");
  }

  return res.json();
}
```

---

## Step 6. Store 목록부터 연결

처음부터 모든 기능을 연결하지 않는다.

가장 먼저 Store 목록 조회만 연결한다.

```txt
1차 연결 목표
- Next.js 화면에서 실제 FastAPI Store 목록 조회
```

이 단계가 성공하면 다음으로 넘어간다.

---

## Step 7. Menu 목록 연결

Store 목록이 연결되면, 특정 Store의 Menu 목록을 연결한다.

```txt
2차 연결 목표
- Store 선택
- 해당 Store의 Menu 목록 조회
```

---

## Step 8. 생성/수정/삭제 연결

조회가 안정화된 뒤에 생성, 수정, 삭제를 연결한다.

권장 순서:

```txt
1. Store 조회
2. Menu 조회
3. Option 조회
4. Store 생성/수정/삭제
5. Menu 생성/수정/삭제
6. Option 생성/수정/삭제
```

이 순서로 가야 문제 발생 지점을 좁히기 쉽다.

---

## Step 9. Gemini 샘플 주문 생성 연결

메뉴 데이터 관리가 연결된 뒤에 샘플 주문 생성 기능을 붙인다.

```txt
Next.js Console
↓
POST /api/sample-orders/generate
↓
FastAPI
↓
Gemini
↓
샘플 주문 생성
```

이 기능은 Python/FastAPI 쪽에 남겨둔다.

Next.js는 요청 버튼과 결과 표시만 담당한다.

---

## Step 10. Webhook 전송 기능 연결

마지막으로 생성된 샘플 주문을 DeepOrder 백엔드로 전송하는 기능을 연결한다.

```txt
Next.js Console
↓
POST /api/sample-orders/send-webhook
↓
FastAPI
↓
DeepOrder Backend
```

Next.js는 직접 DeepOrder 백엔드에 주문을 쏘지 않는다.

Webhook 발송 책임은 `mock-delivery-api`에 둔다.

---

# 8. 실행 구조

개발 중에는 다음처럼 실행한다.

```txt
터미널 1: deeporder-backend
포트: 8000

터미널 2: mock-delivery-api
포트: 8001

터미널 3: kds-web
포트: 5173

터미널 4: menu-management-console
포트: 3000 또는 3001
```

예상 실행 구조:

```txt
KDS Web
http://127.0.0.1:5173

Mock Delivery API
http://127.0.0.1:8001

Menu Management Console
http://127.0.0.1:3000

DeepOrder Backend
http://127.0.0.1:8000
```

---

# 9. Next.js API Route 사용 여부

## 기본 방향

처음에는 Next.js API Route를 사용하지 않고, 브라우저에서 FastAPI를 직접 호출한다.

```txt
Browser
↓
Next.js UI
↓
FastAPI REST API
```

장점:

```txt
- 구조가 단순하다
- 디버깅이 쉽다
- 프론트/백 역할이 명확하다
- 포트폴리오 설명이 쉽다
```

---

## 나중에 필요한 경우

추후 인증, 프록시, API 주소 숨김이 필요하면 Next.js API Route를 중간에 둘 수 있다.

```txt
Browser
↓
Next.js API Route
↓
FastAPI REST API
```

하지만 현재 단계에서는 오히려 복잡도를 높인다.

따라서 우선은 직접 호출 방식으로 간다.

---

# 10. README 표현 방식

포트폴리오나 README에서는 다음처럼 설명한다.

## 추천 표현

```md
기존 `mock-delivery-api` 내부의 Jinja2 기반 관리 콘솔을
Next.js, shadcn/ui, Tailwind CSS 기반의 별도 Menu Management Console로 분리했습니다.

FastAPI 서버는 모의 배달 플랫폼 API 역할을 유지하며,
Next.js 콘솔은 FastAPI의 REST API를 호출해 Store/Menu/Option 데이터를 관리합니다.
```

또는:

```md
FastAPI는 모의 배달 플랫폼의 API 서버로 유지하고,
관리자 UI는 Next.js 기반 프론트엔드로 분리하여
역할 분리와 UI/UX 개선을 진행했습니다.
```

---

## 피해야 할 표현

```md
FastAPI를 Next.js로 대체했습니다.
```

이 표현은 부정확하다.

API 서버를 프론트엔드 프레임워크로 대체했다는 오해를 줄 수 있다.

더 정확한 표현은 다음과 같다.

```md
FastAPI 내부의 Jinja2 관리 콘솔을 Next.js 기반 별도 관리자 UI로 대체했습니다.
```

---

# 11. 최종 정리

이번 작업의 핵심은 다음과 같다.

```txt
FastAPI를 버리는 작업이 아니다.
Jinja2 콘솔을 Next.js 콘솔로 교체하는 작업이다.
```

최종 방향:

```txt
FastAPI
→ API 서버로 유지

Jinja2
→ 점진적으로 제거

Next.js
→ 관리자 콘솔 UI로 사용

KDS Web
→ 주방 화면으로 유지

DeepOrder Backend
→ 실제 주문 처리 백엔드로 유지
```

최종 구조:

```txt
menu-management-console
→ mock-delivery-api REST API 호출
→ Store/Menu/Option 관리
→ 샘플 주문 생성 요청
→ Webhook 전송 요청

mock-delivery-api
→ DB 관리
→ Gemini 주문 생성
→ DeepOrder Backend로 Webhook 발송

kds-web
→ DeepOrder Backend의 주문 상태 표시

deeporder-backend
→ 주문 수신 및 처리
```

한 줄 요약:

> **FastAPI는 모의 배달 플랫폼 API 서버로 살리고, Jinja2 콘솔만 Next.js 기반 Menu Management Console로 교체한다.**

이 방향이 현재 프로젝트 구조를 가장 적게 흔들면서도, UI/UX 개선과 포트폴리오 완성도를 동시에 챙길 수 있는 방식이다.
