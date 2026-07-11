// ─────────────────────────────────────────────────────────────
// Support session types
// ─────────────────────────────────────────────────────────────

export type SupportView = "HOME" | "QNA" | "CHAT";

export type ChatSessionStatus =
  | "BOT"         // guided Q&A in progress
  | "AI"          // AI chatbot
  | "WAITING_AGENT" // awaiting agent connection
  | "AGENT"       // connected to live agent
  | "CLOSED";     // session ended

export type ChatMessageRole = "user" | "bot" | "ai" | "agent" | "system";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  clientMessageId?: string;
  serverId?: number;
  deliveryStatus?: "sending" | "sent" | "failed";
};

export type StoredMessage = Omit<ChatMessage, "timestamp"> & {
  timestamp: string;
};

export type QnaPathEntry = {
  stepId: string;
  question: string;
  selectedOptionLabel: string;
};

export type SupportFaqEventPayload = {
  faq_id: string;
  label: string;
  path: string[];
  category?: string | null;
};

export type ChatbotSessionState = {
  sessionId: string;
  isOpen: boolean;
  isMinimized: boolean;
  status: ChatSessionStatus;
  messages: StoredMessage[];
  selectedPath: QnaPathEntry[];
  currentStepId: string | null;
  unreadCount: number;
  startedAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type CreateSupportSessionInput = {
  isOpen?: boolean;
};

export type SendSupportMessageInput = Omit<ChatMessage, "id" | "timestamp">;

export type SelectBotOptionInput = {
  label: string;
  nextStepId?: string;
  terminal?: string;
  answer?: string;
};

export type SupportAiContext = {
  session: ChatbotSessionState;
  recentMessages: ChatMessage[];
  selectedPath: QnaPathEntry[];
};

export type SupportAiReply = {
  content: string;
  shouldRecommendHandoff?: boolean;
  summary?: string;
};
