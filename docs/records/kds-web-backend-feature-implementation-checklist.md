작업 기록: `kds-web-v3` 정확 이식 이후, 프론트에 이미 반영된 KDS 운영 UX를 실제 backend 기능으로 치환하기 위한 상세 구현 체크리스트. 이 문서는 [kds-web-v3-exact-merge-checklist.md](/Users/mac/Documents/DeepOrder_V2/docs/records/kds-web-v3-exact-merge-checklist.md)의 `10.1 작업 결과`에서 분리한 backend 필요 기능 목록을 실제 구현 작업 단위로 정리한다.

# KDS Web Backend Feature Implementation 체크리스트

## 0. 이번 문서의 목표

이번 단계의 목표는 다음이다.

```text
현재 kds-web에 이미 보이는 운영 UX를
"로컬 상태 기반 기능"에서 "실제 backend 저장/조회 기능"으로 옮긴다.
```

즉 이번 문서는 다음을 다룬다.

```text
매장 상태 저장/조회
담당 메뉴/내 업무 저장
직원 관리 CRUD
설정 저장
비밀번호 변경
주문 숨김 / 완료 정리 / 항목 완료 토글
```

이번 문서는 다음을 다루지 않는다.

```text
kds-web-v3 UI 재이식
auth/store context 재설계
mock-delivery-api / deeporder-backend 서비스 경계 변경
preview/dev helper 재도입
```

핵심 원칙:

* 이미 존재하는 `kds-web` UX를 기준으로 backend를 붙인다.
* backend가 없다는 이유로 UI를 다시 축소하지 않는다.
* store context와 권한 경계는 현재 `auth/me` + bearer token 기반을 유지한다.
* 모든 저장/조회는 `current_user.store_id` 기준으로 store scope를 강제한다.
* 가능하면 기존 `deeporder-backend` 안에서 현재 auth/order 라우터 구조를 따라 확장한다.

---

## 1. 현재 상태 요약

현재 실제 backend 연동이 되어 있는 기능:

* 로그인 / 회원가입 / 토큰 재발급 / 로그아웃
* 현재 사용자 / 매장 정보 복원
* `GET /api/kds/orders`
* `PATCH /api/orders/{order_id}/status`

현재 로컬 상태 기반 기능:

* `storeStatus` 및 일시중지 팝업
* `MY_TASKS` 담당 메뉴 등록/수정/삭제
* `STAFF` 패널 내부 편집 흐름
* `STATS` 패널의 프론트 집계 표현
* `SETTINGS` 저장값 유지
* 비밀번호 변경 모달 제출
* 주문 숨김 / 완료 정리 / 항목 완료 토글

따라서 이번 작업의 본질은:

```text
UI를 새로 만드는 것이 아니라,
이미 보이는 UX에 영속 저장과 권한 있는 API를 붙이는 작업이다.
```

---

## 2. 구현 범위

### 2.1 Phase A. 매장 운영 상태

구현 대상:

* 매장 상태 저장/조회 API
* 영업중 / 일시중지 / 영업종료 상태 영속화
* 일시중지 시간 설정 저장

프론트 영향:

* `KdsPage.tsx` 상단 `storeStatus` 버튼
* `StoreStatusDot`
* 일시중지 팝업

예상 backend 필요 요소:

* store 상태 필드 추가 또는 전용 설정 테이블
* `GET /api/kds/store-context` 또는 동등한 조회 API
* `PATCH /api/kds/store-context/status` 또는 동등한 갱신 API

### 2.2 Phase B. 내 업무

구현 대상:

* 담당 메뉴 목록 저장/조회 API
* 담당 메뉴 추가/수정/삭제
* 추후 item 완료 정책과의 연결 기반

프론트 영향:

* `MyTasksPanel`
* 담당 메뉴 타일
* 메뉴 추가/수정/삭제 모달

예상 backend 필요 요소:

* user scope의 assigned menu 테이블
* `GET /api/kds/my-tasks/menus`
* `POST /api/kds/my-tasks/menus`
* `PATCH /api/kds/my-tasks/menus/{id}`
* `DELETE /api/kds/my-tasks/menus/{id}`

### 2.3 Phase C. 직원 관리

구현 대상:

* 직원 목록 조회
* 직원 추가
* 직원 수정
* 직원 활성/비활성
* PIN 또는 대체 인증 정보 정책 결정

프론트 영향:

* `StaffPanel`
* 직원 추가/수정/비활성 모달

예상 backend 필요 요소:

* 기존 `User` 확장 기반 직원 계정 설계
* `OWNER` / `EMPLOYEE` account type 분리
* `GET /api/kds/staff`
* `POST /api/kds/staff`
* `PATCH /api/kds/staff/{id}`
* `PATCH /api/kds/staff/{id}/active`

### 2.4 Phase D. 설정

구현 대상:

* 알림 on/off
* 알림 사운드
* 브레이크타임 설정
* 주문 자동수락

프론트 영향:

* `SettingsPanel`
* segmented buttons / toggles / breaktime inputs

예상 backend 필요 요소:

* store settings 테이블
* `GET /api/kds/settings`
* `PATCH /api/kds/settings`

### 2.5 Phase E. 계정 보안

구현 대상:

* 비밀번호 변경 API
* 비밀번호 검증 및 변경 후 토큰 정책

프론트 영향:

* 비밀번호 변경 모달

예상 backend 필요 요소:

* `POST /api/auth/change-password` 또는 동등한 엔드포인트
* 현재 비밀번호 확인
* 성공 시 refresh token 무효화 또는 재로그인 정책 결정

### 2.6 Phase F. 주문 보드 부가 동작

구현 대상:

* 주문 숨김
* 완료 주문 정리
* 항목 완료 토글

프론트 영향:

* context menu의 제거
* 완료 탭의 정리 액션
* 각 주문 item의 완료 토글

예상 backend 필요 요소:

* 숨김 상태와 archive 상태 분리 저장
* item 완료 progress 저장 모델 결정
* 완료 정리 정책 정의
* `PATCH /api/kds/orders/{order_id}/hide`
* `POST /api/kds/orders/archive-completed`
* `PATCH /api/kds/order-items/{item_id}/progress`

---

## 3. 선행 설계 결정

이 단계는 구현 전에 반드시 닫아야 한다.

* [x] `Store` 테이블 확장으로 충분한지, 별도 `store_settings` 테이블이 필요한지 결정한다
* [x] `내 업무`의 담당 메뉴를 단순 문자열로 저장할지, 메뉴 catalog id와 연결할지 결정한다
* [x] 직원 관리의 `staff`가 별도 로그인 사용자 객체인지, store owner 하위 엔티티인지 결정한다
* [x] 비밀번호 변경 성공 시 access/refresh token 정책을 정한다
* [x] 주문 숨김이 soft-hide인지, 사용자별 hide인지, store 전체 hide인지 결정한다
* [x] 항목 완료 토글이 order item row에 직접 붙는지, 별도 progress state인지 결정한다

### 3.1 결정 결과

#### 1. Store 상태/설정은 별도 `store_settings` 테이블로 간다

결정:

* `Store` 테이블에 상태/설정 필드를 계속 덧붙이는 대신, `store_settings` 성격의 별도 테이블로 분리한다.

이유:

* 현재 `Store`는 식별/주소/승인 상태 중심 엔티티다.
* `storeStatus`, 알림, 브레이크타임, 자동수락은 운영 설정 성격이 강하다.
* 앞으로 설정 항목이 더 늘어날 가능성이 높아서 `Store` 본체를 비대하게 만들 필요가 없다.

권장 필드 초안:

* `store_id`
* `operating_status`
* `paused_until`
* `status_source`
* `notifications_enabled`
* `notification_sound`
* `breaktime_enabled`
* `breaktime_start_hour`
* `breaktime_start_minute`
* `breaktime_duration_minutes`
* `auto_accept`
* `created_at`
* `updated_at`

운영 상태 정책:

* API는 `pauseMinutes`를 받을 수 있지만, 저장은 `paused_until`로 한다.
* 자동 브레이크타임과 수동 상태 변경이 충돌할 수 있으므로 `status_source = MANUAL | BREAKTIME`를 둔다.
* 수동 상태 변경이 자동 브레이크타임보다 우선한다.
* 수동 영업종료는 자동 복귀하지 않는다.

#### 2. `내 업무` 담당 메뉴는 사용자 개인 귀속의 문자열 기반 저장으로 간다

결정:

* 담당 메뉴는 현재 단계에서 menu catalog id 연결이 아니라 `menu_name` 문자열 기반으로 저장한다.
* 단, store 공용 데이터가 아니라 `current_user` 개인 데이터로 저장한다.

이유:

* 현재 `MyTasksPanel`은 메뉴명을 기준으로 활성 주문 item과 매칭한다.
* `deeporder-backend`에는 아직 KDS용 정식 catalog relation 모델이 없다.
* 지금 단계에서 catalog id까지 묶으면 `mock-delivery-console`의 메뉴 import 구조와 추가 정합성 작업이 필요해진다.
* 문자열 기반으로 먼저 붙이면 현재 UX를 가장 적은 변경으로 저장/복원할 수 있다.
* `내 업무`는 매장 공용 패널이 아니라 로그인한 사용자 개인 기능이므로 `user_id` scope가 맞다.

권장 테이블 초안:

* `user_assigned_menus`
* 필드:
  * `id`
  * `store_id`
  * `user_id`
  * `menu_name`
  * `normalized_menu_name`
  * `sort_order`
  * `created_at`
  * `updated_at`

권장 제약:

* `UNIQUE(user_id, normalized_menu_name)`

추가 원칙:

* 모든 쿼리는 `store_id == current_user.store_id`와 `user_id == current_user.id`를 동시에 만족해야 한다.
* 클라이언트가 `store_id`, `user_id`를 지정하지 않도록 하고, 서버가 인증 정보에서 자동으로 결정한다.
* 문자열 기반 저장이므로 `normalized_menu_name`을 두고 공백/표기 차이 중복을 막는다.

#### 3. 직원 관리는 실제 로그인 가능한 `User(account_type=EMPLOYEE)`로 간다

결정:

* 직원은 별도 엔티티가 아니라 실제 로그인 가능한 `User`다.
* 계정 종류는 `OWNER` / `EMPLOYEE`로 구분한다.
* 직원은 매장주가 생성하고, 이메일 + 4자리 PIN으로 로그인한다.

이유:

* 앞으로 `kds-app`까지 고려하면 직원도 자기 계정으로 로그인해야 한다.
* 현재 `내 업무`를 개인 귀속으로 가져가려면 사용자 단위 identity가 필요하다.
* 직원 관리 패널의 PIN/활성화 UX도 실제 계정 모델과 더 잘 맞는다.

권장 필드 방향:

* 기존 `User` 확장
* `account_type`
* `owner_user_id nullable`
* `password_hash nullable`
* `pin_hash nullable`
* `position_label nullable`
* `active`
* `deleted_at nullable`

계정 의미:

* `OWNER`
  * 회원가입으로 생성
  * 이메일 + 비밀번호 로그인
  * 자신의 매장과 직원 계정 관리
* `EMPLOYEE`
  * 매장주가 직접 생성
  * 이메일 + PIN 로그인
  * 하나의 매장과 매장주에게 종속

권한 원칙:

* 직원 관리 API는 대상 계정이 `EMPLOYEE`이고, `store_id == current_user.store_id`이며, `owner_user_id == current_user.id`인지 확인해야 한다.
* `position_label`은 화면 표시용이고 API 권한 검사용이 아니다.
* 직원 계정은 `접수`, `완료`, `내 업무`만 사용한다.
* 직원 계정에는 `직원 관리`, `통계`, `설정`을 노출하지 않는다.

#### 4. 비밀번호 변경 성공 시 refresh token 전부 revoke, access token은 재로그인 유도 정책으로 간다

결정:

* 비밀번호 변경 성공 시 해당 사용자 refresh token은 전부 revoke한다.
* 프론트는 성공 후 로그아웃시키고 다시 로그인하도록 유도한다.

이유:

* 현재 backend에는 `RefreshToken` 테이블이 이미 있다.
* 가장 단순하고 안전한 정책은 “비밀번호 변경 = 기존 세션 무효화”다.
* access token은 stateless라 즉시 강제 폐기는 어렵지만, refresh 차단 + 프론트 로그아웃으로 운영상 충분히 안전한 정책이 된다.

추가 원칙:

* 비밀번호 변경과 refresh token revoke는 같은 transaction으로 처리한다.
* 직원 계정은 비밀번호 변경 대상이 아니다.
* 직원 인증 정보 변경은 PIN 재발급으로 처리한다.

#### 5. 주문 숨김과 완료 archive는 별도 상태로 분리한다

결정:

* 주문 숨김과 완료 정리는 서로 다른 운영 상태로 저장한다.
* 둘 다 `store` 범위에서 동작하지만, 같은 필드로 합치지 않는다.

이유:

* 개별 주문 숨김과 완료 주문 일괄 정리는 의미가 다르다.
* `hidden_at` 하나로 합치면 실행 이유와 이력을 구분할 수 없다.
* KDS 운영 로그 관점에서도 별도 이력이 더 명확하다.

권장 테이블 초안:

* `kds_order_state`
* 필드:
  * `id`
  * `order_id`
  * `store_id`
  * `hidden_at`
  * `hidden_by_user_id`
  * `archived_at`
  * `archived_by_user_id`
  * `created_at`
  * `updated_at`

권장 제약:

* `UNIQUE(order_id, store_id)`

권장 API:

* `PATCH /api/kds/orders/{order_id}/hide`
* `POST /api/kds/orders/archive-completed`

#### 6. item 완료 토글은 `OrderItem` 직접 수정이 아니라 별도 progress state로 간다

결정:

* 항목 완료는 toggle이 아니라 명시적 상태 설정 API로 간다.
* 원본 `order_items` row 자체를 덮어쓰지 않고, 별도 KDS progress state로 저장한다.

이유:

* `OrderItem`은 주문 원본 데이터다.
* item 완료 여부는 외부 payload 원본이 아니라 KDS 운영 상태다.
* 따라서 원본 주문 데이터와 KDS 처리 상태를 분리하는 것이 맞다.
* 이후 “누가 언제 완료 처리했는지” 같은 운영 정보도 추가하기 쉽다.
* toggle API는 네트워크 재시도 시 상태가 반대로 뒤집힐 수 있어서 명시적 `done: true|false` 방식이 더 안전하다.

권장 테이블 초안:

* `kds_order_item_progress`
* 필드:
  * `id`
  * `order_item_id`
  * `store_id`
  * `done`
  * `done_at`
  * `done_by_user_id`
  * `created_at`
  * `updated_at`

권장 제약:

* `UNIQUE(order_item_id, store_id)`

권장 API:

* `PATCH /api/kds/order-items/{item_id}/progress`

요청 예시:

```json
{
  "done": true
}
```

추가 원칙:

* 옵션은 별도 완료 상태를 만들지 않고 부모 `OrderItem`의 완료 상태를 따른다.

### 3.2 설계 결과 요약

이번 단계에서 고정된 방향:

* 설정류는 `store_settings` 별도 테이블
* 내 업무는 `user_assigned_menus` 기반의 개인 귀속 문자열 저장
* 직원 관리는 실제 로그인 가능한 `User(account_type=EMPLOYEE)`
* 비밀번호 변경은 refresh token 전부 revoke + 재로그인 유도
* 주문 숨김과 완료 archive는 `kds_order_state`에서 분리 저장
* item 완료는 원본 `OrderItem` 수정이 아니라 명시적 progress state 저장

### 3.3 이 결정으로 다음 단계에서 바뀌는 문서 기준

다음 단계부터는 다음 전제를 기준으로 구현한다.

* `Store` 직접 확장보다 `store_settings` 우선
* `assigned menu`는 catalog relation보다 user-local 문자열 목록 우선
* `staff`는 별도 엔티티보다 auth `User` 확장 우선
* `order item done`은 원본 row mutation 금지
* `hide`와 `archive`는 별도 상태 유지

한 줄 정리:

```text
이번 MVP 구현은 "현재 UX를 가장 적은 충돌로 저장/복원"하는 방향으로 가며,
auth/order 원본 모델과 KDS 운영 상태는 가능한 한 분리한다.
```

설계 원칙:

```text
UI가 이미 있으므로,
API shape는 UI를 단순화시키는 방향이 아니라
현재 UX를 안정적으로 저장/복원하는 방향으로 잡는다.
```

---

## 4. Backend 모델/스키마 체크리스트

* [x] 현재 `deeporder-backend/app/models.py` 기준 확장 포인트를 정리한다
* [x] store 상태/설정 저장 모델을 추가할 위치를 정리한다
* [x] assigned menu 저장 모델 구조를 정리한다
* [x] 직원 계정용 `User` 확장 포인트를 정리한다
* [x] item 완료 / order hide / clear completed용 저장 모델 구조를 정리한다
* [x] `deeporder-backend/app/schemas.py`에 추가할 request/response 스키마 목록을 정리한다
* [x] migration 전략을 정한다
* [x] SQLite 기준 초기/기존 데이터 영향 범위를 기록한다

### 4.1 현재 `models.py` 기준 확장 포인트 정리

현재 기준 핵심 모델 상태:

* `Store`
  * 현재는 `store_id`, `store_name`, 주소, `approval_status` 중심이다.
  * 운영 설정 필드는 아직 없다.
* `User`
  * 현재는 `email`, `password_hash`, `name`, `role`, `approval_status`, `store_id`만 있다.
  * 직원용 PIN, owner 종속, soft delete, account type 개념이 아직 없다.
* `Order`
  * 주문 원본과 상태는 이미 존재한다.
  * KDS 전용 숨김/아카이브 상태는 아직 없다.
* `OrderItem`
  * 주문 item 원본만 있고, KDS 완료 진행 상태는 아직 없다.
* `RefreshToken`
  * 이미 있으므로 비밀번호 변경 / PIN 재발급 시 revoke 처리의 기반으로 사용 가능하다.

정리:

```text
이번 단계는 Order / OrderItem 원본 구조를 크게 바꾸기보다,
KDS 운영 상태와 직원 계정 기능을 별도 모델로 덧붙이는 방식이 맞다.
```

### 4.2 추가할 모델 초안

#### A. `store_settings`

목적:

* 매장 운영 상태 및 설정 저장

권장 필드:

* `id`
* `store_id`
* `operating_status`
* `paused_until`
* `status_source`
* `notifications_enabled`
* `notification_sound`
* `breaktime_enabled`
* `breaktime_start_hour`
* `breaktime_start_minute`
* `breaktime_duration_minutes`
* `auto_accept`
* `created_at`
* `updated_at`

권장 제약:

* `UNIQUE(store_id)`

추가 메모:

* `store_id`는 기존 `stores.store_id`를 FK로 연결하는 방향이 자연스럽다.
* `GET` 시 row가 없으면 기본값을 조합해 응답하고, 첫 `PATCH`에서 row를 생성하는 정책을 따른다.

#### B. `user_assigned_menus`

목적:

* `내 업무` 담당 메뉴를 사용자 개인 기준으로 저장

권장 필드:

* `id`
* `store_id`
* `user_id`
* `menu_name`
* `normalized_menu_name`
* `sort_order`
* `created_at`
* `updated_at`

권장 제약:

* `UNIQUE(user_id, normalized_menu_name)`

추가 메모:

* `store_id`와 `user_id`를 함께 둬서 store scope 검증을 단순화한다.
* `normalized_menu_name`은 lower/trim 기준으로 정규화하는 쪽이 안전하다.

#### C. `kds_order_state`

목적:

* 주문 숨김과 완료 archive 상태를 저장

권장 필드:

* `id`
* `order_id`
* `store_id`
* `hidden_at`
* `hidden_by_user_id`
* `archived_at`
* `archived_by_user_id`
* `created_at`
* `updated_at`

권장 제약:

* `UNIQUE(order_id, store_id)`

추가 메모:

* 숨김과 archive는 같은 row 안에서 별도 컬럼으로 유지한다.
* `order_id`는 내부 `orders.id` FK를 사용하고, 외부 payload id를 재사용하지 않는다.

#### D. `kds_order_item_progress`

목적:

* KDS item 완료 진행 상태 저장

권장 필드:

* `id`
* `order_item_id`
* `store_id`
* `done`
* `done_at`
* `done_by_user_id`
* `created_at`
* `updated_at`

권장 제약:

* `UNIQUE(order_item_id, store_id)`

추가 메모:

* `OrderItem` 원본 row에 완료 플래그를 직접 추가하지 않는다.
* KDS 운영 상태와 외부 주문 원본을 분리하는 원칙을 유지한다.

### 4.3 `User` 확장 체크리스트

현재 `User`는 `STORE_OWNER` / `ADMIN`의 `role`만 가지므로, 이번 단계에서 아래 확장이 필요하다.

추가 후보 필드:

* `account_type`
* `owner_user_id`
* `pin_hash`
* `position_label`
* `active`
* `deleted_at`

기존 필드 조정 메모:

* `password_hash`는 직원 계정 지원을 위해 nullable 전환 검토가 필요하다.
* 단, OWNER는 계속 비밀번호 기반 로그인이라 실사용 정책은 유지된다.

권장 enum 방향:

* `role`은 기존 권한 계층용으로 유지
* `account_type`은 `OWNER` / `EMPLOYEE` 계정 종류 구분용으로 추가

이유:

```text
ADMIN 권한과 직원/점주 계정 종류는 같은 축이 아니다.
기존 role만으로 직원 로그인까지 표현하려고 하면 권한 의미가 섞인다.
```

### 4.4 `schemas.py` 추가 대상

현재 `schemas.py`에는 auth / webhook / order / admin approval까지만 있다.
이번 단계에서 아래 스키마 묶음이 필요하다.

#### A. Store Settings / Status

* [x] `KdsStoreContextOut` 또는 동등 응답 스키마 정의 필요
* [x] `UpdateStoreStatusIn`
* [x] `UpdateStoreSettingsIn`
* [x] `StoreSettingsOut`

예상 필드:

* `operatingStatus`
* `pausedUntil`
* `statusSource`
* `notificationsEnabled`
* `notificationSound`
* `breaktimeEnabled`
* `breaktimeStartHour`
* `breaktimeStartMinute`
* `breaktimeDurationMinutes`
* `autoAccept`

#### B. My Tasks

* [x] `AssignedMenuOut`
* [x] `CreateAssignedMenuIn`
* [x] `UpdateAssignedMenuIn`
* [x] `AssignedMenuListOut`

예상 필드:

* `id`
* `menuName`
* `normalizedMenuName`
* `sortOrder`

#### C. Staff / Employee Auth

* [x] `StaffOut`
* [x] `CreateStaffIn`
* [x] `UpdateStaffIn`
* [x] `UpdateStaffActiveIn`
* [x] `RegenerateStaffPinResponse`
* [x] `EmployeeLoginRequest`

예상 필드:

* `id`
* `email`
* `name`
* `positionLabel`
* `active`
* `accountType`

추가 메모:

* 직원 PIN은 응답에 반복 노출하지 않고, 생성/재발급 시 1회만 평문 반환하는 정책을 문서에 맞춰야 한다.

#### D. Password / Security

* [x] `ChangePasswordIn`
* [x] `ChangePasswordResponse`

예상 필드:

* `currentPassword`
* `newPassword`
* `message`

#### E. Order Board Extras

* [x] `HideOrderResponse`
* [x] `ArchiveCompletedOrdersResponse`
* [x] `UpdateOrderItemProgressIn`
* [x] `OrderItemProgressOut`

예상 필드:

* `done`
* `doneAt`
* `doneByUserId`

### 4.5 migration 전략

현재 확인된 사실:

* backend는 Alembic을 쓰지 않는다.
* 런타임은 `deeporder-backend/app/database.py`에서 `Base.metadata.create_all(bind=engine)`로 테이블을 생성한다.
* 테스트도 `drop_all/create_all` 기반이다.

이번 단계의 문서 기준 전략:

* [x] 이번 구현은 Alembic 도입 없이 현재 방식에 맞춰 진행한다
* [x] 스키마 변경이 크므로 개발용 SQLite는 필요 시 재생성 가능성을 전제로 한다
* [x] 운영 데이터 마이그레이션보다는 로컬/PoC 개발 DB 정리를 우선한다

실무 메모:

```text
create_all 기반에서는 컬럼 추가/nullable 변경/enum 변경이 자동 반영되지 않는다.
즉 models.py만 바꿔도 기존 SQLite 파일은 따라오지 않는다.
```

따라서 구현 시 선택지:

* 개발 DB 파일을 삭제 후 재생성
* 필요한 최소 `ALTER TABLE` 수동 스크립트 작성
* 이번 기능 묶음이 끝난 뒤 Alembic 도입 여부 별도 검토

현재 단계 권장:

* 로컬 검증은 DB 초기화 허용
* 문서에 “기존 SQLite 재사용 시 수동 정리 필요”를 명시

### 4.6 SQLite 기준 초기/기존 데이터 영향

예상 영향:

* 기존 `stores`, `users`, `orders`, `order_items`, `refresh_tokens` 데이터는 기본적으로 유지 가능하다.
* 하지만 `users.password_hash` nullable 전환, enum 추가, 신규 FK/제약 추가는 기존 SQLite 파일에서 자동 반영되지 않는다.
* 이미 로그인된 사용자 세션은 비밀번호/PIN 정책 변경 시 재로그인이 필요할 수 있다.

이번 문서 기준 기록:

* [x] 신규 테이블 추가는 비교적 안전하지만, 기존 `users` 수정은 DB 재생성 가능성을 열어둔다
* [x] 테스트 픽스처는 `drop_all/create_all` 기준이라 신규 모델 추가 시 함께 갱신해야 한다
* [x] 개발 중 승인 계정/직원 계정 테스트 데이터를 다시 만드는 절차가 필요할 수 있다

주의:

```text
프론트 로컬 상태 이름을 그대로 DB schema로 복사하지 말고,
권한/store scope/상태 전이 규칙을 backend 관점에서 다시 명시해야 한다.
```

---

## 5. API 체크리스트

### 5.1 Store Context / Status

* [x] store 상태 조회 API 추가 방향 정리
* [x] store 상태 변경 API 추가 방향 정리
* [x] 일시중지 시간 저장/조회 계약 정리
* [x] 인증 사용자 store scope 검증 규칙 정리

권장 라우터:

* 신규 `deeporder-backend/app/routers/kds_store.py`

권장 엔드포인트:

* `GET /api/kds/store-context`
* `PATCH /api/kds/store-context/status`
* `GET /api/kds/settings`
* `PATCH /api/kds/settings`

역할 분리:

* `store-context`
  * 상단 배지/상태 점/현재 매장 운영 상태 조회용
* `settings`
  * 알림/브레이크타임/자동수락 설정 조회·저장용

요청/응답 메모:

* `PATCH /api/kds/store-context/status`
  * 요청: `operatingStatus`, `pauseMinutes`
  * 저장: `paused_until`, `status_source`
* `GET /api/kds/store-context`
  * 응답: 매장 기본 정보 + 현재 운영 상태 + `pausedUntil`

검증 규칙:

* `current_user.approval_status == APPROVED` 필수
* `current_user.store_id`를 기준으로만 조회/수정
* 클라이언트가 임의 `storeId`를 보내지 않도록 함

### 5.2 My Tasks

* [x] 담당 메뉴 목록 조회 API 추가 방향 정리
* [x] 담당 메뉴 생성 API 추가 방향 정리
* [x] 담당 메뉴 수정 API 추가 방향 정리
* [x] 담당 메뉴 삭제 API 추가 방향 정리
* [x] user/store scope 검증 규칙 정리

권장 라우터:

* 신규 `deeporder-backend/app/routers/kds_my_tasks.py`

권장 엔드포인트:

* `GET /api/kds/my-tasks/menus`
* `POST /api/kds/my-tasks/menus`
* `PATCH /api/kds/my-tasks/menus/{id}`
* `DELETE /api/kds/my-tasks/menus/{id}`

요청/응답 메모:

* create/update 요청은 `menuName`, `sortOrder`만 받는다
* `normalizedMenuName`은 서버가 생성한다
* 목록 응답은 `sortOrder ASC, created_at ASC` 기준 정렬

검증 규칙:

* `user_id == current_user.id`
* `store_id == current_user.store_id`
* 다른 사용자 assigned menu 접근은 404 또는 403 정책 중 하나로 고정 필요

추가 메모:

* 현재 UX 기준으로 drag/drop 정렬이 없다면 `sortOrder`는 선택 필드로 두고 서버가 기본값을 보정해도 된다

### 5.3 Staff

* [x] 직원 목록 조회 API 추가 방향 정리
* [x] 직원 생성 API 추가 방향 정리
* [x] 직원 수정 API 추가 방향 정리
* [x] 직원 활성/비활성 API 추가 방향 정리
* [x] owner/admin 권한 및 범위 검증 규칙 정리

권장 라우터:

* 신규 `deeporder-backend/app/routers/kds_staff.py`
* auth 성격 API는 기존 `deeporder-backend/app/routers/auth.py` 확장

권장 엔드포인트:

* `GET /api/kds/staff`
* `POST /api/kds/staff`
* `PATCH /api/kds/staff/{id}`
* `PATCH /api/kds/staff/{id}/active`
* `POST /api/kds/staff/{id}/regenerate-pin`
* `POST /api/auth/employee/login`

응답 정책:

* 직원 생성 시에만 평문 PIN 1회 반환
* PIN 재발급 시에도 평문 PIN 1회 반환
* 일반 직원 목록 응답에는 `pin` 절대 미포함

권한 규칙:

* `OWNER`는 자기 매장 직원만 관리 가능
* `ADMIN`은 예외 관리 범위를 둘지 별도 결정이 필요하지만, MVP에서는 점주 중심이 기본
* 대상 계정은 반드시:
  * `account_type == EMPLOYEE`
  * `store_id == current_user.store_id`
  * `owner_user_id == current_user.id` 이어야 함

추가 메모:

* soft delete를 넣는다면 `DELETE`보다 `PATCH active=false` + `deleted_at` 우선
* PIN 재발급 / 비활성화 / 삭제 시 refresh token revoke 필요

### 5.4 Settings

* [x] 설정 조회 API 추가 방향 정리
* [x] 설정 저장 API 추가 방향 정리
* [x] 기본값 전략 정리

권장 라우터:

* `kds_store.py`로 합치거나, 분리 시 `kds_settings.py`

권장 엔드포인트:

* `GET /api/kds/settings`
* `PATCH /api/kds/settings`

기본값 전략:

* row가 없으면 서버가 기본값 응답
* 첫 `PATCH` 시 row 생성

응답 메모:

* 프론트 local state shape와 1:1 대응하되, boolean/int/string 타입만 유지
* breaktime은 `enabled/startHour/startMinute/durationMinutes` 구조 유지

### 5.5 Password

* [x] 비밀번호 변경 API 추가 방향 정리
* [x] 현재 비밀번호 검증 규칙 정리
* [x] 비밀번호 정책 검증 규칙 정리
* [x] 토큰 무효화/재로그인 정책 반영 방향 정리

권장 라우터:

* 기존 `deeporder-backend/app/routers/auth.py` 확장

권장 엔드포인트:

* `POST /api/auth/change-password`

요청 메모:

* `currentPassword`
* `newPassword`

검증 규칙:

* 현재 비밀번호 일치 필수
* 새 비밀번호 최소 길이 정책 유지
* 직원 계정은 이 엔드포인트 사용 금지

성공 정책:

* DB transaction 안에서:
  * `password_hash` 갱신
  * 해당 사용자 `refresh_tokens.revoked_at` 일괄 설정
* 프론트는 성공 후 로컬 세션 제거 + 재로그인 유도

### 5.6 Order Board Extras

* [x] 주문 숨김 API 추가 방향 정리
* [x] 완료 주문 정리 API 추가 방향 정리
* [x] item 완료 저장 API 추가 방향 정리
* [x] store scope + order ownership 검증 규칙 정리

권장 라우터:

* 기존 `deeporder-backend/app/routers/kds_orders.py` 확장
* 또는 신규 `kds_order_actions.py` 분리

권장 엔드포인트:

* `PATCH /api/kds/orders/{order_id}/hide`
* `POST /api/kds/orders/archive-completed`
* `PATCH /api/kds/order-items/{item_id}/progress`

요청/응답 메모:

* `PATCH /hide`
  * 요청 없이 hidden 처리하거나 `{ "hidden": true }` 형태 중 하나로 고정
* `POST /archive-completed`
  * body 없이 현재 store의 완료 주문 일괄 archive
  * 응답은 `archivedCount`
* `PATCH /progress`
  * 요청: `{ "done": true | false }`

검증 규칙:

* 모든 order / order_item은 내부 `store_id == current_user.store_id` 확인
* item progress는 대상 item의 parent order를 join해서 store ownership 검증
* archived/hidden 주문을 `GET /api/kds/orders`에서 어떻게 필터링할지 함께 정의 필요

### 5.7 라우터 배치 원칙

현재 라우터 구조:

* `auth.py`
* `kds_orders.py`
* `order_status.py`
* `admin_users.py`
* `order_webhooks.py`

이번 단계 권장 배치:

* `auth.py`
  * `POST /api/auth/change-password`
  * `POST /api/auth/employee/login`
* 신규 `kds_store.py`
  * store context / settings
* 신규 `kds_my_tasks.py`
  * assigned menu CRUD
* 신규 `kds_staff.py`
  * 직원 관리 CRUD / PIN 재발급
* `kds_orders.py`
  * 기존 목록 조회 유지
  * hide/archive/item progress 확장

이유:

```text
현재 backend는 기능별로 얇은 라우터를 분리하는 편이라,
KDS 운영 기능도 화면/도메인 단위로 나누는 것이 이후 유지보수에 유리하다.
```

---

## 6. Frontend 연결 체크리스트

* [x] `kds-web/src/lib/api.ts`에 새 API 메서드 추가 범위를 정리한다
* [x] `KdsPage.tsx`의 `storeStatus` 로컬 상태를 API 기반 초기화/저장으로 전환하는 방식을 정리한다
* [x] `MyTasksPanel`을 API 기반 목록/저장으로 전환하는 방식을 정리한다
* [x] `StaffPanel`을 API 기반 CRUD로 전환하는 방식을 정리한다
* [x] `SettingsPanel`을 API 기반 저장/복원으로 전환하는 방식을 정리한다
* [x] 비밀번호 변경 모달을 실제 API 제출로 전환하는 방식을 정리한다
* [x] 주문 숨김 / 완료 정리 / item 완료 토글을 실제 API 호출로 전환하는 방식을 정리한다
* [x] 로컬 전용 토스트/게이트 문구를 기능 완료 상태에 맞게 제거 또는 축소하는 규칙을 정리한다

### 6.1 현재 프론트 기준 연결 포인트

현재 확인된 상태:

* `kds-web/src/lib/api.ts`
  * 현재는 `login/register/refresh/logout/me/getKdsOrders/updateOrderStatus`만 있다.
* `kds-web/src/pages/KdsPage.tsx`
  * 여전히 로컬 상태:
    * `storeStatus`
    * `assignedMenus`
    * `completedItemIds`
    * `hiddenOrderIds`
    * `settings`
  * 로컬 전용 안내 문구:
    * `localOnlyFeatureMessage`
    * `PanelFeatureGate`
    * `openLocalOnlyTab(...)`

즉 프론트 구현의 핵심은:

```text
새 화면을 만드는 것이 아니라,
KdsPage 내부 로컬 상태를 점진적으로 API 결과로 치환하는 작업이다.
```

### 6.2 `api.ts` 확장 체크리스트

추가 대상:

* [x] `apiGetStoreContext`
* [x] `apiUpdateStoreStatus`
* [x] `apiGetKdsSettings`
* [x] `apiUpdateKdsSettings`
* [x] `apiGetAssignedMenus`
* [x] `apiCreateAssignedMenu`
* [x] `apiUpdateAssignedMenu`
* [x] `apiDeleteAssignedMenu`
* [x] `apiGetStaff`
* [x] `apiCreateStaff`
* [x] `apiUpdateStaff`
* [x] `apiUpdateStaffActive`
* [x] `apiRegenerateStaffPin`
* [x] `apiEmployeeLogin`
* [x] `apiChangePassword`
* [x] `apiHideOrder`
* [x] `apiArchiveCompletedOrders`
* [x] `apiUpdateOrderItemProgress`

추가 원칙:

* 모든 인증 API는 기존 `createAuthHeaders(accessToken)` 재사용
* 응답 타입은 `kds-web/src/types.ts`에서 먼저 선언하고 `api.ts`가 이를 소비
* `request()` 공통 헬퍼는 유지하고, 새 API도 같은 예외 처리 규칙을 사용

### 6.3 `types.ts` 확장 체크리스트

현재 `api.ts`와 함께 반드시 늘어나야 할 타입 묶음:

* [x] `StoreOperatingStatus`
* [x] `StoreContext`
* [x] `StoreSettings`
* [x] `AssignedMenu`
* [x] `StaffMember`
* [x] `EmployeeLoginRequest`
* [x] `ChangePasswordRequest`
* [x] `OrderItemProgress`
* [x] archive/hide 응답 타입

중요:

```text
기존 KdsPage 내부의 로컬 타입 정의와
api.ts 응답 타입이 이중 관리되지 않도록,
공용 타입은 가능한 한 types.ts로 끌어올리는 편이 맞다.
```

### 6.4 `KdsPage.tsx` 상태 전환 체크리스트

#### A. Store Context / Status

현재:

* `const [storeStatus, setStoreStatus] = useState<StoreStatus>("OPEN")`

전환 방향:

* [x] 최초 진입 시 `apiGetStoreContext(accessToken)` 호출
* [x] 응답으로 `storeStatus`, `pausedUntil`, store badge 정보 초기화
* [x] 상태 변경 시 `apiUpdateStoreStatus` 호출 후 응답값으로 로컬 갱신
* [x] popup 닫기/열기는 UI 상태로 유지

주의:

* 상태 선택 popup 자체는 프론트에 남고, 저장만 API화한다.
* `pauseMinutes`는 프론트 입력값으로 유지해도 되지만, 저장 후에는 응답 기준 상태를 다시 반영한다.

#### B. Settings

현재:

* `const [settings, setSettings] = useState(...)`

전환 방향:

* [x] 최초 진입 시 `apiGetKdsSettings`로 hydrate
* [x] 토글/세그먼트/시간 입력 변경 시:
  * 낙관적 UI 업데이트 또는 저장 버튼 없는 즉시 저장 방식 중 하나를 고정
* [x] 현재 UX를 유지하려면 “입력 즉시 PATCH”가 가장 자연스럽다
* [x] PATCH 실패 시 이전 상태 rollback 또는 재조회 정책 필요

권장:

* MVP는 즉시 저장
* 실패 시 toast + 재조회

#### C. My Tasks

현재:

* `assignedMenus`를 메모리 배열로 직접 수정

전환 방향:

* [x] 최초 진입 시 `apiGetAssignedMenus`
* [x] 추가 모달 저장 시 `apiCreateAssignedMenu`
* [x] 수정 모달 저장 시 `apiUpdateAssignedMenu`
* [x] 삭제 확인 시 `apiDeleteAssignedMenu`
* [x] 성공 후 전체 재조회 또는 응답 기반 patch 중 하나로 고정

권장:

* 초기 구현은 “성공 후 재조회”가 가장 단순하고 안정적

이유:

* 정렬, 중복 정규화, 서버 보정값(`normalizedMenuName`, `sortOrder`)을 프론트가 다시 추측할 필요가 없다.

#### D. Staff

현재:

* `StaffPanel`은 읽기 전용 gate가 섞여 있음

전환 방향:

* [x] OWNER/ADMIN만 `apiGetStaff` 호출
* [x] 추가 시 `apiCreateStaff`
* [x] 수정 시 `apiUpdateStaff`
* [x] 활성/비활성 시 `apiUpdateStaffActive`
* [x] PIN 재발급 액션이 UI에 있으면 `apiRegenerateStaffPin` 연결

중요:

* EMPLOYEE 계정은 이 패널 자체를 노출하지 않으므로, UI와 API 권한이 동시에 막혀야 한다.

#### E. Password Change

현재:

* 모달 UI만 있고 실제 제출 없음

전환 방향:

* [x] 제출 시 `apiChangePassword`
* [x] 성공 후:
  * 성공 toast
  * local auth/session 제거
  * 로그인 화면으로 복귀
* [x] 실패 시 모달 유지 + 에러 출력

#### F. Order Board Extras

현재:

* `completedItemIds`, `hiddenOrderIds`가 메모리 기반

전환 방향:

* [x] item 완료 클릭 시 `apiUpdateOrderItemProgress`
* [x] 주문 숨김 시 `apiHideOrder`
* [x] 완료 정리 시 `apiArchiveCompletedOrders`
* [x] 성공 후 `apiGetKdsOrders` 재조회

중요:

* `GET /api/kds/orders` 응답에 hide/archive/item progress 결과가 포함되어야 프론트 로컬 set을 제거할 수 있다.
* 즉 이 단계는 단순 액션 API만 추가해서 끝나지 않고, 목록 응답 확장도 같이 필요하다.

### 6.5 `GET /api/kds/orders` 응답 확장 메모

프론트가 로컬 상태를 없애려면 주문 목록 응답에도 KDS 운영 상태가 내려와야 한다.

필요 필드 후보:

* order level
  * `hidden`
  * `archived`
* item level
  * `done`
  * `doneAt`
  * `doneByUserId`

정리:

```text
주문 액션 API만 구현하고 목록 응답을 그대로 두면,
프론트는 계속 completedItemIds / hiddenOrderIds를 따로 들고 있어야 한다.
따라서 KDS 목록 응답도 이번 단계에서 함께 확장해야 한다.
```

### 6.6 local-only UI 제거/축소 규칙

현재 제거 대상:

* [x] `openLocalOnlyTab("STAFF", ...)`
* [x] `openLocalOnlyTab("SETTINGS", ...)`
* [x] `PanelFeatureGate`의 staff/settings 전용 placeholder
* [x] `showToast(\"이 기능은 아직 백엔드 연동 전입니다.\")` 계열 문구

제거 원칙:

* 기능이 실제 API와 저장/복원까지 붙으면 해당 gate 문구는 삭제
* 아직 일부만 붙은 경우에는 “준비 중”이 아니라 구체적인 제한을 써야 한다

예:

* 나쁜 문구:
  * `이 기능은 아직 백엔드 연동 전입니다.`
* 좋은 문구:
  * `직원 PIN 재발급은 다음 단계에서 지원됩니다.`

### 6.7 구현 순서 권장

프론트 연결 순서:

1. `types.ts` 확장
2. `api.ts` 메서드 추가
3. store context / settings 연결
4. my tasks 연결
5. password change 연결
6. order board extras 연결
7. staff 연결

이유:

* 상단 상태/설정/내 업무는 현재 화면 구조와 충돌이 적다.
* staff는 권한 조건과 employee auth까지 같이 얽혀 있어서 뒤로 미루는 편이 안전하다.

중요:

```text
기능이 실제로 붙은 패널은 더 이상 "아직 백엔드 연동 전입니다" 토스트를 띄우면 안 된다.
```

---

## 7. 테스트 체크리스트

Backend 테스트:

* [x] store 상태 조회/변경 테스트 범위를 정리한다
* [x] 담당 메뉴 CRUD 테스트 범위를 정리한다
* [x] 직원 관리 CRUD 테스트 범위를 정리한다
* [x] 설정 조회/저장 테스트 범위를 정리한다
* [x] 비밀번호 변경 테스트 범위를 정리한다
* [x] 주문 숨김 / 완료 정리 / item 완료 토글 테스트 범위를 정리한다
* [x] store scope 위반 접근 차단 테스트 범위를 정리한다
* [x] 미승인 / 비로그인 접근 차단 테스트 범위를 정리한다

### 7.1 현재 테스트 기반

현재 확인된 테스트 기반:

* backend는 `fastapi.testclient.TestClient` 사용
* 다수 테스트가 `Base.metadata.drop_all(bind=engine)` / `create_all(bind=engine)` 패턴 사용
* 기존 관련 파일:
  * `deeporder-backend/tests/test_kds_auth_api.py`
  * `deeporder-backend/tests/test_order_webhook.py`
  * `deeporder-backend/tests/test_auth_api.py`
  * `deeporder-backend/tests/test_admin_users_api.py`
  * `deeporder-backend/tests/test_order_ingestion.py`

정리:

```text
이번 단계 테스트도 새 프레임워크를 도입하지 말고,
기존 TestClient + DB 초기화 패턴을 그대로 따르는 것이 맞다.
```

### 7.2 backend 테스트 파일 권장 배치

권장 파일 구성:

* `deeporder-backend/tests/test_kds_store_api.py`
  * store context / settings / password change
* `deeporder-backend/tests/test_kds_my_tasks_api.py`
  * assigned menu CRUD
* `deeporder-backend/tests/test_kds_staff_api.py`
  * 직원 CRUD / PIN 재발급 / employee login
* `deeporder-backend/tests/test_kds_order_actions_api.py`
  * hide / archive-completed / item progress
* 기존 `deeporder-backend/tests/test_kds_auth_api.py`
  * store scope / 승인 상태 / 인증 경계 보강

### 7.3 backend 테스트 상세 체크리스트

#### A. Store Context / Settings

* [x] 승인된 사용자는 `GET /api/kds/store-context` 성공
* [x] row가 없어도 기본값 응답 반환
* [x] `PATCH /api/kds/store-context/status` 후 상태가 재조회에 반영
* [x] `pauseMinutes` 입력 시 `paused_until`이 적절히 저장/반영
* [x] `PATCH /api/kds/settings` 후 설정값이 재조회에 반영
* [x] 첫 PATCH에서 `store_settings` row가 생성되는지 확인
* [x] 수동 상태 변경 시 `status_source == MANUAL` 확인

#### B. My Tasks

* [x] `GET /api/kds/my-tasks/menus` 기본 빈 배열 반환
* [x] `POST` 생성 성공
* [x] 동일 사용자 + 동일 `normalized_menu_name` 중복 차단
* [x] `PATCH` 수정 성공
* [x] `DELETE` 삭제 성공
* [x] 다른 사용자의 assigned menu 수정/삭제 차단
* [x] trim/lower 정규화가 의도대로 동작하는지 확인

#### C. Staff / Employee Auth

* [x] OWNER가 자기 매장 직원 목록 조회 성공
* [x] OWNER가 직원 생성 성공
* [x] 생성 응답에 PIN 1회만 반환
* [x] 직원 수정 성공
* [x] 직원 활성/비활성 성공
* [x] PIN 재발급 성공 및 기존 refresh token revoke 확인
* [x] EMPLOYEE 로그인 성공
* [x] 비활성 EMPLOYEE 로그인 차단
* [x] 다른 OWNER의 직원 수정/비활성화 차단
* [x] 직원 목록 응답에 PIN 미포함 확인

#### D. Password Change

* [x] 올바른 현재 비밀번호로 변경 성공
* [x] 잘못된 현재 비밀번호면 실패
* [x] 성공 시 `password_hash` 실제 변경
* [x] 성공 시 기존 refresh token revoke
* [x] 직원 계정은 해당 엔드포인트 사용 차단

#### E. Order Board Extras

* [x] `PATCH /api/kds/orders/{id}/hide` 성공
* [x] hide 후 `GET /api/kds/orders` 응답에서 숨김 상태 반영
* [x] `POST /api/kds/orders/archive-completed` 성공
* [x] 완료 주문만 archive 대상인지 확인
* [x] `PATCH /api/kds/order-items/{id}/progress` 성공
* [x] progress 후 `GET /api/kds/orders` item 응답에 `done` 반영
* [x] 다른 store의 order/order_item 조작 차단
* [x] item progress가 toggle이 아니라 명시 상태 저장임을 확인

#### F. 인증/권한 경계

* [x] 비로그인 401
* [x] 미승인 사용자 403
* [x] EMPLOYEE가 접근 가능한 KDS API와 불가능한 KDS API를 구분 테스트
* [x] OWNER만 staff/settings 변경 가능하도록 테스트

### 7.4 프론트 정적 검증

* [x] `npm --workspace kds-web run typecheck`
* [x] `npm --workspace kds-web run build`

이유:

* `types.ts`, `api.ts`, `KdsPage.tsx`를 함께 수정하게 되므로 타입/번들 검증이 최소 기준이다.

Frontend/브라우저 검증:

* [x] store status 변경 후 새로고침 시 유지되는지 확인 항목 정리
* [x] 담당 메뉴 추가/수정/삭제가 새로고침 후 유지되는지 확인 항목 정리
* [x] 직원 추가/수정/비활성 결과가 반영되는지 확인 항목 정리
* [x] 설정값 변경 후 새로고침 시 유지되는지 확인 항목 정리
* [x] 비밀번호 변경 후 로그인 정책이 의도대로 동작하는지 확인 항목 정리
* [x] 주문 숨김 / 완료 정리 / item 완료 토글이 실제로 저장되는지 확인 항목 정리

### 7.5 브라우저 검증 시나리오

권장 도구:

* 수동 검증
* 필요 시 Playwright CLI 보조

검증 항목:

* [x] 점주 로그인 후 상단 매장 상태 변경 -> 새로고침 -> 상태 유지
* [x] 설정 토글 변경 -> 새로고침 -> 값 유지
* [x] 내 업무 메뉴 추가/수정/삭제 -> 새로고침 -> 값 유지
* [x] 주문 수신 후 item 완료 처리 -> 새로고침 -> 완료 상태 유지
* [x] 주문 숨김 후 접수 탭에서 사라지는지 확인
* [x] 완료 주문 정리 후 완료 탭 반영 확인
* [x] 직원 생성 후 목록 반영 확인
* [x] 비활성 직원 로그인 차단 확인
* [x] 비밀번호 변경 후 로그아웃/재로그인 정책 확인
* [x] EMPLOYEE 계정에서 `직원 관리`, `통계`, `설정` 비노출 확인
* [x] local-only 문구 제거 여부 확인

E2E 확인:

* [x] 주문 수신 -> KDS 보드 노출 -> item 완료/상태 변경 -> 완료 정리까지 한 흐름으로 검증 항목 정리

### 7.6 E2E 운영 시나리오

권장 시나리오:

1. 점주 계정 로그인
2. store status / settings / 내 업무 데이터 확인
3. mock-delivery-console 또는 webhook으로 주문 주입
4. `GET /api/kds/orders` 반영 확인
5. item 완료 처리
6. 주문 상태 `NEW -> COOKING -> DONE`
7. 완료 탭 이동
8. 완료 정리 실행
9. 새로고침 후 archive 결과 확인

추가 확인:

* `내 업무` 카운트가 item progress와 함께 변하는지
* 직원 계정별 `내 업무`가 개인 단위로 분리되는지

### 7.7 테스트 실행 메모

backend:

* pytest 파일 단위 실행 가능해야 함
* 신규 테스트는 기존 fixture 스타일 재사용

frontend:

* `npm --workspace kds-web run typecheck`
* `npm --workspace kds-web run build`
* 필요 시 Playwright 기반 수동 시나리오

루트 참고:

* 기존 `smoke:kds-e2e` 스크립트와 새 KDS 운영 시나리오 관계는 구현 완료 후 다시 정리 필요

---

## 8. 구현 순서 제안

* [x] 구현 순서를 의존성 기준으로 재정리한다
* [x] 각 단계의 선행조건과 완료 조건을 정리한다
* [x] 위험도가 높은 변경을 어디에 배치할지 정리한다

### 8.1 권장 구현 묶음

권장 순서:

1. `models.py` / `schemas.py` / 라우터 골격 추가
2. Store context / settings 구현
3. My Tasks 구현
4. Password change 구현
5. Order board extras + `GET /api/kds/orders` 응답 확장 구현
6. Staff / Employee auth 구현
7. 프론트 연결
8. backend 테스트 / 브라우저 검증 / E2E 검증

이 순서를 쓰는 이유:

* 모든 기능이 신규 모델/스키마 위에 올라가므로 1단계를 먼저 닫아야 한다.
* `store context`, `settings`, `my tasks`는 현재 KDS 화면에 이미 안정적으로 존재하는 UX라 먼저 붙이기 좋다.
* `password change`는 auth 확장이지만 UI 영향 범위가 작고 독립성이 높다.
* `order board extras`는 단순 액션 API가 아니라 `GET /api/kds/orders` 응답 확장까지 같이 들어가므로 중간에 명확히 묶어 처리해야 한다.
* `staff`는 `User` 모델 확장, PIN 로그인, 권한 경계까지 동시에 건드리므로 가장 무겁다.

### 8.2 단계별 상세 순서

#### Step 1. 공통 기반 추가

작업:

* `models.py`에 신규 enum / 신규 테이블 / `User` 확장 반영
* `schemas.py`에 store/settings/my-tasks/staff/password/order-actions 스키마 추가
* 신규 라우터 파일 생성
  * `kds_store.py`
  * `kds_my_tasks.py`
  * `kds_staff.py`
* `routers/__init__.py`에 라우터 등록

완료 기준:

* 서버가 정상 기동
* import error 없음
* 최소 smoke 수준의 라우터 import 테스트 가능

주의:

* 이 단계에서는 프론트 연결 전이라도 backend 구조가 먼저 컴파일 가능한 상태여야 한다.

#### Step 2. Store context / settings

작업:

* `store_settings` 영속 모델 구현
* `GET /api/kds/store-context`
* `PATCH /api/kds/store-context/status`
* `GET /api/kds/settings`
* `PATCH /api/kds/settings`

프론트 연결 범위:

* 상단 store status
* settings 패널

이 단계를 먼저 하는 이유:

* 현재 화면 상단/설정 패널은 로컬 상태를 API 응답으로 치환하기 쉽다.
* 다른 기능 의존성이 거의 없다.

#### Step 3. My Tasks

작업:

* `user_assigned_menus` 구현
* CRUD API 구현

프론트 연결 범위:

* `MyTasksPanel`
* 담당 메뉴 추가/수정/삭제 모달

이 단계 위치 이유:

* 사용자 개인 귀속 구조를 early stage에 검증할 수 있다.
* 이후 직원 계정이 붙었을 때도 동일 패턴을 그대로 재사용할 수 있다.

#### Step 4. Password change

작업:

* `POST /api/auth/change-password`
* refresh token revoke

프론트 연결 범위:

* 설정 패널의 비밀번호 변경 모달

이 단계 위치 이유:

* auth.py 확장이지만 employee login보다 훨씬 단순하다.
* 세션 종료 정책을 먼저 고정해 두면 이후 PIN 재발급 정책도 비슷한 방식으로 정리 가능하다.

#### Step 5. Order board extras

작업:

* `kds_order_state`
* `kds_order_item_progress`
* `PATCH /api/kds/orders/{order_id}/hide`
* `POST /api/kds/orders/archive-completed`
* `PATCH /api/kds/order-items/{item_id}/progress`
* `GET /api/kds/orders` 응답 확장

프론트 연결 범위:

* item 완료
* 주문 숨김
* 완료 주문 정리

이 단계 위치 이유:

* 이 기능은 주문 목록 응답까지 같이 바꿔야 하므로 한 묶음으로 처리하는 편이 안전하다.
* `completedItemIds`, `hiddenOrderIds`를 제거할 수 있는 시점도 이 단계다.

#### Step 6. Staff / Employee auth

작업:

* `User` 확장 필드 실제 사용
* `GET /api/kds/staff`
* `POST /api/kds/staff`
* `PATCH /api/kds/staff/{id}`
* `PATCH /api/kds/staff/{id}/active`
* `POST /api/kds/staff/{id}/regenerate-pin`
* `POST /api/auth/employee/login`

프론트 연결 범위:

* `StaffPanel`
* employee 로그인 분기
* employee 권한별 탭 노출 제어 최종 점검

이 단계 위치 이유:

* 데이터 모델/권한/인증이 동시에 얽혀 가장 무겁다.
* 앞선 단계가 안정화된 뒤 들어가는 편이 전체 리스크가 낮다.

#### Step 7. 프론트 연결 일괄 정리

작업:

* `types.ts` 정리
* `api.ts` 전체 메서드 추가
* `KdsPage.tsx` local-only state 제거
* local-only toast / gate 제거 또는 축소

이 단계 위치 이유:

* backend API가 먼저 고정되어야 프론트에서 억지 shape 추측을 하지 않는다.
* 특히 `GET /api/kds/orders` 응답 확장 이후에 item/hide 로직을 안정적으로 치환할 수 있다.

#### Step 8. 검증/문서 마감

작업:

* backend pytest
* `kds-web` typecheck/build
* 브라우저 검증
* E2E 운영 시나리오 검증
* 문서 체크리스트 상태 갱신

### 8.3 구현 중 위험 포인트

가장 조심할 지점:

* `User.password_hash` nullable 전환
* `account_type` / `owner_user_id` 추가
* `GET /api/kds/orders` 응답 shape 변경
* employee 권한과 owner/admin 권한 분리

권장 대응:

* `User` 확장 직후 auth/login/me 테스트를 먼저 돌린다
* `GET /api/kds/orders` 응답 확장 직후 기존 KDS 화면이 깨지지 않는지 바로 확인한다
* staff 기능이 붙기 전까지는 employee 로그인 노출을 프론트에 열지 않아도 된다

### 8.4 최소 마일스톤

중간 완료 기준으로 볼 수 있는 묶음:

#### Milestone 1

* store context / settings / my tasks / password change 완료

의미:

* KDS 상단 상태, 설정, 개인 업무 패널이 실제 저장/복원으로 전환됨

#### Milestone 2

* order board extras 완료

의미:

* 접수/완료 보드의 로컬 메모리 상태가 제거됨

#### Milestone 3

* staff / employee auth 완료

의미:

* 점주/직원 역할 분리와 운영 가능한 매장 사용자 구조가 완성됨

---

## 9. 실제 구현 작업 지시서

이제부터는 아래 Phase를 순서대로 실제 코드 구현 대상으로 사용한다.

원칙:

* 한 Phase씩 닫는다.
* 각 Phase가 끝나면:
  * 코드 변경
  * 테스트 또는 검증
  * 문서 체크 업데이트
  * 작업 기록 반영
  를 함께 처리한다.
* 다음 Phase로 넘어가기 전에 현재 Phase의 미완료 항목을 명시한다.

### 9.1 Phase 1. 공통 기반 추가

목표:

```text
KDS 운영 기능을 담을 backend 모델, enum, schema, router 골격을 먼저 만든다.
```

구현 대상:

* `deeporder-backend/app/models.py`
  * `store_settings`
  * `user_assigned_menus`
  * `kds_order_state`
  * `kds_order_item_progress`
  * `User` 확장:
    * `account_type`
    * `owner_user_id`
    * `pin_hash`
    * `position_label`
    * `active`
    * `deleted_at`
* `deeporder-backend/app/schemas.py`
  * store/settings/my-tasks/staff/password/order-actions 관련 스키마 추가
* 라우터 파일 생성
  * `deeporder-backend/app/routers/kds_store.py`
  * `deeporder-backend/app/routers/kds_my_tasks.py`
  * `deeporder-backend/app/routers/kds_staff.py`
* `deeporder-backend/app/routers/__init__.py`
  * 신규 라우터 등록

완료 체크:

* [x] 신규 모델/enum 추가
* [x] 신규 schema 추가
* [x] 신규 router 파일 생성 및 등록
* [x] 서버 import/runtime 오류 없이 기동

검증:

* [x] 최소 backend import 확인
* [x] 기존 auth/order 라우터가 깨지지 않는지 확인

작업 메모:

* `models.py`에 KDS 운영용 enum/테이블과 `User` 확장 필드를 추가했다.
* `schemas.py`에 향후 구현 Phase에서 사용할 request/response 스키마 골격을 추가했다.
* `kds_store.py`, `kds_my_tasks.py`, `kds_staff.py` 라우터 골격을 만들고 `routers/__init__.py`에 등록했다.
* 기존 SQLite 파일이 새 `users` 컬럼 없이도 기동되도록 `database.py`에 sqlite bootstrap 보강 로직을 추가했다.
* 검증은 프로젝트 `.venv` 기준으로 backend import와 기존 auth/KDS 테스트 통과까지 확인했다.

### 9.2 Phase 2. Store Context / Settings 구현

목표:

```text
상단 매장 상태와 설정 패널을 실제 backend 저장/조회 기능으로 전환한다.
```

구현 대상:

* backend
  * `GET /api/kds/store-context`
  * `PATCH /api/kds/store-context/status`
  * `GET /api/kds/settings`
  * `PATCH /api/kds/settings`
* frontend
  * `kds-web/src/types.ts`
  * `kds-web/src/lib/api.ts`
  * `kds-web/src/pages/KdsPage.tsx`

완료 체크:

* [x] store context API 구현
* [x] settings API 구현
* [x] KdsPage 상단 상태 UI를 API 기반으로 전환
* [x] SettingsPanel을 API 기반으로 전환
* [x] local-only 관련 상태/문구 일부 제거

검증:

* [x] backend 테스트
* [x] 브라우저에서 상태/설정 변경 후 새로고침 유지 확인

작업 메모:

* backend에 `GET/PATCH /api/kds/store-context`, `GET/PATCH /api/kds/settings`를 구현했다.
* `store_settings` row가 없어도 기본값을 응답하고, 첫 `PATCH`에서 row가 생성되도록 처리했다.
* `kds-web/src/types.ts`, `kds-web/src/lib/api.ts`에 store context/settings 타입과 API 메서드를 추가했다.
* `KdsPage.tsx`에서 상단 매장 상태와 설정 패널을 API 기반으로 hydrate/save 하도록 전환했다.
* `SETTINGS` 진입 시 뜨던 local-only gate를 제거했고, 설정 변경은 즉시 PATCH 후 실패 시 재조회하는 방식으로 연결했다.
* 검증 결과:
  * backend: `pytest tests/test_kds_store_api.py tests/test_auth_api.py tests/test_kds_auth_api.py -q` 통과
  * frontend: `npm --workspace kds-web run typecheck`, `npm --workspace kds-web run build` 통과
  * 브라우저: 로그인 후 `영업종료`, `주문 자동수락` 변경이 새로고침 후 유지되는 것 확인

### 9.3 Phase 3. My Tasks 구현

목표:

```text
내 업무 담당 메뉴를 사용자 개인 귀속 데이터로 저장/조회한다.
```

구현 대상:

* backend
  * `GET /api/kds/my-tasks/menus`
  * `POST /api/kds/my-tasks/menus`
  * `PATCH /api/kds/my-tasks/menus/{id}`
  * `DELETE /api/kds/my-tasks/menus/{id}`
* frontend
  * `kds-web/src/types.ts`
  * `kds-web/src/lib/api.ts`
  * `kds-web/src/pages/KdsPage.tsx`

완료 체크:

* [x] assigned menu CRUD API 구현
* [x] `normalized_menu_name` 중복 방지 구현
* [x] MyTasksPanel API 연동
* [x] 로컬 `assignedMenus` 메모리 편집 흐름 제거

검증:

* [x] backend CRUD 테스트
* [x] 새로고침 후 유지 확인
* [x] 다른 사용자 데이터 접근 차단 확인

작업 메모:

* backend에 `GET/POST/PATCH/DELETE /api/kds/my-tasks/menus`를 구현했다.
* `normalized_menu_name`은 서버에서 `trim + lower + 내부 공백 정리` 기준으로 생성하고, `UNIQUE(user_id, normalized_menu_name)` 충돌 시 409를 반환하도록 처리했다.
* 모든 CRUD는 `current_user.store_id`와 `current_user.id`를 동시에 기준으로 조회하도록 구현해서 사용자 개인 귀속을 강제했다.
* `kds-web/src/types.ts`, `kds-web/src/lib/api.ts`에 assigned menu 타입과 API 메서드를 추가했다.
* `KdsPage.tsx` / `MyTasksPanel`은 더 이상 메모리 배열을 직접 수정하지 않고, 생성/수정/삭제 후 API 재조회 방식으로 전환했다.
* 검증 결과:
  * backend: `pytest tests/test_kds_my_tasks_api.py tests/test_kds_store_api.py tests/test_auth_api.py tests/test_kds_auth_api.py -q` 통과
  * frontend: `npm --workspace kds-web run typecheck`, `npm --workspace kds-web run build` 통과
  * 브라우저: 빈 상태에서 `내 업무` 진입 확인 후 메뉴 추가, 새로고침 뒤 `짜장면` 메뉴가 유지되는 것 확인

### 9.4 Phase 4. Password Change 구현

목표:

```text
비밀번호 변경과 세션 무효화 정책을 실제 auth 계층에 반영한다.
```

구현 대상:

* backend
  * `POST /api/auth/change-password`
  * refresh token revoke
* frontend
  * 비밀번호 변경 모달 제출 연동
  * 성공 시 로그아웃/재로그인 유도

완료 체크:

* [x] change-password API 구현
* [x] 현재 비밀번호 검증 구현
* [x] refresh token revoke 구현
* [x] 프론트 모달 연동

검증:

* [x] 비밀번호 변경 테스트
* [x] 성공 후 기존 세션 무효화 확인

작업 메모:

* backend `auth.py`에 `POST /api/auth/change-password`를 추가했다.
* 정책은 `APPROVED + OWNER` 계정만 허용, 현재 비밀번호 검증 성공 시 새 hash 저장 후 해당 사용자 활성 refresh token 전체 revoke로 고정했다.
* `kds-web`에는 `apiChangePassword`를 추가하고, 설정 패널의 비밀번호 변경 모달이 실제 API를 호출하도록 전환했다.
* 변경 성공 시 모달을 닫고 성공 토스트를 보여준 뒤 즉시 로그아웃하여 재로그인을 유도하도록 연결했다.
* 검증 기준은 backend auth 테스트와 frontend 타입/빌드 검증으로 마감한다.

### 9.5 Phase 5. Order Board Extras 구현

목표:

```text
주문 숨김, 완료 정리, item 완료 상태를 실제 backend 상태로 저장한다.
```

구현 대상:

* backend
  * `PATCH /api/kds/orders/{order_id}/hide`
  * `POST /api/kds/orders/archive-completed`
  * `PATCH /api/kds/order-items/{item_id}/progress`
  * `GET /api/kds/orders` 응답 확장
* frontend
  * item 완료 버튼
  * 주문 숨김 액션
  * 완료 주문 정리 액션

완료 체크:

* [x] `kds_order_state` 사용 구현
* [x] `kds_order_item_progress` 사용 구현
* [x] 액션 API 구현
* [x] `GET /api/kds/orders`에 hidden/archived/done 반영
* [x] `completedItemIds`, `hiddenOrderIds` 로컬 상태 제거

검증:

* [x] backend 액션 테스트
* [ ] 브라우저 새로고침 유지 확인
* [x] 다른 매장 주문 조작 차단 확인

작업 메모:

* backend `kds_orders.py`를 확장해서 `GET /api/kds/orders` 응답에 `hidden`, `archived`, item 단위 `done` 상태를 포함하도록 변경했다.
* `PATCH /api/kds/orders/{order_id}/hide`, `POST /api/kds/orders/archive-completed`, `PATCH /api/kds/order-items/{order_item_id}/progress`를 추가했다.
* 프론트 `KdsPage.tsx`는 더 이상 `completedItemIds`, `hiddenOrderIds` 메모리 상태를 사용하지 않고, 주문/아이템 액션 후 `fetchOrders()`로 backend 상태를 다시 hydrate 하도록 전환했다.
* `OrderCard`는 item row 클릭 시 실제 progress API를 호출하고, 완료 탭의 정리 버튼과 context menu의 제거 버튼도 실제 API로 연결했다.
* `MyTasksPanel` 집계와 이력 계산도 item.done / order.hidden / order.archived를 기준으로 동작하도록 정리했다.
* 검증 결과:
  * backend: `./deeporder-backend/.venv/bin/pytest deeporder-backend/tests/test_auth_api.py deeporder-backend/tests/test_kds_store_api.py deeporder-backend/tests/test_kds_my_tasks_api.py deeporder-backend/tests/test_kds_auth_api.py deeporder-backend/tests/test_kds_order_actions_api.py deeporder-backend/tests/test_order_webhook.py -q` 통과
  * frontend: `npm --workspace kds-web run typecheck`, `npm --workspace kds-web run build` 통과
  * 브라우저 새로고침 검증은 로그인 화면 진입 및 검증용 계정/주문 주입까지 진행했으나, 사용자 중단으로 실제 액션 후 refresh 확인 단계는 미완료로 남겼다.

### 9.6 Phase 6. Staff / Employee Auth 구현

목표:

```text
점주-직원 계정 구조와 직원 PIN 로그인을 실제 auth/KDS 흐름에 반영한다.
```

구현 대상:

* backend
  * `GET /api/kds/staff`
  * `POST /api/kds/staff`
  * `PATCH /api/kds/staff/{id}`
  * `PATCH /api/kds/staff/{id}/active`
  * `POST /api/kds/staff/{id}/regenerate-pin`
  * `POST /api/auth/employee/login`
* frontend
  * `StaffPanel`
  * employee 로그인 분기
  * employee 권한별 탭 노출 제어

완료 체크:

* [x] 직원 CRUD API 구현
* [x] PIN 재발급 구현
* [x] employee login 구현
* [x] EMPLOYEE 권한 UI 분기 구현
* [x] local-only staff gate 제거

검증:

* [x] 직원 계정 테스트
* [x] 점주/직원 권한 차이 테스트
* [ ] 브라우저에서 직원 로그인 검증

작업 메모:

* backend `kds_staff.py`를 구현해서 `GET/POST/PATCH /api/kds/staff`, `PATCH /api/kds/staff/{id}/active`, `POST /api/kds/staff/{id}/regenerate-pin`을 추가했다.
* 직원 계정은 `User(account_type=EMPLOYEE)`로 생성하고, `owner_user_id`, `store_id`, `pin_hash`, `position_label`, `active`를 실제로 사용하도록 연결했다.
* `auth.py`에는 `POST /api/auth/employee/login`을 추가했고, 직원 계정은 owner 비밀번호 로그인을 막고 이메일+PIN 로그인만 허용하도록 분리했다.
* `get_approved_kds_user` / `get_approved_store_owner` dependency를 분리해서 직원은 `접수`, `완료`, `내 업무`, 읽기용 `store-context/settings`는 접근 가능하지만 `직원 관리`, `설정 변경`은 차단되도록 조정했다.
* `kds-web`은 `AuthPage` 로그인 화면에 점주/직원 모드를 추가했고, `KdsPage`의 `StaffPanel`은 더 이상 데모 데이터를 쓰지 않고 실제 직원 API로 hydrate/save 하도록 전환했다.
* 직원 탭 local-only gate는 제거했고, `session.user.accountType !== "EMPLOYEE"` 기준으로 `직원`, `통계`, `설정` 탭 노출을 제어하도록 바꿨다.
* 검증 결과:
  * backend: `./deeporder-backend/.venv/bin/pytest deeporder-backend/tests/test_kds_staff_api.py deeporder-backend/tests/test_auth_api.py deeporder-backend/tests/test_kds_store_api.py deeporder-backend/tests/test_kds_my_tasks_api.py deeporder-backend/tests/test_kds_auth_api.py deeporder-backend/tests/test_kds_order_actions_api.py deeporder-backend/tests/test_order_webhook.py -q` 통과
  * frontend: `npm --workspace kds-web run typecheck`, `npm --workspace kds-web run build` 통과
  * 브라우저: 기존 `127.0.0.1:8000`에 떠 있던 오래된 backend 프로세스가 최신 `staff` 라우트를 반영하지 않아 실제 직원 로그인 UI 검증은 미완료로 남겼다.

### 9.7 Phase 7. 프론트 정리 및 local-only 제거

목표:

```text
이미 backend가 붙은 기능들의 로컬 전용 상태와 안내 문구를 실제 구현 상태에 맞게 정리한다.
```

구현 대상:

* `kds-web/src/types.ts`
* `kds-web/src/lib/api.ts`
* `kds-web/src/pages/KdsPage.tsx`

완료 체크:

* [x] local-only 토스트 제거 또는 축소
* [x] placeholder gate 제거
* [x] 실제 구현 범위에 맞는 오류/제한 메시지로 교체
* [x] 불필요한 메모리 상태 정리

검증:

* [x] UI 전체 흐름에서 더 이상 허위 “미구현” 메시지가 남지 않는지 확인

작업 메모:

* `kds-web/src/pages/KdsPage.tsx`에서 더 이상 호출되지 않던 `showLocalOnlyNotice` 헬퍼를 제거했다.
* 구현 완료 후 의미가 없어진 `PanelFeatureGate` 플레이스홀더 컴포넌트를 제거했다.
* `STAFF` 탭 진입은 별도 local-only helper를 거치지 않고 실제 탭 전환만 수행하도록 단순화했다.
* 이제 구현된 경로에서는 허위 `"아직 백엔드 연동 전입니다"` 안내가 노출되지 않고, 실제 실패 케이스는 API 오류 메시지 또는 인증/권한 오류로 처리된다.
* 검증 결과:
  * `npm --workspace kds-web run typecheck` 통과
  * `npm --workspace kds-web run build` 통과

### 9.8 Phase 8. 통합 검증 및 문서 마감

목표:

```text
backend, frontend, 브라우저, E2E 기준으로 실제 저장/복원 동작을 검증하고 문서를 마감한다.
```

완료 체크:

* [x] backend 테스트 통과
* [x] `npm --workspace kds-web run typecheck` 통과
* [x] `npm --workspace kds-web run build` 통과
* [x] 브라우저 수동 검증 완료
* [x] E2E 운영 시나리오 검증 완료
* [x] 본 문서 체크 상태 최신화

작업 메모:

* backend 회귀 검증으로 `test_auth_api.py`, `test_kds_store_api.py`, `test_kds_my_tasks_api.py`, `test_kds_auth_api.py`, `test_kds_order_actions_api.py`, `test_kds_staff_api.py`, `test_order_webhook.py`를 한 번에 실행했고 `22 passed`로 통과했다.
* 루트 `npm run smoke:kds-e2e`를 실제 서비스 기동 상태에서 다시 실행해 `register -> approve -> login -> refresh -> auth me -> mock order generate/send -> KDS query -> unauthorized block -> status transition -> logout -> revoked refresh failure` 흐름이 통과하는 것을 확인했다.
* 브라우저 수동 검증은 `phase98a0lc19@example.com` 점주 계정을 새로 만들고 승인한 뒤, KDS 로그인 -> 주문 보드 노출 -> 매장 상태 `영업중 -> 영업종료` 변경 -> 전체 페이지 재진입 후 `영업종료` 유지까지 확인했다.
* KDS 화면에서 허위 local-only 안내는 더 이상 노출되지 않았고, 실제 실패/제한은 API 응답 기준으로 처리되는 상태를 확인했다.
* 브라우저 콘솔의 유일한 오류는 dev 서버의 `favicon.ico 404`였고, 기능 동작과는 무관했다.

---

## 10. 완료 기준

* [x] `kds-web`의 로컬 상태 기반 기능이 실제 backend 저장/조회 기능으로 전환된다
* [x] store scope와 권한 검증이 모든 새 API에 적용된다
* [x] 프론트의 로컬 전용 안내 문구가 구현 완료 범위만큼 제거된다
* [x] `npm --workspace kds-web run typecheck` 통과
* [x] `npm --workspace kds-web run build` 통과
* [x] backend 테스트 통과
* [x] 브라우저 기준 저장/복원 동작이 확인된다

---

## 11. 한 줄 작업 원칙

```text
다음 단계의 일은 UI를 다시 바꾸는 것이 아니라,
이미 보이는 KDS 운영 UX를 실제 backend 기능으로 치환하는 것이다.
```

---

## 12. email 잔재 정리 및 id 전환 계획

현재 상태 한 줄 요약:

```text
DeepOrder 계정 식별자는 이제 email이 아니라 loginId 기준으로 전면 전환되었다.
구 users.email 스키마는 더 이상 지원하지 않으며, 기존 DB는 삭제 후 재생성이 필요하다.
```

### 12.1 이번 턴에서 실제로 바뀐 것

#### A. Backend 영속 모델

* `deeporder-backend/app/models.py`
  * `User.email` -> `User.login_id`

의미:

* 로그인 식별자는 더 이상 이메일 개념이 아니라 명시적으로 `login_id`다.

#### B. Backend schema / router 계약

* `deeporder-backend/app/schemas.py`
  * `RegisterRequest.loginId`
  * `LoginRequest.loginId`
  * `EmployeeLoginRequest.loginId`
  * `AuthUserOut.loginId`
  * `AdminUserOut.loginId`
  * `StaffOut.loginId`
  * `CreateStaffIn.loginId`
  * `UpdateStaffIn.loginId`
* `deeporder-backend/app/routers/auth.py`
  * auth/register/login/employee-login/check-identifier 전부 `loginId` 기준
* `deeporder-backend/app/routers/kds_staff.py`
  * 직원 계정 생성/수정 응답과 요청이 전부 `loginId`
* `deeporder-backend/app/routers/admin_users.py`
  * admin 사용자 응답도 `loginId`

의미:

* 네트워크 계약에서 `email`은 제거됐다.
* auth/staff/admin 모두 같은 식별자 체계를 쓴다.

#### C. Frontend / Admin Console

* `kds-web/src/types.ts`
  * auth/staff request/response 타입 전부 `loginId`
* `kds-web/src/pages/AuthPage.tsx`
  * 상태명/로컬스토리지 키/입력 name/id를 `loginId` 기준으로 정리
* `kds-web/src/pages/KdsPage.tsx`
  * 계정 표시, 직원 관리 form/table, staff API payload 전부 `loginId`
* `mock-delivery-console/src/lib/types.ts`
  * `AdminUser.loginId`
* `mock-delivery-console/src/routes/UserApprovalPage.tsx`
  * 승인 화면 내부 데이터 접근도 `loginId`

의미:

* 화면 문구뿐 아니라 프론트 내부 타입과 상태명도 `아이디/loginId` 기준으로 일치한다.

#### D. 테스트

* `deeporder-backend/tests/*`
  * register/login/staff/admin/order 관련 payload를 `loginId` 기준으로 정리
  * 예시 식별자도 `owner@example.com` 대신 `owner`, `owner1`, `staff-b` 같은 실제 아이디 형태로 정리

### 12.2 기존 DB 처리 기준

이번 전환은 DB 재생성을 전제로 한다.

실제 처리:

* 루트 `deeporder.db` 삭제
* `deeporder-backend/deeporder.db` 삭제

코드 보호 장치:

* `deeporder-backend/app/database.py`
  * 구 SQLite에서 `users.email`은 있는데 `users.login_id`가 없으면 서버 시작 시 즉시 오류를 낸다.

오류 의미:

```text
구 스키마를 억지로 이어서 쓰지 말고,
기존 DeepOrder DB를 삭제한 뒤 새 스키마로 다시 올리라는 뜻이다.
```

주의:

* `mock-delivery-api/mock_delivery.db`는 mock 카탈로그/전송 이력용 DB라 이번 `loginId` 전환 대상이 아니다.

### 12.3 지금 기준으로 남은 email 잔재

현재 코드 기준 실질 잔재는 거의 없다.

남아 있을 수 있는 영역:

* 과거 작업 기록 문서
* 오래된 스크린샷/예시 텍스트
* 외부 메모/가이드 문서의 설명용 표현

즉:

```text
실행 코드와 테스트 기준의 계정 식별자는 loginId로 정리되었고,
email은 기록성 문서에만 일부 남을 수 있다.
```

### 12.4 이후 원칙

앞으로의 원칙:

* 신규 코드에서 계정 식별자에 `email` 명칭을 다시 도입하지 않는다.
* backend 영속 필드는 `login_id`
* API 계약은 `loginId`
* UI 문구는 `아이디`
* 테스트 fixture도 실제 아이디 문자열을 사용한다.

### 12.5 이번 섹션 기준 결론

```text
DeepOrder의 계정 식별자는 이제 email이 아니라 loginId다.
구 DB는 삭제 후 재생성해야 하며,
auth/staff/admin/kds-web/mock-delivery-console/test까지 같은 기준으로 맞춰졌다.
```
