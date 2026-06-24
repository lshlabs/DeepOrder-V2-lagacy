# 2. kds-web 백엔드 / DB 구현 아이디어 문서

## 1. 목적

이 문서는 `kds-web` 운영 기능을 지원하기 위한 backend / DB 확장 아이디어를 정리한다.

대상 기능:

```text
주문 상세정보
주문 제거 / 완료 내역 정리
운영 상태
통계
설정
비밀번호 변경
주문 자동수락
직원 생성
```

---

## 2. 주문 상세정보 API

주문 카드 롱클릭 후 상세정보를 보기 위한 API가 필요하다.

예시:

```http
GET /api/kds/orders/{order_id}
Authorization: Bearer <accessToken>
```

권한 정책:

```text
current_user.store_id와 order.store_id가 같아야 조회 가능
다른 매장 주문은 403
```

응답 포함 정보:

```text
주문번호
주문 시간
메뉴 / 옵션
요청사항
결제금액
플랫폼
주소
연락처
raw payload 일부
```

주소와 연락처는 민감정보이므로 목록 API에는 포함하지 않고 상세 API에서만 반환한다.

---

## 3. 주문 제거 / 숨김 처리

주문 카드의 `제거` 액션은 초기에는 실제 삭제보다 숨김 처리 또는 archive 처리로 구현하는 것이 안전하다.

권장 필드:

```text
Order
- kds_hidden_at nullable
- kds_hidden_by nullable
```

또는:

```text
Order
- archived_at nullable
```

API 예시:

```http
PATCH /api/kds/orders/{order_id}/hide
Authorization: Bearer <accessToken>
```

정책:

```text
주문 데이터는 DB에 남김
KDS 화면에서만 제외
store_id 권한 검증 필수
```

---

## 4. 완료 탭 내역 정리

완료 탭의 휴지통 버튼은 완료 주문을 KDS 화면에서 정리하는 기능이다.

API 예시:

```http
POST /api/kds/orders/clear-completed
Authorization: Bearer <accessToken>
```

처리:

```text
현재 store_id의 DONE 주문 중 아직 archived 되지 않은 주문을 archived 처리
```

권장:

```text
hard delete 금지
archive / hidden 처리
```

이유:

```text
통계 계산에 주문 데이터가 필요함
감사/디버깅을 위해 주문 이력을 보존하는 것이 안전함
```

---

## 5. 운영 상태 모델

매장의 운영 상태를 저장한다.

모델 예시:

```text
StoreOperationStatus
- id
- store_id
- status
- pause_until nullable
- updated_at
```

status:

```text
OPEN
PAUSED
CLOSED
```

일시중지:

```text
status = PAUSED
pause_until = 현재시각 + 선택 분
```

API:

```http
GET /api/kds/store/operation-status
PATCH /api/kds/store/operation-status
```

요청 예시:

```json
{
  "status": "PAUSED",
  "pauseMinutes": 10
}
```

자동 복귀 정책:

```text
pause_until이 지났으면 OPEN으로 간주
또는 백엔드 조회 시 status를 OPEN으로 보정
```

---

## 6. 통계 API

통계 탭을 위한 API.

초기 API:

```http
GET /api/kds/stats/today
Authorization: Bearer <accessToken>
```

응답:

```json
{
  "totalSalesAmount": 120000,
  "completedOrderCount": 18,
  "menuStats": [
    {
      "menuName": "짜장면",
      "quantity": 12,
      "salesAmount": 84000
    }
  ]
}
```

집계 기준:

```text
current_user.store_id 기준
DONE 주문 기준
오늘 날짜 기준
```

후속 확장:

```http
GET /api/kds/stats?from=2026-06-01&to=2026-06-17
```

---

## 7. 설정 저장

KDS 설정을 store 기준으로 저장한다.

모델 예시:

```text
StoreKdsSettings
- id
- store_id
- notification_enabled
- notification_sound
- break_time_enabled
- break_start_time
- break_duration_minutes
- auto_accept_orders
- created_at
- updated_at
```

API:

```http
GET /api/kds/settings
PATCH /api/kds/settings
```

설정 항목:

```text
알림 on/off
알림 사운드
브레이크타임
주문 자동수락
```

---

## 8. 브레이크타임 자동 일시중지

브레이크타임이 설정되어 있으면 해당 시각에 운영상태를 일시중지로 전환한다.

초기 구현 방향:

```text
백그라운드 스케줄러 없이, API 조회 시 현재 시간이 브레이크타임 범위인지 계산
범위 안이면 PAUSED로 간주
```

이 방식은 구현이 단순하고, 별도 worker가 필요 없다.

---

## 9. 비밀번호 변경

비밀번호 변경 API:

```http
PATCH /api/auth/password
Authorization: Bearer <accessToken>
```

요청:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

정책:

```text
현재 비밀번호 검증
새 비밀번호 hash 저장
현재 사용자의 refreshToken 전체 revoke
프론트는 로그아웃 처리
```

보안:

```text
newPassword 최소 길이 검증
기존 accessToken은 만료 전까지 살아 있을 수 있으므로 프론트에서 즉시 삭제
운영 확장 시 token version 또는 session invalidation 도입 가능
```

---

## 10. 주문 자동수락

`auto_accept_orders` 설정에 따라 주문 수신 후 상태 처리 방식을 나눈다.

정책:

```text
auto_accept_orders = true
→ webhook 수신 주문을 바로 KDS 진행중에 표시

auto_accept_orders = false
→ 주문을 PENDING_ACCEPTANCE로 두고 수락 후 진행중 표시
```

필요한 상태 확장:

```text
Order.status
PENDING_ACCEPTANCE
NEW
COOKING
DONE
CANCELLED
```

초기에는 UI만 준비하고 실제 상태 확장은 후속으로 미룰 수 있다.

---

## 11. 직원 생성 모델

직원은 일반 User 회원가입이 아니라 매장주가 생성한다.

모델:

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

API:

```http
GET /api/kds/staff
POST /api/kds/staff
PATCH /api/kds/staff/{member_id}
POST /api/kds/staff/{member_id}/reset-pin
PATCH /api/kds/staff/{member_id}/deactivate
```

권한:

```text
매장주 accessToken 필요
current_user.store_id 기준으로만 직원 관리 가능
```

---

## 12. 완료 기준

```text
주문 상세정보 API가 민감정보를 안전하게 반환한다.
주문 제거는 hard delete가 아니라 archive/hidden 처리된다.
운영 상태를 저장하고 변경할 수 있다.
통계 API가 store_id 기준으로 집계한다.
설정 API가 store_id 기준으로 저장된다.
비밀번호 변경 시 refreshToken이 revoke된다.
매장주가 직원 계정을 생성할 수 있다.
모든 API는 current_user.store_id 권한 검증을 통과해야 한다.
```

---