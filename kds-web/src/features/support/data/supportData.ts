// ─────────────────────────────────────────────────────────────
// Support panel data — FAQ categories, items, and Q&A flows
// ─────────────────────────────────────────────────────────────

export type FaqCategory =
  | "주문"
  | "알림"
  | "주문 처리"
  | "매장 상태"
  | "내 업무"
  | "직원/PIN"
  | "계정/설정";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  popular?: boolean;
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  "주문",
  "알림",
  "주문 처리",
  "매장 상태",
  "내 업무",
  "직원/PIN",
  "계정/설정",
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    category: "주문",
    question: "주문이 들어왔는데 화면에 보이지 않아요.",
    answer:
      "새로고침을 눌러 최신 주문을 불러오세요.\n현재 탭이 접수 주문 화면인지, 매장 상태가 영업종료 또는 일시중지 상태는 아닌지 확인하세요.\n완료 주문은 완료 탭에서 확인할 수 있으며, 취소 주문은 보드에서 제외되고 집계로만 관리됩니다.",
    popular: true,
  },
  {
    id: "faq-2",
    category: "주문",
    question: "빨간색 또는 노란색 시간 표시는 무엇인가요?",
    answer:
      "주문 접수 후 시간이 많이 지난 주문을 강조하는 표시입니다.\n지연 가능성이 높은 주문을 먼저 확인할 수 있도록 돕습니다.",
  },
  {
    id: "faq-3",
    category: "알림",
    question: "주문 알림 소리가 안 나요.",
    answer:
      "설정에서 알림 활성화가 켜져 있는지 확인하세요.\n알림 사운드가 '없음'으로 설정되어 있지 않은지 확인하고, 기기 음량과 브라우저 음소거 상태도 함께 확인하세요.\n브라우저 알림 또는 오디오 권한 제한이 있을 수 있습니다.",
    popular: true,
  },
  {
    id: "faq-4",
    category: "주문 처리",
    question: "주문을 잘못 완료했어요.",
    answer:
      "완료된 주문은 완료 주문 화면에서 확인할 수 있습니다.\n되돌리기 기능이 제공되지 않는 경우 상담원 연결을 통해 처리해 드립니다.\n주문번호와 처리 시각을 준비해 두시면 빠른 처리가 가능합니다.",
  },
  {
    id: "faq-5",
    category: "주문 처리",
    question: "메뉴나 옵션을 누르면 무엇이 바뀌나요?",
    answer:
      "메뉴 또는 옵션을 누르면 해당 항목의 완료 진행 상태가 변경됩니다.\n주문 전체 완료와 메뉴별 완료는 다릅니다.\n모든 조리가 끝난 뒤 주문 카드의 완료 버튼으로 주문을 완료하세요.",
  },
  {
    id: "faq-6",
    category: "주문 처리",
    question: "알레르기 경고 아이콘은 무엇인가요?",
    answer:
      "고객 요청사항 또는 AI 분석에서 알레르기 위험이 감지된 항목에 표시됩니다.\n조리 전 고객 요청사항과 옵션을 반드시 확인하세요.",
  },
  {
    id: "faq-7",
    category: "매장 상태",
    question: "매장 상태를 일시중지하면 어떻게 되나요?",
    answer:
      "설정한 시간 동안 주문 접수를 임시로 중지합니다.\n영업중으로 바꾸면 주문 접수를 다시 시작합니다.\n영업종료는 매장 운영을 종료하는 상태입니다.",
  },
  {
    id: "faq-8",
    category: "매장 상태",
    question: "브레이크타임과 일시중지는 무엇이 다른가요?",
    answer:
      "브레이크타임은 설정된 시간에 맞춰 주문 접수를 중지하는 운영 설정입니다.\n일시중지는 지금 즉시 일정 시간 동안 주문 접수를 멈추는 임시 조치입니다.",
  },
  {
    id: "faq-9",
    category: "매장 상태",
    question: "자동수락을 켜면 어떻게 되나요?",
    answer:
      "주문 수신 즉시 진행중 상태로 표시됩니다.\n자동수락을 끄면 사용자가 조리 시작 버튼을 눌러야 진행중 상태가 됩니다.",
  },
  {
    id: "faq-10",
    category: "내 업무",
    question: "내 업무에 메뉴가 안 보여요.",
    answer:
      "내 업무에서 담당 메뉴가 등록되어 있는지 확인하세요.\n주문의 메뉴명과 담당 메뉴명이 일치해야 집계됩니다.\n담당 메뉴가 없으면 메뉴 추가를 눌러 등록하세요.",
  },
  {
    id: "faq-11",
    category: "직원/PIN",
    question: "직원 PIN을 잊어버렸어요.",
    answer:
      "매니저 계정에서 직원 관리로 이동하세요.\n해당 직원의 PIN을 재발급하고 새 PIN은 직원에게 별도로 전달하세요.",
    popular: true,
  },
  {
    id: "faq-12",
    category: "계정/설정",
    question: "비밀번호를 바꾸면 왜 로그아웃되나요?",
    answer:
      "보안상 비밀번호 변경 후 기존 세션을 종료합니다.\n새 비밀번호로 다시 로그인해야 합니다.",
  },
];

// ─────────────────────────────────────────────────────────────
// Guided Q&A tree
// ─────────────────────────────────────────────────────────────

export type QnaOption = {
  id: string;
  label: string;
  nextStepId?: string;
  answer?: string;
  terminal?: "resolved" | "agent" | "ai";
};

export type QnaStep = {
  id: string;
  question: string;
  options: QnaOption[];
  /** When true, after delivering this bot message jump directly to terminal chips */
  autoTerminal?: boolean;
};

export const QNA_INITIAL_OPTIONS: QnaOption[] = [
  { id: "q-orders", label: "주문", nextStepId: "orders-1" },
  { id: "q-alerts", label: "알림", nextStepId: "alerts-1" },
  { id: "q-handling", label: "주문 처리", nextStepId: "handling-1" },
  { id: "q-status", label: "매장 상태", nextStepId: "status-1" },
  { id: "q-tasks", label: "내 업무", nextStepId: "tasks-1" },
  { id: "q-staff", label: "직원/PIN", nextStepId: "staff-1" },
  { id: "q-account", label: "계정/설정", nextStepId: "account-1" },
  { id: "q-agent", label: "상담원 연결", terminal: "agent" },
];

export const QNA_STEPS: Record<string, QnaStep> = {
  "orders-1": {
    id: "orders-1",
    question: "어떤 상황인가요?",
    options: [
      { id: "o-new", label: "새 주문이 아예 안 보여요", nextStepId: "orders-new" },
      { id: "o-done", label: "완료한 주문을 다시 보고 싶어요", nextStepId: "orders-done" },
      { id: "o-cancel", label: "취소 주문을 찾고 싶어요", nextStepId: "orders-cancel" },
    ],
  },
  "orders-new": {
    id: "orders-new",
    question:
      "아래 항목을 순서대로 확인해 보세요.\n\n1. 매장 상태가 영업중인지 확인하세요.\n2. 화면 상단의 새로고침 버튼을 눌러보세요.\n3. 현재 탭이 '접수' 화면인지 확인하세요.\n4. 설정에서 알림 활성화 여부를 확인하세요.",
    options: [],
    autoTerminal: true,
  },
  "orders-done": {
    id: "orders-done",
    question:
      "상단 탭에서 '완료' 탭을 선택하면 완료된 주문 목록을 확인할 수 있습니다.",
    options: [],
    autoTerminal: true,
  },
  "orders-cancel": {
    id: "orders-cancel",
    question:
      "취소 주문은 주문 보드에서 제외되며 통계 집계로만 관리됩니다. 취소 주문 상세 내역이 필요하면 상담원 연결이 필요합니다.",
    options: [],
    autoTerminal: true,
  },
  "alerts-1": {
    id: "alerts-1",
    question: "어떤 문제인가요?",
    options: [
      { id: "a-sound", label: "주문은 보이는데 소리만 안 나요", nextStepId: "alerts-sound" },
      { id: "a-both", label: "화면에도 새 주문이 안 보여요", nextStepId: "orders-1" },
      { id: "a-device", label: "특정 기기에서만 안 돼요", nextStepId: "alerts-device" },
    ],
  },
  "alerts-sound": {
    id: "alerts-sound",
    question:
      "아래 항목을 확인해 보세요.\n\n1. 설정 > 알림 활성화가 켜져 있는지 확인하세요.\n2. 알림 사운드가 '없음'으로 설정되어 있지 않은지 확인하세요.\n3. 기기 음량을 높이고 브라우저 음소거를 해제하세요.\n4. 브라우저 주소 표시줄의 자물쇠 아이콘에서 오디오 권한을 허용하세요.",
    options: [],
    autoTerminal: true,
  },
  "alerts-device": {
    id: "alerts-device",
    question:
      "브라우저 오디오 권한과 기기 음소거 설정을 해당 기기에서 개별 확인해 주세요. 해결되지 않으면 AI 상담 또는 상담원 연결을 이용하세요.",
    options: [],
    autoTerminal: true,
  },
  "handling-1": {
    id: "handling-1",
    question: "어떤 내용이 궁금한가요?",
    options: [
      { id: "h-complete", label: "주문을 완료하는 방법", nextStepId: "handling-complete" },
      { id: "h-item", label: "메뉴/옵션 체크는 어떻게 하나요", nextStepId: "handling-item" },
      { id: "h-allergy", label: "알레르기 아이콘이 뭔가요", nextStepId: "handling-allergy" },
    ],
  },
  "handling-complete": {
    id: "handling-complete",
    question:
      "모든 메뉴 조리가 완료되면 주문 카드 하단의 '완료' 버튼을 누르세요. 버튼을 누르면 해당 주문이 완료 탭으로 이동합니다.",
    options: [],
    autoTerminal: true,
  },
  "handling-item": {
    id: "handling-item",
    question:
      "메뉴 또는 옵션 항목을 누르면 해당 항목의 완료 상태가 토글됩니다. 개별 항목 완료와 주문 전체 완료는 별개입니다. 모든 항목 체크 후 주문 완료 버튼을 눌러야 주문이 완료됩니다.",
    options: [],
    autoTerminal: true,
  },
  "handling-allergy": {
    id: "handling-allergy",
    question:
      "고객 요청사항 또는 AI 분석에서 알레르기 위험이 감지된 항목에 표시됩니다. 조리 전 반드시 고객 요청사항과 옵션을 확인해 주세요.",
    options: [],
    autoTerminal: true,
  },
  "status-1": {
    id: "status-1",
    question: "어떤 내용이 궁금한가요?",
    options: [
      { id: "s-pause", label: "일시중지를 하면 어떻게 되나요", nextStepId: "status-pause" },
      { id: "s-break", label: "브레이크타임과 일시중지 차이", nextStepId: "status-break" },
      { id: "s-auto", label: "자동수락 설정이 궁금해요", nextStepId: "status-auto" },
    ],
  },
  "status-pause": {
    id: "status-pause",
    question:
      "일시중지는 설정한 시간 동안 주문 접수를 임시로 중지합니다. 영업중으로 변경하면 즉시 주문 접수가 재개됩니다. 영업종료는 매장 운영 자체를 종료하는 상태입니다.",
    options: [],
    autoTerminal: true,
  },
  "status-break": {
    id: "status-break",
    question:
      "브레이크타임은 설정한 시간대에 자동으로 주문 접수를 중지하는 운영 예약 설정입니다. 일시중지는 지금 즉시 일정 시간 동안 주문을 임시로 중단하는 수동 조치입니다.",
    options: [],
    autoTerminal: true,
  },
  "status-auto": {
    id: "status-auto",
    question:
      "자동수락을 켜면 주문 수신 즉시 진행중 상태로 표시됩니다. 자동수락을 끄면 조리 시작 버튼을 직접 눌러야 진행중으로 전환됩니다.",
    options: [],
    autoTerminal: true,
  },
  "tasks-1": {
    id: "tasks-1",
    question: "어떤 문제인가요?",
    options: [
      { id: "t-missing", label: "담당 메뉴가 안 보여요", nextStepId: "tasks-missing" },
      { id: "t-count", label: "진행 수량이 이상해요", nextStepId: "tasks-count" },
    ],
  },
  "tasks-missing": {
    id: "tasks-missing",
    question:
      "내 업무 탭에서 '메뉴 추가' 버튼을 눌러 담당 메뉴를 등록하세요. 주문의 메뉴명과 담당 메뉴명이 정확히 일치해야 집계됩니다.",
    options: [],
    autoTerminal: true,
  },
  "tasks-count": {
    id: "tasks-count",
    question:
      "진행 수량은 현재 접수된 주문 중 담당 메뉴가 포함된 항목의 합계입니다. 완료된 항목은 집계에서 제외됩니다.",
    options: [],
    autoTerminal: true,
  },
  "staff-1": {
    id: "staff-1",
    question: "어떤 문제인가요?",
    options: [
      { id: "st-login", label: "직원이 로그인하지 못해요", nextStepId: "staff-login" },
      { id: "st-pin", label: "PIN을 잊어버렸어요", nextStepId: "staff-pin" },
      { id: "st-deactivate", label: "직원을 비활성화하고 싶어요", nextStepId: "staff-deactivate" },
    ],
  },
  "staff-login": {
    id: "staff-login",
    question:
      "직원 계정 활성화 상태를 직원 관리 화면에서 확인하세요. 비활성화 상태면 활성화로 전환하세요. 비밀번호 또는 PIN 문제라면 매니저가 재발급할 수 있습니다.",
    options: [],
    autoTerminal: true,
  },
  "staff-pin": {
    id: "staff-pin",
    question: "PIN 재발급은 매니저 계정에서 가능합니다. 매니저 권한이 있으신가요?",
    options: [
      {
        id: "st-pin-manager",
        label: "매니저 계정이 있어요",
        answer:
          "직원 관리 화면으로 이동해 해당 직원 항목에서 PIN 재발급을 선택하세요. 새 PIN은 직원에게 별도로 전달하세요.",
        nextStepId: "terminal",
      },
      { id: "st-pin-nomanager", label: "매니저 권한이 없어요", terminal: "agent" },
    ],
  },
  "staff-deactivate": {
    id: "staff-deactivate",
    question:
      "직원 관리 화면에서 해당 직원 항목의 활성/비활성 토글을 사용하세요. 비활성화된 직원은 더 이상 로그인할 수 없습니다.",
    options: [],
    autoTerminal: true,
  },
  "account-1": {
    id: "account-1",
    question: "어떤 문제인가요?",
    options: [
      { id: "ac-pw", label: "비밀번호 변경 후 로그아웃됐어요", nextStepId: "account-pw" },
      { id: "ac-reauth", label: "재인증 요청이 계속 떠요", nextStepId: "account-reauth" },
      { id: "ac-other", label: "기타 설정 문제", terminal: "ai" },
    ],
  },
  "account-pw": {
    id: "account-pw",
    question:
      "보안상 비밀번호 변경 후 기존 세션이 자동으로 종료됩니다. 새 비밀번호로 다시 로그인하면 정상적으로 이용할 수 있습니다.",
    options: [],
    autoTerminal: true,
  },
  "account-reauth": {
    id: "account-reauth",
    question:
      "세션 만료 또는 보안 정책에 따라 재인증이 요청될 수 있습니다. 로그인 정보를 다시 입력하시면 됩니다. 반복적으로 발생하면 상담원 연결을 통해 확인해 드립니다.",
    options: [],
    autoTerminal: true,
  },
  "terminal": {
    id: "terminal",
    question: "문제가 해결되었나요?",
    options: [],
  },
};
