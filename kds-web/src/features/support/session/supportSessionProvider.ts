import type {
  ChatMessage,
  ChatbotSessionState,
  CreateSupportSessionInput,
  SelectBotOptionInput,
  SendSupportMessageInput,
  SupportAiContext,
  SupportAiReply,
} from "../types/support";

export type MaybePromise<T> = T | Promise<T>;

export type SupportSessionProvider = {
  source: "local" | "api";
  createSession(input?: CreateSupportSessionInput): MaybePromise<ChatbotSessionState>;
  loadSession(sessionId: string): MaybePromise<ChatbotSessionState | null>;
  getCurrentSession(): MaybePromise<ChatbotSessionState | null>;
  saveSession(session: ChatbotSessionState): MaybePromise<void>;
  sendMessage(sessionId: string, input: SendSupportMessageInput): MaybePromise<ChatMessage | ChatbotSessionState>;
  loadMessages?(sessionId: string, input?: { afterId?: number; beforeId?: number; limit?: number }): MaybePromise<ChatMessage[]>;
  recordEvent?(sessionId: string, input: { eventType: string; payload?: Record<string, unknown> }): MaybePromise<void>;
  markRead?(sessionId: string, lastReadMessageId: number): MaybePromise<ChatbotSessionState | null>;
  selectBotOption(sessionId: string, input: SelectBotOptionInput): MaybePromise<ChatbotSessionState>;
  requestHandoff(sessionId: string): MaybePromise<ChatbotSessionState>;
  cancelHandoff(sessionId: string): MaybePromise<ChatbotSessionState>;
  closeSession(sessionId: string): MaybePromise<ChatbotSessionState>;
  resetLocalCache?(): MaybePromise<void>;
};

export type SupportAiProvider = {
  generateReply(context: SupportAiContext): MaybePromise<SupportAiReply>;
  summarizeConversation(context: SupportAiContext): MaybePromise<string | null>;
  recommendHandoff(context: SupportAiContext): MaybePromise<boolean>;
};
