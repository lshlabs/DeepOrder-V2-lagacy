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

export type SupportConversationStatus = "BOT" | "AI" | "WAITING_AGENT" | "AGENT" | "CLOSED" | "EXPIRED";
export type SupportConversationMode = "BOT" | "AI" | "AGENT";
export type SupportMessageSenderType = "USER" | "BOT" | "AI" | "AGENT" | "SYSTEM";

export type SupportMessageResponse = {
  id: number;
  conversation_id: number;
  sender_type: SupportMessageSenderType;
  sender_id: number | null;
  content: string;
  metadata_json: Record<string, unknown>;
  client_message_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type SupportConversationResponse = {
  id: number;
  store_id: string;
  user_id: number;
  status: SupportConversationStatus;
  mode: SupportConversationMode;
  assigned_agent_id: number | null;
  source: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  expires_at: string | null;
  messages: SupportMessageResponse[];
};

export type SupportConversationListResponse = {
  conversations: SupportConversationResponse[];
};

export type CreateSupportConversationRequest = {
  source?: string;
};

export type SendSupportMessageRequest = {
  content: string;
  client_message_id?: string | null;
};

export type SupportMessageListResponse = {
  messages: SupportMessageResponse[];
};

export type CreateSupportEventRequest = {
  event_type: string;
  payload?: Record<string, unknown>;
};

export type SupportEventResponse = {
  id: number;
  conversation_id: number;
  event_type: string;
  payload_json: Record<string, unknown>;
  actor_type: "USER" | "AGENT" | "SYSTEM";
  actor_id: number | null;
  created_at: string;
};

export type SupportEventListResponse = {
  events: SupportEventResponse[];
};

export type MarkSupportReadRequest = {
  last_read_message_id: number;
};

export type SupportAgentQueueItemResponse = {
  conversation_id: number;
  store_id: string;
  user_id: number;
  status: SupportConversationStatus;
  mode: SupportConversationMode;
  latest_message: SupportMessageResponse | null;
  latest_message_preview: string | null;
  latest_message_sender_type: SupportMessageSenderType | null;
  waiting_duration_seconds: number;
  assigned_agent_id: number | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  summary: string | null;
};

export type SupportAgentQueueResponse = {
  conversations: SupportAgentQueueItemResponse[];
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
