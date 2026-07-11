import type {
  ChatMessage,
  ChatbotSessionState,
  CreateSupportSessionInput,
  SelectBotOptionInput,
  SendSupportMessageInput,
  StoredMessage,
} from "../types/support";
import type { SupportSessionProvider } from "./supportSessionProvider";

const STORAGE_KEY = "kds_chatbot_session_v1";
const SESSION_TTL_MS = 10 * 60 * 1000;

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateSupportMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `msg-${crypto.randomUUID()}`;
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function toStoredMessage(msg: ChatMessage): StoredMessage {
  return { ...msg, timestamp: msg.timestamp.toISOString() };
}

export function fromStoredMessage(msg: StoredMessage): ChatMessage {
  return { ...msg, timestamp: new Date(msg.timestamp) };
}

export function sessionTimestamps(now = new Date()) {
  return {
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  };
}

export function createFreshLocalSession(input?: { isOpen?: boolean }): ChatbotSessionState {
  const now = new Date();
  const timestamps = sessionTimestamps(now);
  return {
    sessionId: generateId(),
    isOpen: input?.isOpen ?? false,
    isMinimized: false,
    status: "BOT",
    messages: [],
    selectedPath: [],
    currentStepId: null,
    unreadCount: 0,
    startedAt: now.toISOString(),
    updatedAt: timestamps.updatedAt,
    expiresAt: timestamps.expiresAt,
  };
}

function normalizeSession(parsed: ChatbotSessionState): ChatbotSessionState {
  const startedAt = parsed.startedAt ?? new Date().toISOString();
  const updatedAt = parsed.updatedAt ?? startedAt;
  const expiresAt =
    parsed.expiresAt ?? new Date(new Date(updatedAt).getTime() + SESSION_TTL_MS).toISOString();
  return {
    ...parsed,
    startedAt,
    updatedAt,
    expiresAt,
  };
}

function readCurrentSession(): ChatbotSessionState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeSession(JSON.parse(raw) as ChatbotSessionState);
    if (new Date(parsed.expiresAt).getTime() > Date.now()) {
      return parsed;
    }
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore parse errors
  }
  return null;
}

export const localSupportSessionProvider = {
  source: "local" as const,
  createSession(input?: CreateSupportSessionInput) {
    return createFreshLocalSession(input);
  },
  loadSession(sessionId: string) {
    const current = readCurrentSession();
    return current?.sessionId === sessionId ? current : null;
  },
  getCurrentSession() {
    return readCurrentSession();
  },
  saveSession(session: ChatbotSessionState) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore storage quota errors
    }
  },
  sendMessage(_sessionId: string, input: SendSupportMessageInput) {
    return {
      ...input,
      id: input.clientMessageId ?? generateSupportMessageId(),
      timestamp: new Date(),
    };
  },
  selectBotOption(sessionId: string, input: SelectBotOptionInput) {
    void sessionId;
    void input;
    return readCurrentSession() ?? createFreshLocalSession();
  },
  requestHandoff(sessionId: string) {
    void sessionId;
    const current = readCurrentSession() ?? createFreshLocalSession();
    return {
      ...current,
      status: "WAITING_AGENT",
    };
  },
  cancelHandoff(sessionId: string) {
    void sessionId;
    const current = readCurrentSession() ?? createFreshLocalSession();
    const systemMessage: ChatMessage = {
      id: generateSupportMessageId(),
      role: "system",
      content: "상담원 연결 대기가 종료되었습니다. AI 상담으로 돌아갑니다.",
      timestamp: new Date(),
      deliveryStatus: "sent",
    };
    const aiGreetingMessage: ChatMessage = {
      id: generateSupportMessageId(),
      role: "ai",
      content: "추가로 궁금한 점을 자유롭게 입력해 주세요.",
      timestamp: new Date(),
      deliveryStatus: "sent",
    };
    return {
      ...current,
      status: "AI",
      messages: [...current.messages, toStoredMessage(systemMessage), toStoredMessage(aiGreetingMessage)],
      ...sessionTimestamps(),
    };
  },
  closeSession(sessionId: string) {
    void sessionId;
    const current = readCurrentSession() ?? createFreshLocalSession();
    return {
      ...current,
      status: "CLOSED",
      isOpen: true,
      isMinimized: false,
    };
  },
  resetLocalCache() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  },
} satisfies SupportSessionProvider;
