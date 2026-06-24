DeepOrder v2의 `mock-delivery-console` 회원 관리 UI와 관련 Admin API를 개선해줘.

## 작업 목적

현재 `mock-delivery-console`의 회원 관리 탭에서 승인된 회원에게도 `승인` 버튼이 비활성 상태로 남아 있고, `거절` 버튼도 그대로 노출된다.
승인 완료된 회원에게 `승인/거절` 액션이 남아 있는 것은 논리적으로 맞지 않으므로, 다른 관리 화면의 UI와 일관되게 `수정(펜)` / `삭제(휴지통)` 액션으로 변경한다.

또한 `kds-web` 가입 사용자의 `store_id`와 `mock-delivery-console` 메뉴관리에서 생성한 매장의 `store_id`를 연결/동기화할 수 있도록 한다.

---

## 현재 가정

예시:

```text
메뉴관리에서 생성된 매장의 store_id = abc
kds-web에서 가입 완료된 회원의 store_id = def
```

회원 관리에서 해당 회원을 수정할 때, 메뉴관리에서 생성된 매장 `abc`를 드롭다운으로 선택할 수 있어야 한다.

저장 시에는 선택한 매장을 해당 회원의 매장으로 연결하고, 최종적으로 회원이 사용하는 store context가 올바르게 맞아야 한다.

이 과정에서 단순히 화면 값만 바꾸지 말고, backend DB의 `User`, `Store`, 주문/메뉴/웹훅 관련 store 참조가 깨지지 않도록 구현해야 한다.

---

## 1. 회원 관리 테이블 액션 UI 수정

대상:

```text
mock-delivery-console 회원 관리 탭
```

현재 문제:

```text
이미 승인된 회원의 관리 열에 승인 버튼이 비활성 상태로 남아 있음
거절 버튼도 계속 노출됨
```

수정 방향:

```text
가입대기 회원:
- 승인 버튼
- 거절 버튼

승인 완료 회원:
- 수정(펜 아이콘) 버튼
- 삭제(휴지통 아이콘) 버튼

거절 회원:
- 수정(펜 아이콘) 버튼
- 삭제(휴지통 아이콘) 버튼
```

요구사항:

* [x] 승인 완료된 회원에게 `승인` 버튼을 비활성으로 남기지 않는다.
* [x] 승인 완료된 회원에게 `거절` 버튼을 직접 노출하지 않는다.
* [x] 승인/거절이 필요한 상태와 수정/삭제가 필요한 상태를 분리한다.
* [x] 기존 console의 다른 탭 UI와 일관되게 아이콘 버튼 스타일을 맞춘다.
* [x] 펜 아이콘은 수정 액션이다.
* [x] 휴지통 아이콘은 삭제 액션이다.

---

## 2. 회원 수정 모달 추가

승인 완료 또는 거절 상태의 회원 행에서 `펜` 버튼을 클릭하면 수정 모달을 연다.

모달 기능:

* [x] 회원 기본 정보 표시

  * 이름
  * 이메일
  * 현재 approval status
  * 현재 user.store_id
  * 현재 연결된 store 정보
* [x] 메뉴관리에서 생성된 매장 목록을 드롭다운으로 표시
* [x] 드롭다운에서 매장을 선택할 수 있어야 한다.
* [x] 저장 버튼 클릭 시 선택한 매장을 해당 회원의 store context와 연결한다.
* [x] 취소 버튼 클릭 시 변경 없이 모달을 닫는다.
* [x] 저장 성공 후 목록을 갱신한다.
* [x] 저장 실패 시 오류 메시지를 표시한다.

---

## 3. store_id 연결/동기화 정책

중요: 이 작업은 단순 UI 변경이 아니라 store context 정합성 작업이다.

예시:

```text
메뉴관리 매장 store_id = abc
회원가입으로 생성된 회원 store_id = def
```

수정 모달에서 메뉴관리 매장 `abc`를 선택하고 저장하면, 최종적으로 해당 회원이 사용하는 store_id와 메뉴관리 매장의 store_id가 일치해야 한다.

권장 구현 방향:

```text
선택한 메뉴관리 매장을 회원의 Store와 연결한다.
필요하다면 선택한 매장의 store_id를 회원의 store_id로 동기화한다.
```

예시 결과:

```text
기존 메뉴관리 매장 store_id: abc
회원의 store_id: def

저장 후:
선택한 매장의 store_id가 def로 동기화되거나,
회원의 store_id가 선택한 매장의 store_id와 일관되게 연결되어야 한다.
```

단, 구현 시 반드시 현재 모델 관계를 먼저 확인하고 가장 안전한 방식으로 처리한다.

주의사항:

* [x] `User.store_id`와 `Store.store_id`가 불일치하지 않게 한다.
* [x] `Order.store_id`, `WebhookEvent.store_id`, 메뉴/카탈로그 store 참조가 있다면 함께 고려한다.
* [x] store_id 변경 시 관련 레코드가 orphan 되지 않게 한다.
* [x] 필요한 경우 backend에서 트랜잭션으로 처리한다.
* [x] 단순히 frontend에서 표시 값만 바꾸지 않는다.
* [x] DB에 같은 store_id가 중복되어 unique constraint를 깨지 않도록 한다.
* [x] 이미 해당 store_id가 존재하는 경우 merge/assign/update 중 어느 방식이 안전한지 코드 구조를 보고 결정한다.
* [x] 결정한 정책을 코드 주석 또는 README/작업 기록에 짧게 남긴다.

필요하면 Admin API를 추가한다.

예시 API:

```text
GET /api/admin/stores
PATCH /api/admin/users/{user_id}/store
```

`GET /api/admin/stores`:

* [x] 회원 수정 모달의 드롭다운에 사용할 매장 목록을 반환한다.
* [x] `X-Admin-Token` 보호를 적용한다.

`PATCH /api/admin/users/{user_id}/store`:

* [x] 특정 회원의 store 연결을 변경한다.
* [x] 선택된 store와 회원 store context를 일관되게 동기화한다.
* [x] `X-Admin-Token` 보호를 적용한다.
* [x] 존재하지 않는 user/store 요청은 적절히 404 처리한다.
* [x] 충돌 가능성이 있으면 400 또는 409로 명확히 응답한다.

---

## 4. 회원 삭제 기능 추가

회원 관리 테이블에서 `휴지통` 버튼을 클릭하면 삭제 확인 모달을 띄운다.

삭제 확인 모달:

```text
정말 삭제하시겠습니까?
이 작업은 되돌릴 수 없습니다.
관련 회원, 매장, 인증 토큰 및 연결 데이터가 삭제됩니다.
```

요구사항:

* [x] 바로 삭제하지 말고 반드시 확인 모달을 띄운다.
* [x] 확인 버튼 클릭 시에만 삭제한다.
* [x] 취소 버튼 클릭 시 아무 것도 삭제하지 않는다.
* [x] 삭제 성공 후 목록을 갱신한다.
* [x] 삭제 실패 시 오류 메시지를 표시한다.

삭제 API 예시:

```text
DELETE /api/admin/users/{user_id}
X-Admin-Token: <ADMIN_TOKEN>
```

삭제 범위:

* [x] User 삭제
* [x] 해당 User의 RefreshToken 삭제 또는 revoke
* [x] 해당 User와 1:1로 생성된 Store 삭제
* [x] 해당 Store에 연결된 주문/아이템/AI 분석/WebhookEvent가 있다면 함께 삭제 또는 정책에 맞게 정리
* [x] 관련 데이터가 DB에 남아 orphan 되지 않게 한다.

주의:

* [x] 현재 DeepOrder는 초기 버전에서 `User 1명 -> Store 1개` 구조이므로 이를 기준으로 삭제 정책을 구현한다.
* [x] 단, 다른 사용자가 같은 store를 참조할 수 있는 구조가 이미 생겼다면 무조건 삭제하지 말고 안전하게 차단하거나 관계만 해제한다.
* [x] 삭제는 backend에서 트랜잭션으로 처리한다.
* [x] 실제 삭제 hard delete로 구현한다.
* [x] soft delete는 이번 범위에서 제외한다.

---

## 5. 가입 신청 필터 기본값/순서 수정

현재 회원 관리 탭의 가입 신청 필터 기본값이 `가입대기`로 되어 있다.

수정 방향:

* [x] 기본값을 `전체`로 변경한다.
* [x] 필터 순서를 변경한다.

목표 순서:

```text
전체
가입대기
승인완료
거절
```

요구사항:

* [x] 페이지 첫 진입 시 전체 회원 목록이 보여야 한다.
* [x] 기존 `가입대기` 기본 선택을 제거한다.
* [x] 필터 선택 시 기존처럼 목록이 정상 갱신되어야 한다.

---

## 6. 테스트 추가/수정

Backend 테스트:

* [x] `GET /api/admin/stores`가 `X-Admin-Token` 없이 실패하는지 테스트한다.
* [x] `GET /api/admin/stores`가 올바른 token으로 매장 목록을 반환하는지 테스트한다.
* [x] `PATCH /api/admin/users/{user_id}/store`가 회원 store context를 올바르게 변경/동기화하는지 테스트한다.
* [x] store_id 동기화 후 KDS 주문 조회가 변경된 store context 기준으로 동작하는지 테스트한다.
* [x] `DELETE /api/admin/users/{user_id}`가 token 없이 실패하는지 테스트한다.
* [x] `DELETE /api/admin/users/{user_id}`가 관련 User/Store/RefreshToken 및 연결 데이터를 정리하는지 테스트한다.
* [x] 삭제 후 해당 user로 login/refresh/me가 불가능한지 테스트한다.
* [x] 존재하지 않는 user/store 요청에 대해 404 또는 적절한 오류를 반환하는지 테스트한다.

mock-delivery-console 테스트/typecheck:

* [x] 회원 관리 탭 typecheck를 통과시킨다.
* [ ] 기본 필터가 `전체`인지 확인한다.
* [ ] 승인 완료 회원 행에 승인/거절 버튼이 아닌 펜/휴지통 버튼이 표시되는지 확인한다.
* [ ] 펜 버튼 클릭 시 수정 모달이 열리는지 확인한다.
* [ ] 매장 드롭다운이 표시되는지 확인한다.
* [ ] 저장 시 Admin API가 호출되는지 확인한다.
* [ ] 휴지통 버튼 클릭 시 삭제 확인 모달이 열리는지 확인한다.
* [ ] 삭제 확인 시 DELETE API가 호출되는지 확인한다.

---

## 7. 완료 기준

* [x] 승인 완료 회원의 관리 열에 비활성 승인 버튼이 남지 않는다.
* [x] 승인 완료 회원의 관리 열에 거절 버튼이 남지 않는다.
* [x] 승인 완료/거절 회원은 펜/휴지통 버튼으로 관리한다.
* [x] 펜 버튼으로 회원 store 연결을 수정할 수 있다.
* [x] 메뉴관리에서 생성된 store와 회원 store context가 일관되게 동기화된다.
* [x] 휴지통 버튼으로 회원을 삭제할 수 있다.
* [x] 삭제 전 확인 모달이 반드시 뜬다.
* [x] 삭제 후 관련 데이터가 DB에 orphan으로 남지 않는다.
* [x] 가입 신청 필터 기본값은 `전체`다.
* [x] 필터 순서는 `전체 → 가입대기 → 승인완료 → 거절`이다.
* [x] Admin API는 계속 `X-Admin-Token`으로 보호된다.
* [x] backend 테스트가 통과한다.
* [x] mock-delivery-console typecheck가 통과한다.
* [x] 기존 Auth/KDS/store context 흐름이 깨지지 않는다.

---

## 구현 메모

- 회원 매장 재연결은 `mock-delivery-api` 메뉴관리 매장의 `storeId/storeName`을 기준으로 backend `User.store_id`와 `Store.store_id`를 재바인딩하는 방식으로 구현한다.
- 재연결 시 기존 backend `Order.store_id`, `WebhookEvent.store_id`도 같은 트랜잭션 안에서 함께 이동시켜 KDS 조회 컨텍스트가 끊기지 않도록 처리한다.
- 이미 다른 회원이 사용 중인 `storeId`로의 재연결은 `409 Conflict`로 차단한다.
- 회원 삭제는 hard delete 기준이며, 연결된 주문/아이템/AI 분석/웹훅 이벤트와 인증 토큰까지 함께 정리한다.

## 진행 결과

### 구현 완료

- 회원 관리 필터 기본값을 `전체`로 변경했고 순서를 `전체 → 가입대기 → 승인 완료 → 거절`로 정리했다.
- 승인 대기 회원은 `승인/거절`, 승인 완료·거절 회원은 `수정(펜)/삭제(휴지통)` 액션으로 분기되도록 UI를 수정했다.
- 회원 수정 모달과 삭제 확인 모달을 추가했다.
- `PATCH /api/admin/users/{user_id}/store`, `DELETE /api/admin/users/{user_id}`, `GET /api/admin/stores` Admin API를 추가했다.
- 회원 매장 재연결 시 backend `User`, `Store`, `Order`, `WebhookEvent`의 store context가 함께 이동하도록 구현했다.
- 회원 삭제 시 `User`, `Store`, `Order`, `OrderItem`, `OrderAIAnalysis`, `WebhookEvent`, `RefreshToken` 정리 흐름을 backend 트랜잭션으로 구현했다.
- backend 테스트와 console typecheck를 통과시켰다.

### 정책 메모

- 수정 모달의 매장 드롭다운은 backend store 목록이 아니라 `mock-delivery-api` 메뉴관리 매장 목록을 사용한다.
- 따라서 `PATCH /api/admin/users/{user_id}/store`는 전달받은 `storeId/storeName`을 기준으로 backend store context를 생성 또는 재사용하며, 이 정책 때문에 “존재하지 않는 store 404” 대신 “다른 회원이 이미 점유한 store 409” 충돌 처리를 사용한다.

### 자동화 미포함

- `mock-delivery-console`의 모달 open/save/delete 클릭 흐름 자체에 대한 프론트엔드 UI 테스트는 이번 작업 범위에서 추가하지 않았다.
- 현재 프론트 검증은 `typecheck`, 백엔드 검증은 `pytest` 기준으로 마무리했다.

### 남은 수동 검증

- 회원 관리 화면에서 기본 필터가 실제로 `전체`로 노출되는지 브라우저에서 확인
- 승인 완료 회원 행에서 `펜/휴지통` 버튼이 정상 노출되는지 확인
- 수정 모달 open, 매장 드롭다운 노출, 저장 시 API 호출 여부 확인
- 삭제 모달 open, 삭제 확인 시 API 호출 여부 확인
