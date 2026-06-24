작업 기록: `kds-web`을 단일 `VITE_STORE_ID` 데모 화면에서 Auth 기반 매장 바인딩 KDS로 전환하기 위한 상세 구현 체크리스트.

# KDS Web Auth / Store Context 구현 체크리스트

## 0. 작업 목적

현재 `kds-web`은 `VITE_STORE_ID` 또는 기본값 `STORE_FLAT` 하나에 묶인 단일 매장 데모 화면이다.

이번 작업의 목표는 다음 구조로 전환하는 것이다.

```text
회원가입
→ 매장 정보 입력
→ 행정안전부 도로명주소 팝업 API로 주소 입력
→ 가입 신청
→ 관리자 승인
→ 로그인
→ 로그인 계정에 연결된 매장의 KDS 화면 진입
```

최종적으로 KDS 주문 조회는 사용자가 `storeId`를 직접 고르거나 env로 주입하는 방식이 아니라, 인증된 사용자와 연결된 `store_id`를 backend가 결정하는 방식으로 바꾼다.

```text
기존:
GET /api/kds/orders?storeId=STORE_FLAT

목표:
GET /api/kds/orders
Authorization: Bearer <accessToken>
```

이번 작업에서는 기존 `storeId` query 방식과 transitional fallback을 남기지 않는다.
KDS 조회는 Auth 기반 `current_user.store_id` 방식으로 바로 전환한다.

---

## 1. 최종 결정 사항

### 1.1 storeId query 즉시 제거

* [x] `GET /api/kds/orders?storeId=...` 방식은 제거한다.
* [x] `GET /api/kds/orders`는 반드시 인증된 사용자 기준으로 동작한다.
* [x] backend는 token에서 `current_user`를 찾고, `current_user.store_id` 기준으로 주문을 조회한다.
* [x] 로컬 테스트는 승인된 seed user/store를 사용한다.
* [x] `VITE_STORE_ID`는 제거한다.

목표 구조:

```text
GET /api/kds/orders
Authorization: Bearer <accessToken>

backend:
accessToken → user_id → user.store_id → 해당 store 주문 조회
```

---

### 1.2 accessToken + refreshToken 방식 사용

자동 로그인과 로그아웃을 구현하기 위해 accessToken과 refreshToken을 함께 사용한다.

```text
accessToken:
- API 요청 인증용
- 비교적 짧은 만료 시간

refreshToken:
- 자동 로그인
- accessToken 재발급
- logout 시 서버에서 revoke
```

초기 정책:

```text
accessToken 만료: 2시간
refreshToken 만료: 14일
```

운영 확장 시 고려:

```text
- refresh token rotation
- HttpOnly Secure Cookie
- device/session 관리
```

이번 v1에서는 다음까지만 구현한다.

```text
- refresh token 발급
- refresh token hash 저장
- accessToken 재발급
- logout 시 refresh token revoke
```

---

### 1.3 Admin API 최소 보호 정책

관리자 승인 화면은 `mock-delivery-console`에 추가한다.

다만 Admin API를 완전 무인증으로 열어두지 않는다.

초기 최소 보호 정책:

```text
X-Admin-Token 헤더 기반 보호
```

환경변수:

```text
ADMIN_TOKEN=...
```

Admin API 요청 예시:

```text
GET /api/admin/users
X-Admin-Token: <ADMIN_TOKEN>
```

이번 단계에서는 별도 admin 로그인은 구현하지 않는다.

추후 확장:

```text
- ADMIN 계정 로그인
- role=ADMIN 기반 권한 검증
- admin audit log
```

---

### 1.4 작업 순서 조정

주소 API보다 Auth/승인/KDS 접근 제어를 먼저 구현한다.

최종 작업 순서:

```text
1. Backend User / Store / Auth 모델
2. Auth API + access/refresh token
3. Admin approval API + X-Admin-Token 보호
4. KDS API Auth 기반 전환
5. kds-web AuthPage / PendingApprovalPage / KdsPage 진입 제어
6. mock-delivery-console 회원 관리 탭
7. 행정안전부 도로명주소 팝업 API 연동
8. KDS UI 개편
9. mock 주문 현실감 개선
10. 테스트 및 문서 정리
```

---

## 2. 현재 코드 기준 고정점

* [x] `kds-web/src/main.tsx`에서 `STORE_ID` 상수를 제거한다.
* [x] `kds-web/src/main.tsx`의 `GET /api/kds/orders?storeId=...` 호출을 제거한다.
* [x] `kds-web/.env.example`의 `VITE_STORE_ID=STORE_FLAT`를 제거한다.
* [x] `kds-web/README.md`의 `STORE_FLAT` 기반 설명을 Auth 기반 흐름으로 갱신한다.
* [x] `deeporder-backend/app/routers/kds_orders.py`의 `storeId` query 의존을 제거한다.
* [x] `deeporder-backend/app/routers/order_status.py`에 `order.store_id == current_user.store_id` 검증을 추가한다.
* [x] `mock-delivery-console/src/App.tsx`에 `회원 관리` 라우트를 추가한다.
* [x] `mock-delivery-console/src/components/app-sidebar.tsx`에 `회원 관리` 네비게이션 항목을 추가한다.

---

## 3. 작업 원칙

* [x] 초기 버전은 `User 1명 -> Store 1개` 구조로 구현한다.
* [x] 다매장 전환 UI는 이번 구현 범위에서 제외한다.
* [x] `selectedStoreId` localStorage 방식은 사용하지 않는다.
* [x] KDS의 store context는 backend의 `current_user.store_id`가 결정한다.
* [x] `mock-delivery-api`는 외부 배달 플랫폼 mock 역할을 유지한다.
* [x] 관리자 승인은 별도 admin 프로젝트를 만들지 않고 `mock-delivery-console`에 추가한다.
* [x] Admin API는 `X-Admin-Token`으로 최소 보호한다.
* [x] 주소 API 승인키는 코드에 커밋하지 않는다.
* [x] `ADMIN_TOKEN`, `JUSO_CONFIRM_KEY`, JWT secret은 `.env`로 관리한다.
* [x] 기존 mock 주문 생성 -> webhook 전송 -> backend 저장 흐름은 유지한다.

---

## 4. Phase 1. Backend User / Store / Auth 모델 추가

### 4.1 모델 추가

* [x] `deeporder-backend/app/models.py`에 `UserRole` enum을 추가한다.
* [x] `deeporder-backend/app/models.py`에 `ApprovalStatus` enum을 추가한다.
* [x] `deeporder-backend/app/models.py`에 `Store` 모델을 추가한다.
* [x] `deeporder-backend/app/models.py`에 `User` 모델을 추가한다.
* [x] `deeporder-backend/app/models.py`에 `RefreshToken` 모델을 추가한다.
* [x] `User.store_id`는 초기 버전에서 `Store.store_id`를 참조한다.
* [x] `Order.store_id`와 `Store.store_id` 값이 같은 문자열 체계를 쓰도록 한다.

권장 필드:

```text
User
- id
- email
- password_hash
- name
- role
- approval_status
- store_id
- created_at
- updated_at

Store
- id
- store_id
- store_name
- phone
- zip_no
- road_address
- jibun_address
- address_detail
- approval_status
- created_at
- updated_at

RefreshToken
- id
- user_id
- token_hash
- expires_at
- revoked_at
- created_at
```

### 4.2 스키마 추가

* [x] `deeporder-backend/app/schemas.py`에 `RegisterRequest`를 추가한다.
* [x] `deeporder-backend/app/schemas.py`에 `LoginRequest`를 추가한다.
* [x] `deeporder-backend/app/schemas.py`에 `AuthResponse`를 추가한다.
* [x] `deeporder-backend/app/schemas.py`에 `RefreshRequest`를 추가한다.
* [x] `deeporder-backend/app/schemas.py`에 `LogoutRequest`를 추가한다.
* [x] `deeporder-backend/app/schemas.py`에 `CurrentUserResponse`를 추가한다.
* [x] `deeporder-backend/app/schemas.py`에 `AdminUserOut`을 추가한다.
* [x] `deeporder-backend/app/schemas.py`에 `UpdateApprovalStatusIn`을 추가한다.

### 4.3 작업 기록

* [x] `Store`, `User`, `RefreshToken` 테이블을 기존 주문 테이블과 분리된 방식으로 추가했다.
* [x] `User.store_id -> Store.store_id` 관계와 `User -> RefreshToken` 관계를 ORM 관계로 연결했다.
* [x] Auth/Approval 관련 request/response 스키마를 추가했다.
* [x] `deeporder-backend/tests/test_auth_models.py`를 추가해 모델 저장과 스키마 검증을 고정했다.

---

## 5. Phase 2. Backend Auth API 추가

### 5.1 인증 유틸

권장 파일:

```text
deeporder-backend/app/auth.py
```

* [x] 비밀번호 hash helper를 추가한다.
* [x] 비밀번호 verify helper를 추가한다.
* [x] accessToken 생성 helper를 추가한다.
* [x] refreshToken 생성 helper를 추가한다.
* [x] refreshToken hash helper를 추가한다.
* [x] bearer token에서 current user를 찾는 dependency를 추가한다.
* [x] 승인된 store owner만 통과시키는 dependency를 추가한다.
* [x] admin token 검증 dependency를 추가한다.

JWT payload는 최소화한다.

```text
accessToken payload:
- sub = user_id
- exp = 만료시간
```

`store_id`, `approval_status`, `role`은 토큰에 과하게 넣지 않고 요청 시 DB에서 확인한다.

---

### 5.2 Auth router

* [x] `deeporder-backend/app/routers/auth.py`를 추가한다.
* [x] `POST /api/auth/register`를 추가한다.
* [x] `POST /api/auth/login`을 추가한다.
* [x] `POST /api/auth/refresh`를 추가한다.
* [x] `POST /api/auth/logout`를 추가한다.
* [x] `GET /api/auth/me`를 추가한다.
* [x] router를 앱에 연결한다.

회원가입 처리:

* [x] email 중복을 막는다.
* [x] store row를 생성한다.
* [x] user row를 생성한다.
* [x] 가입 직후 `approval_status=PENDING_APPROVAL`로 저장한다.
* [x] 가입 직후 token은 주지 않는다.
* [x] 회원가입 성공 응답에는 승인 대기 상태와 store 정보를 내려준다.

로그인 처리:

* [x] email/password를 검증한다.
* [x] user와 store 정보를 함께 내려준다.
* [x] accessToken을 내려준다.
* [x] refreshToken을 내려준다.
* [x] refreshToken은 hash로 DB에 저장한다.
* [x] 승인 상태가 `PENDING_APPROVAL`이어도 로그인은 허용하되 KDS API는 막는다.

refresh 처리:

* [x] refreshToken을 입력받는다.
* [x] hash로 DB에서 유효한 refreshToken을 찾는다.
* [x] `revoked_at is null`인지 확인한다.
* [x] `expires_at`이 지나지 않았는지 확인한다.
* [x] 유효하면 새 accessToken을 발급한다.
* [x] v1에서는 refresh token rotation은 하지 않아도 된다.

logout 처리:

* [x] refreshToken을 입력받는다.
* [x] 해당 refreshToken hash를 찾아 `revoked_at`을 설정한다.
* [x] frontend는 accessToken과 refreshToken을 삭제한다.

### 5.3 작업 기록

* [x] `deeporder-backend/app/auth.py`를 추가해 password hash/verify, access token, refresh token, bearer dependency, admin token dependency를 구현했다.
* [x] `deeporder-backend/app/routers/auth.py`를 추가해 register/login/refresh/logout/me 엔드포인트를 구현했다.
* [x] `deeporder-backend/app/config.py`에 `jwt_secret_key`, `access_token_expire_minutes`, `refresh_token_expire_days`, `admin_token` 설정을 추가했다.
* [x] `deeporder-backend/tests/test_auth_api.py`를 추가해 register, duplicate email, login, me, refresh, logout, revoked refreshToken 흐름을 검증했다.

---

## 6. Phase 3. Admin Approval API 추가

권장 파일:

```text
deeporder-backend/app/routers/admin_users.py
```

* [x] `GET /api/admin/users`를 추가한다.
* [x] `GET /api/admin/users?status=PENDING_APPROVAL` 필터를 지원한다.
* [x] `PATCH /api/admin/users/{user_id}/approval`을 추가한다.
* [x] `X-Admin-Token` 검증 dependency를 적용한다.
* [x] 승인 상태는 `APPROVED`, `REJECTED`로 변경 가능하게 한다.
* [x] 승인 시 user와 store의 approval 상태를 함께 정리한다.
* [x] 거절 시 user와 store의 approval 상태를 함께 정리한다.

초기 정책:

```text
mock-delivery-console은 관리자 도구로 간주한다.
Admin API는 X-Admin-Token으로 최소 보호한다.
별도 admin auth는 추후 Phase로 남긴다.
```

### 6.1 작업 기록

* [x] `deeporder-backend/app/routers/admin_users.py`를 추가해 관리자 사용자 목록 조회와 승인 상태 변경 API를 구현했다.
* [x] `status` query를 `PENDING_APPROVAL`, `APPROVED`, `REJECTED` enum 필터와 연결했다.
* [x] 승인/거절 시 `User.approval_status`와 연결된 `Store.approval_status`를 같은 값으로 함께 갱신하도록 정리했다.
* [x] 라우터에 `require_admin_token` dependency를 적용해 `X-Admin-Token`이 없는 요청을 차단했다.
* [x] `deeporder-backend/tests/test_admin_users_api.py`를 추가해 토큰 보호, 목록 필터, user/store 동시 승인 상태 갱신을 검증했다.

---

## 7. Phase 4. KDS API Auth 기반 전환

### 7.1 주문 조회 API 변경

* [x] `deeporder-backend/app/routers/kds_orders.py`의 `storeId` query 의존을 제거한다.
* [x] `current_user` dependency를 적용한다.
* [x] `current_user.approval_status == APPROVED`가 아니면 403을 반환한다.
* [x] `current_user.store_id` 기준으로 주문을 조회한다.
* [x] 응답 모델은 기존 `KdsOrdersResponse`를 유지하거나 KDS View Model로 확장한다.
* [x] 비로그인 요청은 401을 반환한다.

목표:

```text
GET /api/kds/orders
Authorization: Bearer <accessToken>
```

---

### 7.2 상태 변경 API 변경

* [x] `deeporder-backend/app/routers/order_status.py`에 current user dependency를 적용한다.
* [x] 비로그인 요청은 401을 반환한다.
* [x] 승인되지 않은 사용자는 403을 반환한다.
* [x] 주문이 없으면 기존처럼 404를 반환한다.
* [x] 주문의 `store_id`가 current user의 `store_id`와 다르면 403을 반환한다.
* [x] store 검증을 통과한 경우에만 상태를 변경한다.

목표:

```text
PATCH /api/orders/{order_id}/status
Authorization: Bearer <accessToken>
```

### 7.3 작업 기록

* [x] `deeporder-backend/app/routers/kds_orders.py`를 Auth 기반으로 전환해 `storeId` query 없이 `current_user.store_id`로만 주문을 조회하게 했다.
* [x] `deeporder-backend/app/routers/order_status.py`에 승인된 사용자 dependency와 같은 매장 주문 검증을 추가했다.
* [x] `deeporder-backend/tests/test_kds_auth_api.py`를 추가해 401, 403, 승인 후 조회, 다른 매장 주문 상태 변경 차단을 검증했다.
* [x] `deeporder-backend/tests/test_order_webhook.py`를 갱신해 webhook -> KDS -> 상태 변경 흐름이 승인된 로그인 사용자 기준으로 동작하는지 검증했다.

---

## 8. Phase 5. kds-web Auth 화면 추가

### 8.1 구조 분리

* [x] `kds-web/src/main.tsx`에서 모든 화면을 한 파일에 둔 구조를 분리한다.
* [x] `kds-web/src/App.tsx`를 추가한다.
* [x] `kds-web/src/pages/AuthPage.tsx`를 추가한다.
* [x] `kds-web/src/pages/PendingApprovalPage.tsx`를 추가한다.
* [x] `kds-web/src/pages/KdsPage.tsx`를 추가한다.
* [x] `kds-web/src/lib/api.ts`를 추가한다.
* [x] `kds-web/src/lib/auth.ts`를 추가한다.
* [x] `kds-web/src/types.ts`를 추가한다.

렌더링 규칙:

```text
accessToken 없음
→ AuthPage

accessToken 있음 + accessToken 유효
→ /api/auth/me 조회

approvalStatus=PENDING_APPROVAL
→ PendingApprovalPage

approvalStatus=APPROVED
→ KdsPage
```

---

### 8.2 토큰 저장 및 자동 로그인

초기 구현에서는 단순성을 위해 `localStorage`를 사용한다.

```text
localStorage:
- deeporder.accessToken
- deeporder.refreshToken
```

앱 시작 시 자동 로그인 흐름:

```text
1. accessToken이 있으면 /api/auth/me 호출
2. 성공하면 user/store 상태 복원
3. accessToken 만료 또는 401이면 refreshToken으로 /api/auth/refresh 호출
4. refresh 성공 시 새 accessToken 저장 후 /api/auth/me 재시도
5. refresh 실패 시 token 삭제 후 AuthPage 표시
```

로그아웃 흐름:

```text
1. /api/auth/logout 호출
2. refreshToken revoke
3. localStorage의 accessToken, refreshToken 삭제
4. AuthPage로 이동
```

운영 개선 사항은 문서화만 한다.

```text
운영 환경에서는 refreshToken을 HttpOnly Secure Cookie로 전환하고,
refresh token rotation 및 device/session 관리를 추가할 수 있다.
```

---

### 8.3 로그인 폼

* [x] 이메일 입력을 추가한다.
* [x] 비밀번호 입력을 추가한다.
* [x] 로그인 버튼을 추가한다.
* [x] 로그인 성공 시 accessToken과 refreshToken을 저장한다.
* [x] 로그인 성공 시 user/store 상태를 반영한다.
* [x] 실패 시 사용자에게 오류를 보여준다.

---

### 8.4 회원가입 폼

* [x] 사용자 이름 입력을 추가한다.
* [x] 이메일 입력을 추가한다.
* [x] 비밀번호 입력을 추가한다.
* [x] 매장명 입력을 추가한다.
* [x] 매장 연락처 입력을 추가한다.
* [x] 주소검색 버튼을 추가한다.
* [x] 우편번호, 도로명주소, 지번주소, 상세주소를 폼에 반영한다.
* [x] 회원가입 성공 시 승인 대기 상태를 보여준다.

### 8.5 작업 기록

* [x] `kds-web`을 `App/AuthPage/PendingApprovalPage/KdsPage/lib/types` 구조로 분리해 단일 `main.tsx` 구조를 해소했다.
* [x] `localStorage`에 `deeporder.accessToken`, `deeporder.refreshToken`을 저장하고 앱 시작 시 `/api/auth/me` 또는 `/api/auth/refresh`로 세션을 복원하도록 구현했다.
* [x] `AuthPage`에 로그인/가입 신청 탭과 오류 배너, 가입 신청 후 승인 대기 화면 전환을 추가했다.
* [x] `PendingApprovalPage`에 승인 상태 재확인과 로그아웃 흐름을 추가했다.
* [x] `KdsPage`에서 더 이상 `storeId`를 직접 넘기지 않고 인증 토큰 기반 주문 조회/상태 변경만 수행하도록 전환했다.
* [x] `kds-web/.env.example`, `kds-web/README.md`를 Auth 기반 구조에 맞게 갱신했다.

---

## 9. Phase 6. mock-delivery-console 회원 관리 추가

### 9.1 라우트와 네비게이션

* [x] `mock-delivery-console/src/routes/UserApprovalPage.tsx`를 추가한다.
* [x] `mock-delivery-console/src/App.tsx`에 `user-approval` route를 추가한다.
* [x] `mock-delivery-console/src/components/app-sidebar.tsx`에 `회원 관리` 탭을 추가한다.

### 9.2 Admin Token 설정

* [x] `mock-delivery-console/.env.example`에 `VITE_ADMIN_TOKEN=your_admin_token_here`를 추가한다.
* [x] 실제 admin token은 커밋하지 않는다.
* [x] admin API 요청 시 `X-Admin-Token` header를 포함한다.

### 9.3 API client

* [x] `mock-delivery-console/src/lib/types.ts`에 관리자 사용자 타입을 추가한다.
* [x] `mock-delivery-console/src/lib/api-client.ts`에 `apiGetAdminUsers`를 추가한다.
* [x] `mock-delivery-console/src/lib/api-client.ts`에 `apiUpdateUserApproval`을 추가한다.
* [x] `mock-delivery-console/src/lib/api.ts`에서 export한다.

### 9.4 화면 기능

* [x] 가입 대기 사용자 목록을 표시한다.
* [x] 사용자 이름, 이메일, 매장명, 주소, 연락처, 가입일, 승인 상태를 표시한다.
* [x] 승인 버튼을 추가한다.
* [x] 거절 버튼을 추가한다.

### 9.5 작업 기록

* [x] `mock-delivery-console`에 `회원 관리` 탭과 `user-approval` route를 추가했다.
* [x] `deeporder-backend` Admin API 호출용 타입과 client를 추가하고 `X-Admin-Token`을 자동 주입하도록 구성했다.
* [x] `VITE_DEEPORDER_API_URL`, `VITE_ADMIN_TOKEN` 환경변수 예시를 추가했다.
* [x] 회원 승인 화면에서 상태 필터, 가입 신청 목록, 승인/거절 액션을 구현했다.
* [x] 처리 후 목록을 갱신한다.
* [x] 빈 상태와 오류 상태를 처리한다.

---

## 10. Phase 7. 행정안전부 도로명주소 팝업 API 연동

### 10.1 설정 추가

* [x] `deeporder-backend/app/config.py`에 `juso_confirm_key`를 추가한다.
* [x] `deeporder-backend/app/config.py`에 `juso_return_url`을 추가한다.
* [x] `deeporder-backend/.env.example`에 `JUSO_CONFIRM_KEY`, `JUSO_RETURN_URL` 이름만 추가한다.
* [x] 실제 승인키는 커밋하지 않는다.

### 10.2 Address router

* [x] `deeporder-backend/app/routers/address.py`를 추가한다.
* [x] `GET /api/address/juso-popup`을 추가한다.
* [x] `GET /api/address/juso-callback` 또는 `POST /api/address/juso-callback`을 추가한다.
* [x] router를 앱에 연결한다.

처리 방향:

* [x] `/api/address/juso-popup`은 행안부 `addrLinkUrl.do`로 form submit하는 HTML을 반환한다.
* [x] `confmKey`는 환경변수에서 읽는다.
* [x] `returnUrl`은 backend callback URL을 사용한다.
* [x] `resultType=4`, `useDetailAddr=Y`를 사용한다.
* [x] callback은 받은 주소 데이터를 `window.opener.postMessage`로 부모창에 전달한다.

### 10.3 kds-web 주소 팝업 연동

* [x] `window.open(`${API_URL}/api/address/juso-popup`, ...)`으로 팝업을 연다.
* [x] `window.addEventListener("message", ...)`로 주소 결과를 받는다.
* [x] origin 검증을 적용한다.
* [x] 받은 주소를 회원가입 폼에 반영한다.
* [x] component unmount 시 message listener를 제거한다.

### 10.4 작업 기록

* [x] `deeporder-backend`에 주소 팝업용 config와 `.env.example`을 추가했다.
* [x] `app/routers/address.py`에서 popup form HTML과 callback postMessage HTML을 구현했다.
* [x] `deeporder-backend/tests/test_address_api.py`를 추가해 popup/callback HTML 응답을 검증했다.
* [x] `kds-web/src/pages/AuthPage.tsx`에서 주소 검색 팝업 열기, `postMessage` 수신, origin 검증, 폼 반영, listener cleanup을 구현했다.

---

## 11. Phase 8. kds-web KDS 화면 개선

### 11.1 Auth 기반 주문 조회

* [x] `VITE_STORE_ID` 의존을 제거한다.
* [x] `GET /api/kds/orders?storeId=...` 호출을 제거한다.
* [x] `GET /api/kds/orders`에 `Authorization` header를 붙인다.
* [x] header에는 store id 대신 로그인된 store name을 표시한다.
* [x] token 만료 또는 401 응답 시 refresh를 먼저 시도한다.
* [x] refresh 실패 시 로그인 화면으로 되돌린다.

### 11.2 탭 구조

* [x] 기존 `NEW`, `COOKING`, `DONE` 3열 구조를 `[접수] [완료]` 탭 구조로 바꾼다.
* [x] `접수` 탭에는 `NEW`, `COOKING` 주문을 함께 보여준다.
* [x] `완료` 탭에는 `DONE` 주문을 보여준다.
* [x] `CANCELLED` 표시 정책을 정한다.

### 11.3 가로 확장 보드

* [x] 페이지 전체 세로 스크롤을 최소화한다.
* [x] 주문 카드는 가로 방향으로 나열한다.
* [x] 주문이 많으면 보드 내부에서 가로 스크롤한다.
* [x] 카드 내부에 세로 스크롤을 만들지 않는다.
* [x] 메뉴가 많으면 2열 또는 3열로 표시한다.
* [x] 옵션은 메뉴명 바로 아래에 들여쓰기한다.

### 11.4 요청사항 표시

* [x] `조리 요청사항 분석` 문구를 `주의 요청` 중심으로 바꾼다.
* [x] AI 분석 전에는 원문 요청사항을 우선 표시한다.
* [x] AI 분석 후에는 `빼기`, `맵기`, `알레르기` 같은 조리 주의사항을 강조한다.
* [x] 원문은 보조 정보로 유지한다.

### 11.5 작업 기록

* [x] `KdsPage`를 `[접수] [완료]` 탭 구조로 전환하고 `NEW` + `COOKING` 주문을 같은 보드에서 관리하도록 정리했다.
* [x] `CANCELLED` 주문은 보드에서는 제외하고 상단 배너 집계로만 노출하는 정책으로 고정했다.
* [x] 주문 카드를 가로 스크롤 보드로 바꾸고 카드 폭을 고정해 많은 주문을 보드 내부에서 탐색할 수 있게 했다.
* [x] 메뉴 목록은 주문 개수에 따라 1열/2열/3열로 바뀌고, 옵션은 메뉴명 바로 아래 들여쓰기 형태로 표시되도록 조정했다.
* [x] `조리 요청사항 분석` 패널을 `주의 요청` 패널로 바꾸고 AI 분석 전/후 모두 원문 요청을 보조 정보로 유지하도록 조정했다.

---

## 12. Phase 9. mock 주문 현실감 개선

* [x] `mock-delivery-api`에서 `orderNumber`를 6자리 대문자+숫자 코드로 생성한다.
* [x] AI가 order number를 만들지 않도록 한다.
* [x] fallback-generator도 같은 order number 정책을 사용한다.
* [x] 기존 internal DB PK와 external order number를 섞지 않는다.
* [x] `GeneratedOrderOut.orderId`와 webhook payload `order.orderNumber` 정책을 재검토한다.
* [x] 현재 catalog import JSON의 `menus[*].sortOrder` 누락 문제를 처리한다.

선택지:

* [x] import schema에서 `sortOrder` 기본값을 허용한다.
* [x] `catalog-export-2026-06-05.json` 파일 자체를 현재 schema에 맞게 정리한다.

### 12.1 작업 기록

* [x] `mock-delivery-api/app/console_api.py`의 `GeneratedOrderOut`에 `orderNumber`를 추가하고 6자리 대문자+숫자 코드 생성 helper를 도입했다.
* [x] AI 생성과 fallback 생성 모두 서버가 `orderId`와 별개로 `orderNumber`를 부여하도록 정리했다.
* [x] webhook payload 변환 시 `order.orderNumber`가 더 이상 `orderId`를 재사용하지 않고 별도 `orderNumber`를 사용하도록 수정했다.
* [x] flat catalog import 경로에서 `sortOrder`가 누락되어도 기본값 `0`으로 처리되도록 모델을 완화했다.
* [x] `mock-delivery-api/tests/test_mock_orders.py`를 갱신해 `orderNumber` 패턴과 webhook payload 매핑, `sortOrder` 누락 import를 검증했다.

---

## 13. Phase 10. 테스트 추가

### 13.1 Backend 테스트

* [x] 회원가입 시 user/store가 생성되는지 테스트한다.
* [x] 중복 email 가입이 막히는지 테스트한다.
* [x] 로그인 성공/실패를 테스트한다.
* [x] 로그인 시 accessToken과 refreshToken이 발급되는지 테스트한다.
* [x] refreshToken으로 새 accessToken이 발급되는지 테스트한다.
* [x] logout 시 refreshToken이 revoked 처리되는지 테스트한다.
* [x] revoked refreshToken으로 refresh가 실패하는지 테스트한다.
* [x] 승인 대기 사용자가 `/api/kds/orders` 접근 시 403을 받는지 테스트한다.
* [x] 비로그인 사용자가 `/api/kds/orders` 접근 시 401을 받는지 테스트한다.
* [x] 승인된 사용자가 자기 store 주문만 조회하는지 테스트한다.
* [x] 다른 store 주문 상태 변경이 403으로 막히는지 테스트한다.
* [x] 관리자 승인 API가 `X-Admin-Token` 없이는 실패하는지 테스트한다.
* [x] 관리자 승인 API가 올바른 `X-Admin-Token`으로 상태를 변경하는지 테스트한다.
* [x] 주소 callback endpoint가 postMessage HTML을 반환하는지 테스트한다.

### 13.2 kds-web 테스트

* [x] typecheck를 통과해야 한다.
* [x] 비로그인 상태에서 AuthPage가 표시되는지 확인한다.
* [x] 승인 대기 계정으로 PendingApprovalPage가 표시되는지 확인한다.
* [x] 승인 계정으로 KdsPage가 표시되는지 확인한다.
* [x] KdsPage가 `VITE_STORE_ID` 없이 주문을 조회하는지 확인한다.
* [x] 상태 변경 요청에 Authorization header가 포함되는지 확인한다.
* [x] 401 발생 시 refresh를 시도하는지 확인한다.
* [x] refresh 실패 시 로그아웃 처리되는지 확인한다.
* [x] logout 시 localStorage token이 삭제되는지 확인한다.

### 13.3 mock-delivery-console 테스트

* [x] typecheck를 통과해야 한다.
* [x] 회원 관리 route가 접근 가능한지 확인한다.
* [x] admin API 요청에 `X-Admin-Token`이 포함되는지 확인한다.
* [x] 승인/거절 API 호출이 정상인지 확인한다.

### 13.4 E2E smoke

* [x] register
* [x] admin approve
* [x] login
* [x] refresh
* [x] auth me
* [x] mock order generate
* [x] webhook send
* [x] KDS authenticated orders query
* [x] KDS status transition
* [x] unauthorized store/status access is blocked
* [x] logout
* [x] revoked refreshToken으로 refresh 실패

### 13.5 작업 기록

* [x] `deeporder-backend` 전체 pytest 스위트(`26 passed`)를 실행해 Auth, Admin, KDS auth, adapter, ingestion, webhook, address 경계를 다시 검증했다.
* [x] `mock-delivery-api` 테스트(`12 passed`)를 실행해 catalog, generated order, webhook payload, orderNumber 정책을 검증했다.
* [x] `kds-web`에 `typecheck` 스크립트를 추가하고 `npm run typecheck`를 통과시켰다.
* [x] `mock-delivery-console`의 `npm run typecheck`를 통과시켰다.
* [x] `scripts/smoke_kds_e2e.py`를 auth/store-context 기준으로 재작성하고 실제 실행해 register -> approve -> login -> refresh -> auth me -> generate/send -> authenticated KDS -> unauthorized block -> logout -> revoked refresh failure 흐름을 통과시켰다.
* [x] Playwright 브라우저 검증으로 `AuthPage -> PendingApprovalPage -> KdsPage` 전환, `GET /api/kds/orders`와 `PATCH /api/orders/{id}/status`의 `Authorization` 헤더 포함, refresh 성공/실패 시나리오, logout 토큰 삭제를 확인했다.
* [x] `deeporder-backend` CORS 기본값에 `5174`를 추가하고 `mock-delivery-console/.env`에 `VITE_DEEPORDER_API_URL`, `VITE_ADMIN_TOKEN`을 보강해 회원 관리 브라우저 승인 흐름 검증 기반을 복구했다.
* [x] Playwright 브라우저 검증으로 `mock-delivery-console` 회원 관리 route 진입, `X-Admin-Token` 포함 admin 요청, 승인/거절 상태 전환을 확인했다.

---

## 14. Phase 11. 문서 업데이트

* [x] `docs/plans/kds-web-direction-plan.md`와 구현 결과 차이를 기록한다.
* [x] `docs/records/local-e2e-operations-checklist.md`에서 `STORE_FLAT` 고정 전제를 제거한다.
* [x] `kds-web/README.md`를 Auth 기반 실행 흐름으로 갱신한다.
* [x] `deeporder-backend/README.md`에 Auth API, refresh token, admin token, Juso env를 추가한다.
* [x] `mock-delivery-console/README.md`에 회원 관리 탭 역할과 `VITE_ADMIN_TOKEN` 설정을 추가한다.
* [x] `.env.example` 파일들에 필요한 env 이름만 추가한다.

필요한 env 예시:

```text
deeporder-backend:
JWT_SECRET_KEY=your_jwt_secret_here
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRE_DAYS=14
ADMIN_TOKEN=your_admin_token_here
JUSO_CONFIRM_KEY=your_juso_confirm_key_here
JUSO_RETURN_URL=http://localhost:8000/api/address/juso-callback

kds-web:
VITE_API_BASE_URL=http://localhost:8000

mock-delivery-console:
VITE_API_BASE_URL=http://localhost:8000
VITE_ADMIN_TOKEN=your_admin_token_here
```

### 14.1 작업 기록

* [x] `docs/plans/kds-web-direction-plan.md` 상단에 구현 결과 차이 요약을 추가해 방향 문서와 실제 구현 기록의 경계를 분리했다.
* [x] `docs/records/local-e2e-operations-checklist.md`를 Auth / Store Context 기준으로 갱신해 `STORE_FLAT`, `VITE_STORE_ID`, query 기반 KDS 조회 전제를 제거했다.
* [x] `kds-web/README.md`에 Auth 기반 실행 흐름과 `VITE_STORE_ID` 제거 사실을 반영했다.
* [x] `deeporder-backend/README.md`에 Auth / Admin API 범위와 `DEEPORDER_*`, `JUSO_*` env 설명을 추가했다.
* [x] `mock-delivery-console/README.md`에 회원 관리 탭 역할과 `VITE_DEEPORDER_API_URL`, `VITE_ADMIN_TOKEN` 설정을 추가했다.
* [x] 루트 `.env.example`에 현재 스택 기준 backend / console / auth 관련 env 이름을 정리했다.
* [x] `catalog-export-2026-06-05.json`을 flat legacy export 형식에서 현재 nested catalog import schema 형식으로 재작성했다.

### 14.2 현재 남은 미완료 항목

* [x] `catalog-export-2026-06-05.json` 파일 자체를 현재 schema에 맞게 정리한다.
후속 확장 항목들:
  `1인 다매장 구조`, `UserStore 매핑 테이블`, `매장 전환 UI`, `관리자 인증 강화`, `Admin role 기반 로그인`, `KDS 기기 바인딩`, `kds-app` 공용 auth/store context, token storage 강화, refresh token rotation, HttpOnly Secure Cookie 전환, 전표/COM 포트 기반 주문 파싱

---

## 15. 완료 기준

* [x] `kds-web`에서 `VITE_STORE_ID` 없이 동작한다.
* [x] `GET /api/kds/orders?storeId=...` 방식은 제거되어 있다.
* [x] 비로그인 사용자는 KDS 주문 화면을 볼 수 없다.
* [x] 승인 대기 사용자는 KDS 주문 화면을 볼 수 없다.
* [x] 승인된 사용자는 본인 매장 주문만 볼 수 있다.
* [x] 승인된 사용자는 본인 매장 주문 상태만 변경할 수 있다.
* [x] 로그인 시 accessToken과 refreshToken이 발급된다.
* [x] accessToken 만료 시 refreshToken으로 accessToken을 재발급할 수 있다.
* [x] 로그아웃 시 refreshToken이 revoke되고 클라이언트 토큰이 삭제된다.
* [x] revoked refreshToken으로는 refresh할 수 없다.
* [x] `mock-delivery-console`에서 회원 승인/거절을 할 수 있다.
* [x] Admin API는 `X-Admin-Token` 없이는 호출할 수 없다.
* [x] 회원가입 주소 입력이 행정안전부 도로명주소 팝업 API를 통해 동작한다.
* [x] mock 주문 생성/전송 후 KDS에 해당 매장 주문이 표시된다.
* [x] 기존 webhook adapter / normalized order 경계는 유지된다.
* [x] backend 테스트가 통과한다.
* [x] `kds-web` typecheck가 통과한다.
* [x] `mock-delivery-console` typecheck가 통과한다.

---

## 16. 후속 확장

이번 구현 이후에 다룰 항목:

* [ ] 1인 다매장 구조
* [ ] `UserStore` 매핑 테이블
* [ ] 매장 전환 UI
* [ ] 관리자 인증 강화
* [ ] Admin role 기반 로그인
* [ ] KDS 기기 바인딩
* [ ] `kds-app`에서 동일 Auth/store context 사용
* [ ] 실제 운영 배포 환경의 token storage 정책 강화
* [ ] refresh token rotation
* [ ] HttpOnly Secure Cookie 전환
* [ ] 전표/COM 포트 기반 주문 파싱
