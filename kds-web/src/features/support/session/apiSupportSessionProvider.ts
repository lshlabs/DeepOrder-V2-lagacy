import {
  apiCancelSupportHandoff,
  apiCloseSupportConversation,
  apiCreateSupportEvent,
  apiCreateSupportConversation,
  apiGetCurrentSupportConversation,
  apiGetSupportConversation,
  apiListSupportEvents,
  apiListSupportMessages,
  apiMarkSupportRead,
  apiRequestSupportHandoff,
  apiSendSupportMessage,
} from "../../../lib/api";
import { loadStoredAccessToken } from "../../../lib/auth";
import type { SupportConversationResponse, SupportMessageResponse } from "../../../types";
import type {
  ChatMessage,
  ChatbotSessionState,
  ChatSessionStatus,
  SendSupportMessageInput,
  SupportFaqEventPayload,
} from "../types/support";
import { localSupportSessionProvider as localSupportSessionProviderFallback } from "./localSupportSessionProvider";
import type { SupportSessionProvider } from "./supportSessionProvider";

function accessTokenOrNull(): string | null {
  return loadStoredAccessToken();
}

function toChatStatus(status: SupportConversationResponse["status"]): ChatSessionStatus {
  return status === "EXPIRED" ? "CLOSED" : status;
}

function inferChatStatus(conversation: SupportConversationResponse): ChatSessionStatus {
  const status = toChatStatus(conversation.status);
  const lastInteractiveMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.sender_type !== "SYSTEM");

  if (status === "BOT" && lastInteractiveMessage?.sender_type === "AI") {
    return "AI";
  }

  return status;
}

function toChatRole(senderType: SupportMessageResponse["sender_type"]): ChatMessage["role"] {
  switch (senderType) {
    case "USER":
      return "user";
    case "BOT":
      return "bot";
    case "AI":
      return "ai";
    case "AGENT":
      return "agent";
    case "SYSTEM":
      return "system";
  }
}

function toStoredMessages(messages: SupportMessageResponse[]): ChatbotSessionState["messages"] {
  return messages.map((message) => ({
    id: message.client_message_id ?? `server-msg-${message.id}`,
    role: toChatRole(message.sender_type),
    content: message.content,
    timestamp: message.created_at,
    clientMessageId: message.client_message_id ?? undefined,
    serverId: message.id,
    deliveryStatus: "sent" as const,
  }));
}

function toChatMessages(messages: SupportMessageResponse[]): ChatMessage[] {
  return toStoredMessages(messages).map((message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
}

function toSession(
  conversation: SupportConversationResponse,
  previous?: ChatbotSessionState | null,
  input?: { isOpen?: boolean; selectedPath?: ChatbotSessionState["selectedPath"] },
): ChatbotSessionState {
  return {
    sessionId: String(conversation.id),
    isOpen: input?.isOpen ?? previous?.isOpen ?? false,
    isMinimized: previous?.isMinimized ?? false,
    status: inferChatStatus(conversation),
    messages: toStoredMessages(conversation.messages),
    selectedPath: input?.selectedPath ?? previous?.selectedPath ?? [],
    currentStepId: previous?.currentStepId ?? null,
    unreadCount: previous?.unreadCount ?? 0,
    startedAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    expiresAt: conversation.expires_at ?? conversation.updated_at,
  };
}

async function toHydratedSession(
  accessToken: string,
  conversation: SupportConversationResponse,
  previous?: ChatbotSessionState | null,
  input?: { isOpen?: boolean },
): Promise<ChatbotSessionState> {
  const events = await apiListSupportEvents(accessToken, conversation.id).catch(() => ({ events: [] }));
  const selectedPath = events.events
    .filter((event) => event.event_type === "FAQ_SELECTED")
    .map((event) => ({
      stepId: String(event.payload_json.faq_id ?? "faq"),
      question: "FAQ 선택",
      selectedOptionLabel: String(event.payload_json.label ?? ""),
    }))
    .filter((entry) => entry.selectedOptionLabel);
  return toSession(conversation, previous, {
    ...input,
    selectedPath: selectedPath.length > 0 ? selectedPath : undefined,
  });
}

export const apiSupportSessionProvider = {
  source: "api" as const,
  async createSession(input) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) {
      throw new Error("Support API requires an access token.");
    }
    const conversation = await apiCreateSupportConversation(accessToken, { source: "kds-web" });
    return toSession(conversation, null, input);
  },
  async loadSession(sessionId) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) return null;
    const conversation = await apiGetSupportConversation(accessToken, sessionId);
    return toHydratedSession(accessToken, conversation);
  },
  async getCurrentSession() {
    const accessToken = accessTokenOrNull();
    if (!accessToken) return null;
    const conversation = await apiGetCurrentSupportConversation(accessToken);
    return conversation ? toHydratedSession(accessToken, conversation) : null;
  },
  async saveSession() {
    // Server-backed sessions are persisted through explicit API actions.
  },
  async sendMessage(sessionId: string, input: SendSupportMessageInput) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) {
      throw new Error("Support API requires an access token.");
    }
    const conversation = await apiSendSupportMessage(accessToken, sessionId, {
      content: input.content,
      client_message_id: input.clientMessageId ?? null,
    });
    return toSession(conversation);
  },
  async loadMessages(sessionId, input) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) return [];
    const response = await apiListSupportMessages(accessToken, sessionId, {
      after_id: input?.afterId,
      before_id: input?.beforeId,
      limit: input?.limit,
    });
    return toChatMessages(response.messages);
  },
  async recordEvent(sessionId, input) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) return;
    await apiCreateSupportEvent(accessToken, sessionId, {
      event_type: input.eventType,
      payload: input.payload ?? {},
    });
  },
  async markRead(sessionId, lastReadMessageId) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) return null;
    const conversation = await apiMarkSupportRead(accessToken, sessionId, {
      last_read_message_id: lastReadMessageId,
    });
    return toSession(conversation);
  },
  async selectBotOption(sessionId, input) {
    const payload: SupportFaqEventPayload = {
      faq_id: input.nextStepId ?? input.terminal ?? input.label,
      label: input.label,
      path: [input.label],
      category: null,
    };
    await this.recordEvent?.(sessionId, {
      eventType: "FAQ_SELECTED",
      payload,
    });
    if (input.answer) {
      await this.recordEvent?.(sessionId, {
        eventType: "FAQ_ANSWER_SHOWN",
        payload: {
          label: input.label,
          answer: input.answer,
        },
      });
    }
    return (await this.loadSession(sessionId)) ?? (await this.createSession());
  },
  async requestHandoff(sessionId) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) {
      throw new Error("Support API requires an access token.");
    }
    const conversation = await apiRequestSupportHandoff(accessToken, sessionId);
    return toSession(conversation);
  },
  async cancelHandoff(sessionId) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) {
      throw new Error("Support API requires an access token.");
    }
    const conversation = await apiCancelSupportHandoff(accessToken, sessionId);
    return toSession(conversation);
  },
  async closeSession(sessionId) {
    const accessToken = accessTokenOrNull();
    if (!accessToken) {
      throw new Error("Support API requires an access token.");
    }
    const conversation = await apiCloseSupportConversation(accessToken, sessionId);
    return toSession(conversation, { sessionId } as ChatbotSessionState);
  },
  async resetLocalCache() {
    // Nothing to clear locally for server-backed support sessions.
  },
} satisfies SupportSessionProvider;

export function getSupportSessionProvider(): SupportSessionProvider {
  return accessTokenOrNull() ? apiSupportSessionProvider : localSupportSessionProviderFallback;
}
