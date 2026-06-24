작업 대상:

* 리팩토링 결과: `/Users/mac/Documents/kds-web`
* 원본 프로젝트: `/Users/mac/Documents/DeepOrder_V2/kds-web`

목표는 `kds-web-temp`에서 성공적으로 리팩토링된 KDS UI를 원본 `DeepOrder_V2/kds-web`에 안전하게 이식하는 것이다. 단순 폴더 전체 덮어쓰기는 금지한다.

## 작업 원칙

1. 원본 `kds-web`의 Auth/store context/API 연동 로직은 보존한다.
2. 특히 다음 흐름은 깨지면 안 된다.

   * accessToken / refreshToken 저장 및 자동 로그인
   * `/api/auth/me`
   * `/api/auth/refresh`
   * `/api/auth/logout`
   * `GET /api/kds/orders`
   * `PATCH /api/orders/{id}/status`
   * Authorization Bearer header
   * 승인 대기 사용자는 PendingApprovalPage
   * 승인된 사용자만 KdsPage 진입
3. `VITE_STORE_ID` 또는 `storeId` query 방식은 다시 추가하지 않는다.
4. `kds-web-temp`의 UI 레이아웃, 스타일, KDS 카드 구조만 원본에 선별 적용한다.
5. 원본의 `.env`, `.env.example`, README, package 설정은 변경이 필요한 경우에만 최소 수정한다.

## 작업 순서

1. 임시 위치에 `kds-web-temp`를 clone한다.
2. 원본 `/Users/mac/Documents/DeepOrder_V2/kds-web`와 파일 구조를 비교한다.
3. `src/pages/KdsPage.tsx`, 관련 CSS, 컴포넌트, 타입 파일을 중심으로 변경점을 확인한다.
4. 원본의 Auth/API 함수와 token 처리 로직을 기준으로 유지하면서, temp의 UI 구조를 병합한다.
5. import 경로, 타입명, API 응답 타입이 원본과 맞는지 정리한다.
6. 불필요한 demo/mock/dev-only 코드는 가져오지 않는다.
7. 병합 후 `npm install`이 필요한 의존성 변경이 있는지 확인한다.
8. `npm run typecheck`를 실행한다.
9. 가능하면 `npm run dev`로 화면을 확인한다.

## 반드시 확인할 것

* [ ] 로그인 전 AuthPage가 정상 표시된다.
* [ ] 승인 대기 계정은 PendingApprovalPage로 이동한다.
* [ ] 승인 계정은 KdsPage로 이동한다.
* [ ] KdsPage가 `GET /api/kds/orders`를 호출한다.
* [ ] `storeId` query를 사용하지 않는다.
* [ ] 주문 상태 변경 시 Authorization header가 포함된다.
* [ ] refresh 실패 시 로그아웃 처리된다.
* [ ] KDS UI는 temp repo의 리팩토링 결과처럼 카드 중심으로 표시된다.
* [ ] `npm run typecheck`가 통과한다.

## 주의

전체 파일을 무조건 복사하지 말고, 원본의 최신 Auth/store context 구현을 기준으로 temp의 UI 개선분만 이식해라.
작업 후 변경 파일 목록과 어떤 파일을 병합/수정했는지 요약해라.
