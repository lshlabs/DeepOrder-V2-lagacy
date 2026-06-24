# kds-app Direction Plan

## 1. 문서 목적

이 문서는 DeepOrder v2의 `kds-app` 구현에 들어가기 전에 앱의 역할, `kds-web`과의 관계, MVP 범위, 제외 범위, 기술 선택지, 구현 전 의사결정 항목을 정리하기 위한 방향성 문서이다.

현재 DeepOrder v2 설계 문서 기준으로 프로젝트의 핵심 구조는 다음과 같다.

```text
AI 기반 Mock Delivery API
→ Webhook 주문 수신
→ DeepOrder Backend
→ AI Request Analyzer
→ React KDS Web
→ React Native WebView App
```

따라서 `kds-app`은 초기부터 독립 네이티브 KDS 앱으로 구현하지 않는다.
MVP 단계의 `kds-app`은 `kds-web`을 앱 환경에서 실행하기 위한 **React Native WebView 기반 앱 셸**로 정의한다.

---

## 2. 배경

DeepOrder v2는 기존 Python GUI 프로그램을 직접 고도화하는 프로젝트가 아니라, DeepOrder의 문제의식은 유지하되 새롭게 설계하는 PoC 프로젝트이다.

기존 Python GUI 방식은 다음 한계가 있었다.

* TV, 태블릿, Android 기반 주방 기기에서 사용하기 어렵다.
* 기기마다 Python 실행 환경을 설치해야 한다.
* 배포와 업데이트가 불편하다.
* 외부 배달 플랫폼 API 연동형 구조와 어울리지 않는다.
* 실제 매장 솔루션보다는 개인 PC용 프로그램에 가깝다.

DeepOrder v2는 이 한계를 개선하기 위해 다음 구조를 목표로 한다.

* Mock Delivery API 기반 외부 주문 플랫폼 시뮬레이션
* Webhook 기반 주문 이벤트 수신
* eventId 기반 중복 이벤트 처리
* AI 기반 주문 생성
* AI 기반 요청사항 분석
* KDS Web 화면 표시
* Android 태블릿/TV 앱 배포 가능성을 고려한 WebView App
* Linux 서버 배포 가능 구조

따라서 `kds-app`은 독립적인 제품이라기보다, `kds-web`을 실제 주방 디바이스에서 실행하기 위한 앱 배포 계층으로 시작한다.

---

## 3. kds-app 목표 역할 정의

### 3.1 MVP 기준 역할

MVP 단계에서 `kds-app`의 목표 역할은 다음과 같다.

```text
kds-app = React Native WebView 기반 KDS 실행 앱
```

즉, `kds-app`은 `kds-web`의 기능을 중복 구현하지 않고, `kds-web`을 앱 환경에서 안정적으로 실행하는 역할을 맡는다.

MVP 기준 핵심 책임은 다음과 같다.

* `kds-web`을 WebView로 표시
* 앱 실행 시 KDS 화면으로 진입
* Android 태블릿 또는 TV 환경에서 KDS 화면을 확인 가능하게 함
* 앱 배포 가능성을 검증
* 향후 네이티브 기능 확장을 위한 구조적 여지를 남김

---

## 4. kds-web과의 관계 정의

### 4.1 kds-web의 역할

`kds-web`은 KDS의 기준 UI이자 실제 주문 운영 화면이다.

`kds-web`의 책임은 다음과 같다.

* 주문 카드 표시
* AI 분석 태그 표시
* 알레르기/위험 요청 경고 표시
* 조리 상태 변경
* 포장/배달 관련 상태 확인
* 주문 목록 갱신
* Backend API 또는 Polling, 추후 WebSocket 연동

즉, KDS 기능의 중심은 `kds-web`에 둔다.

---

### 4.2 kds-app의 역할

`kds-app`은 `kds-web`을 대체하지 않는다.

초기 `kds-app`은 다음 역할만 담당한다.

* React Native 앱 셸 제공
* WebView를 통해 `kds-web` 로드
* 앱 실행 환경 구성
* Android 태블릿/TV에서의 사용 가능성 검증
* 최소한의 네트워크 오류 안내
* 향후 네이티브 기능 확장을 위한 기본 구조 확보

---

### 4.3 관계 원칙

`kds-web`과 `kds-app`의 관계 원칙은 다음과 같다.

1. 주문 표시와 상태 변경 UI는 `kds-web`을 기준으로 한다.
2. `kds-app`은 MVP 단계에서 주문 상태 관리 로직을 직접 구현하지 않는다.
3. `kds-app`은 `kds-web`을 감싸는 실행 환경으로 시작한다.
4. 앱 전용 기능은 MVP 이후 별도 Phase에서 검토한다.
5. `kds-web`과 `kds-app`이 서로 다른 주문 상태 모델을 갖지 않도록 한다.

---

## 5. MVP 범위 정의

### 5.1 MVP 목표

`kds-app` MVP의 목표는 독립 네이티브 KDS 앱을 완성하는 것이 아니다.

MVP 목표는 다음과 같다.

```text
React Native WebView App으로 kds-web을 실행하고,
Android 태블릿/TV 앱 배포 가능성을 검증한다.
```

---

### 5.2 MVP 포함 범위

MVP에 포함할 범위는 다음과 같다.

* React Native 기반 `kds-app` 프로젝트 구조 생성
* WebView 의존성 추가
* `kds-web` URL 로드
* 앱 실행 시 KDS 화면 진입
* 기본 로딩 화면
* 기본 에러 화면
* 네트워크 연결 실패 안내
* Android 기준 로컬 실행 확인
* `.env` 또는 설정 파일을 통한 `kds-web` URL 분리
* README 또는 docs에 실행 방법 정리

---

### 5.3 MVP 제외 범위

MVP에서는 다음 기능을 제외한다.

* 독립 네이티브 KDS UI 구현
* 주문 카드 네이티브 컴포넌트 구현
* 앱 내부 주문 상태 관리
* 오프라인 주문 큐
* 로컬 DB 저장
* 푸시 알림
* 로컬 알림
* 프린터 연동
* 키오스크 락다운 모드
* 디바이스 등록/관리
* 앱스토어/플레이스토어 배포 자동화
* 실제 운영 SLA 수준의 장애 복구

이 기능들은 MVP 이후 Phase에서 필요 여부를 재검토한다.

---

## 6. 기술 선택지 비교

### 6.1 React Native WebView

DeepOrder v2 문서 기준으로 가장 적합한 선택지이다.

장점:

* 기존 `kds-web`을 그대로 활용할 수 있다.
* MVP 구현 속도가 빠르다.
* Android 태블릿/TV 앱 배포 가능성을 검증할 수 있다.
* `kds-web`과 기능 중복을 피할 수 있다.
* 추후 네이티브 기능 확장을 위한 기반을 남길 수 있다.

단점:

* 네이티브 앱 수준의 UX 최적화는 제한적이다.
* 프린터, 푸시, 키오스크 모드는 추가 네이티브 모듈 설계가 필요하다.
* WebView 로딩 실패, 네트워크 장애 대응을 별도로 처리해야 한다.

결론:

```text
MVP 기본 선택지로 확정한다.
```

---

### 6.2 완전 네이티브 React Native KDS

이 방식은 `kds-web`과 별도로 주문 카드, 상태 변경, AI 태그 UI를 React Native 컴포넌트로 다시 구현하는 방식이다.

장점:

* 앱 전용 UX 최적화 가능
* 오프라인, 푸시, 프린터, 키오스크 기능 확장에 유리
* 실제 매장 운영용 앱으로 발전시키기 좋음

단점:

* `kds-web`과 기능 중복 발생
* 구현량 증가
* API 상태 모델을 앱과 웹에서 동시에 관리해야 함
* MVP 범위를 넘어설 가능성이 높음

결론:

```text
MVP에서는 제외하고, 실제 매장 운영 단계에서 재검토한다.
```

---

### 6.3 PWA

PWA는 `kds-web`을 설치형 웹앱처럼 사용하는 방식이다.

장점:

* 앱 구현 없이 빠르게 테스트 가능
* 배포가 단순함
* 웹 코드 재사용성이 가장 높음

단점:

* Android 앱 배포 가능성 검증에는 부족함
* 네이티브 권한 접근이 제한적임
* 프로젝트 문서의 React Native WebView App 방향과는 다소 다름

결론:

```text
보조 선택지로만 본다.
```

---

## 7. 권장 아키텍처

MVP 기준 권장 구조는 다음과 같다.

```text
kds-app/
  ├─ src/
  │   ├─ App.tsx
  │   ├─ config/
  │   │   └─ env.ts
  │   ├─ screens/
  │   │   └─ KdsWebViewScreen.tsx
  │   └─ components/
  │       ├─ LoadingView.tsx
  │       └─ ErrorView.tsx
  │
  ├─ android/
  ├─ package.json
  ├─ README.md
  └─ .env.example
```

앱의 핵심 흐름은 다음과 같다.

```text
App 실행
→ 환경 변수에서 KDS_WEB_URL 확인
→ WebView로 kds-web 로드
→ 로딩 상태 표시
→ 실패 시 에러 화면 표시
→ 사용자는 kds-web 기반 KDS 화면 조작
```

---

## 8. Phase 계획

### Phase 0. 방향 확정

목표:

* `kds-app`을 React Native WebView App으로 고정
* MVP 범위 확정
* 제외 범위 확정
* `kds-web`과 책임 분리

산출물:

* `docs/kds-app-direction-plan.md`

---

### Phase 1. 앱 셸 구현

목표:

* React Native 프로젝트 구성
* WebView 연결
* `kds-web` URL 로드
* 기본 로딩/에러 처리
* Android 실행 확인

산출물:

* 실행 가능한 `kds-app`
* `.env.example`
* README 실행 가이드

---

### Phase 2. KDS Web 연동 검증

목표:

* 주문 카드 표시 확인
* AI 태그 표시 확인
* 위험 요청 경고 표시 확인
* 상태 변경 동작 확인
* 태블릿 화면 비율 확인

산출물:

* MVP 테스트 체크리스트
* 발견 이슈 목록

---

### Phase 3. 네이티브 기능 검토

MVP 이후 다음 기능을 검토한다.

* 푸시 알림
* 로컬 알림
* 화면 꺼짐 방지
* 키오스크 모드
* 프린터 연동
* 오프라인 큐
* 디바이스 식별

이 단계에서 WebView App을 유지할지, 완전 네이티브 KDS 앱으로 확장할지 다시 판단한다.

---

## 9. 구현 전 의사결정 체크리스트

구현 전에 다음 항목을 확인한다.

### 9.1 역할 결정

* `kds-app`은 MVP에서 React Native WebView App으로 구현하는가?
* `kds-web`을 기준 UI로 유지하는가?
* 앱에서 주문 상태 관리 로직을 중복 구현하지 않는가?

### 9.2 URL 및 환경 설정

* `kds-web` URL은 `.env`로 분리하는가?
* 로컬 개발용 URL과 배포 URL을 구분하는가?
* Android 에뮬레이터에서 접근 가능한 주소를 문서화하는가?

### 9.3 에러 처리

* WebView 로딩 실패 시 어떤 화면을 보여줄 것인가?
* 네트워크 오류 시 재시도 버튼을 제공할 것인가?
* 서버 미실행 상태를 어떻게 안내할 것인가?

### 9.4 확장 가능성

* 추후 푸시 알림을 추가할 수 있는 구조인가?
* 추후 프린터 연동을 추가할 수 있는 구조인가?
* 추후 키오스크 모드를 추가할 수 있는 구조인가?
* 추후 완전 네이티브 KDS로 전환할 여지를 남겼는가?

---

## 10. 최종 결정안

현재 DeepOrder v2 설계 문서 기준으로 `kds-app`의 초기 방향은 다음과 같이 결정한다.

```text
kds-app MVP = React Native WebView 기반 KDS App
```

`kds-app`은 `kds-web`의 단순한 임시 래퍼가 아니라, Android 태블릿/TV 배포 가능성을 검증하기 위한 앱 실행 계층이다.

다만 MVP 단계에서는 앱 내부에 주문 처리 로직을 구현하지 않는다.
주문 카드 표시, AI 태그 표시, 상태 변경, 위험 요청 경고 등 KDS 핵심 기능은 `kds-web`이 담당한다.

오프라인, 푸시, 프린터, 키오스크 모드는 MVP 이후 실제 운영 요구가 확인되면 별도 Phase에서 검토한다.

---

## 11. 다음 작업

이 문서를 추가한 뒤 다음 순서로 진행한다.

1. `docs/kds-app-direction-plan.md` 생성
2. `kds-app`을 React Native WebView App으로 구현하기로 확정
3. `kds-web` 실행 URL 정리
4. `kds-app` 기본 프로젝트 생성
5. WebView 화면 연결
6. 로딩/에러 화면 추가
7. Android 실행 확인
8. MVP 테스트 체크리스트 작성

---

## 12. 결론

DeepOrder v2의 `kds-app`은 현재 단계에서 독립 네이티브 KDS 앱이 아니다.

문서 기준으로 가장 일관된 방향은 다음과 같다.

```text
React KDS Web을 기준 화면으로 만들고,
React Native WebView App은 이를 Android 태블릿/TV 환경에서 실행하는 앱 셸로 둔다.
```

따라서 `kds-app` 구현은 WebView 기반 MVP로 작게 시작한다.
네이티브 전용 KDS, 오프라인, 푸시, 프린터, 키오스크 권한은 지금 구현하지 않고, MVP 검증 이후 확장 후보로 남긴다.
