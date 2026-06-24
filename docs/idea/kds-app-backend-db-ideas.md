# 4. kds-app 백엔드 / DB 구현 아이디어 문서

## 1. 목적

이 문서는 `kds-app`의 직원 로그인, 개인 음식 탭, 담당 음식 알림, 작업 완료 숫자를 지원하기 위한 backend / DB 구조를 정리한다.

핵심 기능:

```text
직원 PIN 로그인
직원 개인 음식 탭
음식명 기반 주문 item 필터링
작업 완료 기록
완료 숫자 집계
앱 알림 대상 계산
```

---

## 2. 직원 모델

직원은 일반 `User`로 가입하지 않는다.

매장주가 생성한 `StoreMember`로 관리한다.

```text
StoreMember
- id
- store_id
- display_name
- role
- pin_hash
- status
- created_at
- updated_at
```

role:

```text
OWNER
STAFF
```

status:

```text
ACTIVE
INACTIVE
```

---

## 3. 직원 로그인 API

```http
POST /api/kds/staff/login
```

요청:

```json
{
  "storeId": "STORE_001",
  "pin": "1234"
}
```

처리:

```text
store_id 확인
ACTIVE 상태 직원 조회
pin_hash 검증
staffAccessToken 발급
```

토큰 payload 최소화:

```text
sub = store_member_id
type = staff
exp = 만료시간
```

store_id와 권한은 요청마다 DB에서 확인한다.

---

## 4. 직원 개인 탭 모델

### StaffFoodTab

```text
StaffFoodTab
- id
- store_member_id
- store_id
- name
- sort_order
- is_active
- created_at
- updated_at
```

### StaffFoodTabMenu

```text
StaffFoodTabMenu
- id
- tab_id
- menu_name
- normalized_menu_name
- external_menu_id nullable
- created_at
```

초기에는 `menu_name` 기준으로 매칭한다.

후속 확장:

```text
catalog_menu_id
external_menu_id
menu alias
메뉴명 정규화
```

---

## 5. 직원 탭 API

### 목록

```http
GET /api/kds/staff/tabs
Authorization: Bearer <staffAccessToken>
```

### 생성

```http
POST /api/kds/staff/tabs
Authorization: Bearer <staffAccessToken>
```

요청:

```json
{
  "name": "면 담당",
  "menus": ["짜장면", "짬뽕", "간짜장"]
}
```

### 수정

```http
PATCH /api/kds/staff/tabs/{tab_id}
Authorization: Bearer <staffAccessToken>
```

### 삭제

```http
DELETE /api/kds/staff/tabs/{tab_id}
Authorization: Bearer <staffAccessToken>
```

권한:

```text
탭의 store_member_id가 current_staff.id와 같아야 함
다른 직원 탭 조회/수정/삭제 불가
```

---

## 6. 담당 탭 주문 조회

```http
GET /api/kds/staff/tabs/{tab_id}/items
Authorization: Bearer <staffAccessToken>
```

처리:

```text
현재 staff 확인
tab 소유권 확인
tab에 등록된 menu_name 목록 조회
현재 store의 진행중 주문 조회
OrderItem.name이 tab menu_name과 매칭되는 item만 반환
```

응답:

```json
{
  "orders": [
    {
      "orderId": 10,
      "orderNumber": "A1023",
      "items": [
        {
          "orderItemId": 101,
          "name": "짜장면",
          "quantity": 1,
          "completedCount": 0
        }
      ]
    }
  ]
}
```

---

## 7. 작업 완료 모델

### OrderItemWork

```text
OrderItemWork
- id
- order_item_id
- store_member_id
- staff_food_tab_id
- completed_quantity
- completed_at
- created_at
```

의미:

```text
특정 직원이 특정 탭에서 특정 주문 음식에 대해 몇 개를 완료 처리했는지 기록
```

---

## 8. 담당 음식 완료 API

```http
POST /api/kds/staff/order-items/{order_item_id}/work-completions
Authorization: Bearer <staffAccessToken>
```

요청:

```json
{
  "tabId": 1,
  "completedQuantity": 1
}
```

검증:

```text
staffAccessToken 유효
staff.store_id와 order.store_id 일치
tab_id가 해당 직원 소유인지 확인
order_item이 해당 store 주문인지 확인
completedQuantity가 1 이상인지 확인
기존 completedCount가 quantity를 초과하지 않도록 제한
```

처리:

```text
OrderItemWork 생성
completedCount 재계산 또는 증가
```

---

## 9. 완료 숫자 집계

`completedCount`는 `OrderItemWork.completed_quantity` 합계로 계산한다.

예시:

```text
짜장면 x3
OrderItemWork 1: completed_quantity = 2
OrderItemWork 2: completed_quantity = 1

completedCount = 3
```

메인 KDS 응답에 포함:

```json
{
  "id": 101,
  "name": "짜장면",
  "quantity": 3,
  "completedCount": 3
}
```

주의:

```text
completedCount는 주문 완료 여부를 자동 결정하지 않는다.
Order.status = DONE은 기존 메인 KDS 완료 버튼으로 처리한다.
```

---

## 10. 알림 대상 계산

신규 주문이 들어오면 알림 대상 직원을 계산한다.

조건:

```text
주문 item name이 직원 StaffFoodTabMenu.menu_name과 일치
직원이 ACTIVE 상태
직원이 알림 on 상태
```

알림 대상:

```text
담당 음식 탭에 해당 메뉴를 등록한 직원
전체 주문 알림을 켠 직원
매장주
```

후속 모델:

```text
StaffNotificationSettings
- id
- store_member_id
- notify_all_orders
- notify_assigned_foods
- sound_enabled
- push_token
```

---

## 11. 직원 상태 / 근태

후속 확장 모델:

```text
StaffAttendance
- id
- store_member_id
- clock_in_at
- clock_out_at
- status
- created_at
```

status:

```text
WORKING
BREAK
OFF
```

활용:

```text
BREAK 상태여도 알림은 받을 수 있음
OFF 상태면 알림 제외 가능
```

초기 구현에서는 담당 음식 탭과 완료 숫자를 우선한다.

---

## 12. 권한 정책

```text
직원은 자신의 store_id 주문만 조회 가능
직원은 자신의 탭만 조회/수정/삭제 가능
직원은 자신의 탭에 포함된 음식의 주문 item에만 작업 완료 가능
매장주는 kds-web에서 직원 생성/비활성화 가능
```

---

## 13. 구현 단계

### Phase 1. StoreMember

```text
StoreMember 모델
PIN hash
staffAccessToken 발급
```

### Phase 2. 직원 개인 탭

```text
StaffFoodTab
StaffFoodTabMenu
탭 CRUD
```

### Phase 3. 담당 주문 조회

```text
메뉴명 기준 OrderItem 필터링
담당 탭 item 응답
```

### Phase 4. 작업 완료 기록

```text
OrderItemWork
completedCount 집계
메인 KDS 응답 확장
```

### Phase 5. 알림

```text
알림 대상 계산
push token 저장
담당 음식 주문 알림
```

### Phase 6. 근태

```text
출근
퇴근
자리비움
복귀
```

---

## 14. 완료 기준

```text
직원이 매장코드 + PIN으로 로그인할 수 있다.
staffAccessToken으로 직원 API를 호출할 수 있다.
직원은 본인 탭만 관리할 수 있다.
직원 탭은 음식명 기준으로 주문 item을 필터링한다.
담당 음식 완료 시 OrderItemWork가 생성된다.
메인 KDS 응답에 completedCount가 포함된다.
completedCount가 주문 전체 완료를 자동 결정하지 않는다.
알림 대상 계산이 가능하다.
```

