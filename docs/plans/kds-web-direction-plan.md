# DeepOrder KDS Web 최종 구현 방향

작업 기록: `kds-web`을 `VITE_STORE_ID` 고정 데모에서 Auth / Store Context 기반 KDS로 전환하기 전에 정한 최종 구현 방향 문서.

## 구현 결과 차이

현재 구현은 이 방향 문서를 대부분 반영했지만, 아래 항목은 실제 결과 기준으로 정리할 필요가 있다.

```text
완료:
- GET /api/kds/orders?storeId=... 제거
- accessToken / refreshToken 기반 Auth 진입
- PendingApprovalPage / KdsPage 분기
- mock-delivery-console 회원 관리 탭 추가
- X-Admin-Token 기반 승인/거절 API 연동
- 행정안전부 도로명주소 팝업 API 연동

후속:
- 1인 다매장 구조
- 매장 전환 UI
- admin role 기반 로그인
- kds-app 공용 auth/store context
```

즉 이 문서는 방향 문서로 유지하고, 실제 구현 상세와 검증 결과는 `docs/records/kds-web-auth-store-context-implementation-checklist.md`를 기준으로 본다.

## 1. 최종 방향 요약

DeepOrder KDS는 단일 env 매장 데모 화면에서 벗어나, 로그인한 계정에 연결된 매장의 주문만 보여주는 Auth 기반 KDS로 전환한다.

최종 사용자 흐름은 다음과 같다.

```text
회원가입
→ 매장 정보 입력
→ 행정안전부 도로명주소 팝업 API로 매장 주소 검색
→ 가입 신청
→ 관리자 승인 대기
→ Mock Delivery Console에서 관리자 승인
→ 로그인
→ 계정에 연결된 매장의 KDS 화면 진입
```

초기 버전은 **1인 1매장** 구조로 간다.

```text
User 1명
→ Store 1개
```

추후 확장 시에는 다음 구조로 전환할 수 있다.

```text
User 1명
→ Store 여러 개
→ UserStore 매핑 테이블
→ 매장 전환 UI
```

현재 단계에서는 `selectedStoreId`를 사용자가 직접 선택하거나 localStorage에 저장하는 방식보다, Auth를 통해 계정과 매장을 연결하는 방식이 더 자연스럽고 실제 서비스에 가깝다.

---

## 2. 현재 결정된 핵심 사항

### 2.1 KDS는 Auth 이후에만 접근 가능

비로그인 사용자는 KDS 화면에 접근할 수 없다.

```text
비로그인
→ Auth/Landing Page

로그인 + 승인 대기
→ PendingApprovalPage

로그인 + 승인 완료
→ KDS Page
```

---

### 2.2 매장 컨텍스트는 로그인 계정에서 결정

기존 방식:

```text
GET /api/kds/orders?storeId=STORE_FLAT
```

최종 방향:

```text
GET /api/kds/orders
Authorization: Bearer <token>
```

backend는 토큰에서 현재 사용자를 확인하고, 사용자의 `store_id` 기준으로 주문을 조회한다.

```text
token
→ current_user
→ current_user.store_id
→ 해당 매장의 주문만 조회
```

---

### 2.3 관리자 승인 화면은 Mock Delivery Console에 추가

관리자 승인 기능은 별도 admin web을 만들지 않고, 기존 `mock-delivery-console`에 추가한다.

이유:

```text
- mock-delivery-console은 이미 운영자/외부 플랫폼 콘솔 성격을 가진다.
- 관리자 전용 화면을 따로 새 프로젝트로 만들 필요가 없다.
- 기존 네비게이션에 탭 하나를 추가하면 된다.
- 포트폴리오에서 관리자 콘솔 흐름을 자연스럽게 보여줄 수 있다.
```

추가할 탭:

```text
회원 관리
```

또는:

```text
회원 승인 관리
```

---

### 2.4 주소 검색은 행정안전부 도로명주소 팝업 API 사용

DeepOrder는 회원가입 시 매장 주소 입력에 **행정안전부 도로명주소 팝업 API**를 사용한다.

승인받은 API 정보:

```text
API 유형: 도로명주소 팝업 API
신청기관 유형: 민간기관
시스템명: DeepOrder
서비스 용도: 개발
서비스망: 인터넷망
사용기간: 2026-06-15 ~ 2026-09-13
```

승인키는 환경변수로 관리한다.

```text
JUSO_CONFIRM_KEY=...
```

중요: 승인키는 코드, README, GitHub에 직접 커밋하지 않는다.

---

## 3. Auth 기반 사용자 흐름

### 3.1 랜딩/Auth 화면

`kds-web` 최초 진입 화면은 간단한 Auth 화면으로 구성한다.

```text
DeepOrder

매장 주문을 주방 작업 화면으로 정리하는 KDS

[이메일]
[비밀번호]
[로그인]

계정이 없나요? 회원가입
```

외부 OAuth는 현재 단계에서 제외한다.

```text
Google Auth ❌
Kakao Auth ❌
Naver Auth ❌

email/password 자체 Auth ⭕
```

---

### 3.2 회원가입

회원가입 시 계정 정보와 매장 정보를 함께 입력한다.

필드 예시:

```text
사용자 이름
이메일
비밀번호
매장명
매장 주소
상세주소
매장 연락처
```

주소 입력은 직접 문자열 입력이 아니라 도로명주소 팝업 API를 사용한다.

```text
[주소검색] 버튼
→ 행정안전부 도로명주소 팝업
→ 주소 선택
→ 우편번호/도로명주소/지번주소 자동 입력
→ 상세주소 입력
```

가입 직후 상태:

```text
PENDING_APPROVAL
```

즉 가입만으로는 KDS를 사용할 수 없다.

---

### 3.3 승인 대기 화면

승인되지 않은 계정으로 로그인하면 KDS가 아니라 승인 대기 화면을 보여준다.

```text
관리자 승인 대기 중입니다.

입력하신 매장 정보를 확인한 뒤 KDS 사용이 가능합니다.
승인이 완료되면 다시 로그인하거나 새로고침 후 이용해주세요.
```

---

### 3.4 승인 후 로그인

승인된 사용자가 로그인하면 backend는 사용자 정보와 연결된 매장 정보를 함께 내려준다.

```json
{
  "user": {
    "id": 1,
    "email": "owner@example.com",
    "name": "이상훈",
    "role": "STORE_OWNER",
    "approvalStatus": "APPROVED"
  },
  "store": {
    "id": 1,
    "storeId": "STORE_001",
    "storeName": "DeepOrder 테스트 매장"
  },
  "accessToken": "..."
}
```

이후 KDS는 로그인한 계정의 매장 주문만 조회한다.

---

## 4. 행정안전부 도로명주소 팝업 API 연동 방향

### 4.1 API 사용 방식

행정안전부 도로명주소 팝업 API는 JSON 검색 API라기보다, 팝업 화면을 통해 사용자가 주소를 검색하고 선택한 뒤 결과를 `returnUrl`로 돌려주는 방식이다.

흐름:

```text
kds-web 회원가입 화면
→ 주소검색 버튼 클릭
→ FastAPI /api/address/juso-popup 열기
→ 행안부 addrLinkUrl.do 호출
→ 사용자가 주소 선택
→ 행안부가 returnUrl로 결과 전달
→ FastAPI /api/address/juso-callback
→ window.opener.postMessage
→ React 회원가입 폼에 주소 반영
```

---

### 4.2 FastAPI 역할

FastAPI는 주소 검색 자체를 직접 구현하지 않고, 팝업 호출과 callback 중계를 담당한다.

필요 endpoint:

```text
GET /api/address/juso-popup
GET or POST /api/address/juso-callback
```

`/api/address/juso-popup`은 행안부 팝업 API로 form submit하는 HTML을 반환한다.

```text
confmKey = JUSO_CONFIRM_KEY
returnUrl = /api/address/juso-callback
resultType = 4
useDetailAddr = Y
```

`/api/address/juso-callback`은 선택된 주소 결과를 받아 부모창으로 전달한다.

---

### 4.3 kds-web 역할

회원가입 폼은 주소검색 버튼을 제공한다.

```text
[주소검색]
```

버튼 클릭 시 팝업을 연다.

```text
window.open("/api/address/juso-popup", ...)
```

주소 선택 결과는 `postMessage`로 받는다.

받은 주소 정보는 회원가입 폼에 반영한다.

```text
zipNo
roadAddress
jibunAddress
addressDetail
buildingName
sido
sigungu
eupmyeondong
```

---

### 4.4 Store에 저장할 주소 필드

최소 필드:

```text
zip_no
road_address
jibun_address
address_detail
```

확장 필드:

```text
road_addr_part1
road_addr_part2
eng_addr
adm_cd
rn_mgt_sn
bd_mgt_sn
bd_nm
si_nm
sgg_nm
emd_nm
```

초기에는 최소 필드를 저장하고, 포트폴리오 표현을 위해 행정구역코드나 건물관리번호 등 일부 확장 필드도 저장할 수 있다.

---

### 4.5 포트폴리오 표현

정확한 표현은 다음과 같다.

```text
전자정부프레임워크를 사용한 것은 아니지만,
행정안전부 도로명주소 팝업 API를 FastAPI/React 기반 회원가입 화면에 연동해
공공 Open API 기반 주소 검색 기능을 구현했다.
```

README에는 이렇게 적을 수 있다.

```text
회원가입 시 매장 주소를 단순 문자열로 입력받지 않고,
행정안전부 도로명주소 팝업 API를 연동해
도로명주소, 지번주소, 우편번호, 상세주소를 Store 정보로 정규화해 저장합니다.
```

---

## 5. Backend 모델 방향

### 5.1 User

```text
id
email
password_hash
name
role
approval_status
store_id
created_at
updated_at
```

`role` 예시:

```text
STORE_OWNER
ADMIN
```

`approval_status` 예시:

```text
PENDING_APPROVAL
APPROVED
REJECTED
```

---

### 5.2 Store

```text
id
store_id
name
phone
zip_no
road_address
jibun_address
address_detail
approval_status
created_at
updated_at
```

주소 API 확장 필드를 저장할 경우:

```text
road_addr_part1
road_addr_part2
eng_addr
adm_cd
rn_mgt_sn
bd_mgt_sn
bd_nm
si_nm
sgg_nm
emd_nm
```

초기에는 1인 1매장 구조이므로 `users.store_id`로 연결한다.

추후 다매장 확장 시:

```text
UserStore
- user_id
- store_id
- role
```

---

## 6. Backend API 방향

### 6.1 Auth API

필요 API:

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

회원가입 요청 예시:

```json
{
  "name": "이상훈",
  "email": "owner@example.com",
  "password": "password1234",
  "storeName": "DeepOrder 테스트 매장",
  "storePhone": "010-0000-0000",
  "zipNo": "05544",
  "roadAddress": "서울 송파구 위례성대로 2",
  "jibunAddress": "서울 송파구 방이동 44-2",
  "addressDetail": "2층"
}
```

회원가입 응답 예시:

```json
{
  "user": {
    "id": 1,
    "email": "owner@example.com",
    "approvalStatus": "PENDING_APPROVAL"
  },
  "store": {
    "storeId": "STORE_001",
    "storeName": "DeepOrder 테스트 매장"
  }
}
```

로그인 응답 예시:

```json
{
  "accessToken": "...",
  "user": {
    "id": 1,
    "email": "owner@example.com",
    "role": "STORE_OWNER",
    "approvalStatus": "APPROVED"
  },
  "store": {
    "storeId": "STORE_001",
    "storeName": "DeepOrder 테스트 매장"
  }
}
```

---

### 6.2 Address API

필요 API:

```text
GET /api/address/juso-popup
GET or POST /api/address/juso-callback
```

환경변수:

```text
JUSO_CONFIRM_KEY=...
JUSO_RETURN_URL=http://localhost:8000/api/address/juso-callback
```

주의:

```text
- 승인키는 .env에 저장
- GitHub에 커밋 금지
- .env.example에는 키 이름만 남김
```

`.env.example` 예시:

```text
JUSO_CONFIRM_KEY=your_juso_confirm_key_here
JUSO_RETURN_URL=http://localhost:8000/api/address/juso-callback
```

---

### 6.3 KDS API

기존:

```text
GET /api/kds/orders?storeId=STORE_FLAT
```

목표:

```text
GET /api/kds/orders
Authorization: Bearer <token>
```

처리 방식:

```text
1. token에서 current_user 확인
2. approval_status가 APPROVED인지 확인
3. current_user.store_id 확인
4. 해당 store_id 주문만 조회
5. KDS View Model로 응답
```

---

### 6.4 주문 상태 변경 API

기존:

```text
PATCH /api/orders/{order_id}/status
```

목표:

```text
PATCH /api/orders/{order_id}/status
Authorization: Bearer <token>
```

처리 방식:

```text
1. token에서 current_user 확인
2. order_id로 주문 조회
3. order.store_id == current_user.store_id 검증
4. 다르면 403
5. 같으면 상태 변경
```

---

### 6.5 관리자 승인 API

`mock-delivery-console`에서 사용할 API:

```text
GET /api/admin/users
PATCH /api/admin/users/{user_id}/approval
```

가입 대기 목록:

```text
GET /api/admin/users?status=PENDING_APPROVAL
```

승인/거절 요청:

```json
{
  "approvalStatus": "APPROVED"
}
```

또는:

```json
{
  "approvalStatus": "REJECTED"
}
```

---

## 7. kds-web 구조

`kds-web`은 Auth 이후에만 KDS 화면을 보여준다.

추천 구조:

```text
App
├─ AuthPage
│  ├─ LoginForm
│  └─ RegisterForm
│
├─ PendingApprovalPage
│
└─ KdsPage
   ├─ KdsHeader
   ├─ KdsTabs
   └─ HorizontalOrderBoard
```

초기에는 React Router 없이 auth 상태 기반 렌더링으로 구현해도 된다.

```text
auth 없음
→ AuthPage

auth 있음 + PENDING_APPROVAL
→ PendingApprovalPage

auth 있음 + APPROVED
→ KdsPage
```

---

## 8. Mock Delivery Console 역할 확장

`mock-delivery-console`은 이제 mock 주문 생성 도구이자 관리자 콘솔 역할 일부를 맡는다.

기존 역할:

```text
- 메뉴 관리
- 옵션 관리
- 주문 생성
- webhook 전송 이력 확인
```

추가 역할:

```text
- 회원 승인 관리
```

네비게이션에 추가할 탭:

```text
회원 관리
```

회원 관리 화면 기능:

```text
- 가입 요청 목록 조회
- 사용자 정보 확인
- 매장 정보 확인
- 승인
- 거절
```

관리자가 볼 정보:

```text
사용자 이름
이메일
매장명
매장 주소
연락처
가입일
승인 상태
```

초기에는 별도 관리자 로그인 없이 `mock-delivery-console`은 관리자 도구라고 가정해도 된다.

추후에는 admin auth를 추가한다.

---

## 9. KDS UI 최종 방향

### 9.1 탭 구조

```text
[접수] [완료]
```

상태 매핑:

```text
NEW      → 접수
COOKING  → 접수
DONE     → 완료
```

---

### 9.2 가로 확장 레이아웃

KDS는 주방에서 보는 화면이므로 세로 스크롤을 최소화한다.

```text
페이지 전체 세로 스크롤 금지
주문 카드는 가로 방향으로 확장
주문이 많아지면 가로 스크롤
```

예시:

```text
[KB2F32] [A132B3] [GJ3329] [Q7M2PA] →
```

---

### 9.3 주문번호

KDS에 표시되는 주문번호는 실제 빌지처럼 대문자 영어+숫자 6자리 코드로 한다.

```text
KB2F32
A132B3
GJ3329
```

mock에서는 다음처럼 저장해도 된다.

```json
{
  "id": 1,
  "external_order_id": "KB2F32",
  "order_number": "KB2F32"
}
```

단, 내부 DB PK는 별도로 유지한다.

```text
Order.id = DB 생성 id
```

---

### 9.4 메뉴 표시

메뉴는 숨기지 않는다.

지양할 방식:

```text
+3개 더 보기
상세보기 안에 숨김
카드 내부 세로 스크롤
```

목표 방식:

```text
메뉴가 많으면 2열, 3열로 표시
옵션은 메뉴 바로 아래에 들여쓰기
```

예시:

```text
2 부대찌개
  ㄴ 공기밥 추가
  ㄴ 라면 사리 추가

1 제육볶음
  ㄴ 맵기: 보통
  ㄴ 치즈 추가
```

---

### 9.5 요청사항과 AI 분석

KDS에서는 “AI 분석 기능”이 아니라 “조리 주의사항”으로 보여준다.

기존 느낌:

```text
조리 요청사항 분석
분석중
원문: 양상추 빼주세요
```

목표 느낌:

```text
주의 요청
양상추 빼주세요
```

AI 분석 결과가 있으면:

```text
빼기: 양상추
```

원칙:

```text
AI 분석 전에는 원문 요청사항 우선 표시
AI 분석 후에는 요약된 조리 주의사항 표시
원문은 보조로 보존
```

---

## 10. mock-delivery-api 주문 생성 정책

mock 주문 생성은 계속 생성형 AI를 활용할 수 있다.

단, 책임을 분리한다.

AI가 생성할 정보:

```text
메뉴명
수량
옵션
고객 요청사항
배달 요청사항
주문 상황
```

시스템 코드가 생성할 정보:

```text
eventId
eventType
orderNumber
orderedAt
platform
storeId
```

주문번호는 AI가 생성하지 않고 시스템 코드에서 생성한다.

이유:

```text
- 6자리 형식을 안정적으로 유지해야 함
- 중복 가능성을 줄여야 함
- 테스트 재현성이 필요함
- AI가 형식을 어길 수 있음
```

---

## 11. 구현 단계

### Phase 1. 행정안전부 도로명주소 팝업 API 연동

```text
- backend .env에 JUSO_CONFIRM_KEY 추가
- /api/address/juso-popup 구현
- /api/address/juso-callback 구현
- kds-web 회원가입 폼에 주소검색 버튼 추가
- postMessage로 주소 선택 결과 수신
- 회원가입 폼에 주소 자동 반영
```

---

### Phase 2. Auth 기반 KDS 진입

```text
- User / Store 모델 추가
- 회원가입 API 추가
- 로그인 API 추가
- 토큰 기반 current_user 조회 추가
- 승인 상태 필드 추가
- 승인 전에는 KDS 접근 차단
- kds-web에 AuthPage 추가
- 승인된 사용자만 KDS 화면 진입
```

---

### Phase 3. 관리자 승인 기능

```text
- backend에 admin user approval API 추가
- mock-delivery-console 네비게이션에 회원 관리 탭 추가
- 가입 대기 사용자 목록 표시
- 승인/거절 버튼 추가
- 승인 후 kds-web 로그인 시 KDS 접근 가능
```

---

### Phase 4. KDS API를 Auth 기반으로 변경

```text
- GET /api/kds/orders에서 storeId query 의존 제거
- token 기반 current_user.store_id로 주문 조회
- PATCH /api/orders/{order_id}/status에서 order.store_id 검증
- 승인되지 않은 계정은 403 처리
```

---

### Phase 5. KDS UI 개선

```text
- [접수] [완료] 탭 구조 적용
- 접수 = NEW + COOKING
- 완료 = DONE
- 주문 카드 가로 확장
- 페이지 세로 스크롤 제거
- 메뉴 2열/3열 표시
- 옵션 들여쓰기
- 요청사항을 조리 주의사항으로 표시
```

---

### Phase 6. mock 주문 현실감 개선

```text
- orderNumber를 6자리 대문자+숫자로 생성
- mock AI 생성 결과에 시스템 생성 orderNumber 붙이기
- Flat 메뉴/Flat 옵션 대신 실제 메뉴/옵션 샘플 강화
- 요청사항 샘플 강화
```

---

### Phase 7. 추후 확장

```text
- 1인 다매장 구조
- UserStore 매핑 테이블
- 매장 전환 UI
- 관리자 인증 강화
- 기기 바인딩형 KDS
- kds-app과 Auth/store context 공유
- 전표/COM 포트 기반 주문 파싱
- 주소 좌표가 필요하면 카카오/네이버 Local API 추가
```

---

## 12. 최종 요약

이번 KDS 개편의 핵심은 다음이다.

```text
DeepOrder KDS를 단일 env 매장 데모 화면에서,
Auth 기반 매장 바인딩 KDS로 전환한다.
```

구현상 핵심은 다음이다.

```text
회원가입
→ 행정안전부 도로명주소 팝업 API로 매장 주소 입력
→ 관리자 승인
→ 로그인
→ 계정에 연결된 매장의 주문 조회
→ KDS 표시
```

관리자 승인은 별도 admin 프로젝트를 만들지 않고, 기존 `mock-delivery-console`에 회원 관리 탭을 추가해 처리한다.

KDS 화면은 Auth 이후에만 접근 가능하며, 화면 자체는 다음 방향으로 개선한다.

```text
[접수] [완료] 탭
가로 확장 주문 카드
6자리 빌지 주문번호
메뉴 2열/3열 표시
옵션 들여쓰기
요청사항 강조
```

포트폴리오 관점에서 이 구조는 다음을 보여준다.

```text
- 자체 Auth
- 승인 기반 B2B 가입 흐름
- 계정-매장 바인딩
- 행정안전부 도로명주소 팝업 API 연동
- 공공 Open API 사용 경험
- 매장별 주문 격리
- KDS 전용 projection
- 상태 변경 권한 검증
- 관리자 콘솔
- 실제 주방 작업용 UI 설계
```
