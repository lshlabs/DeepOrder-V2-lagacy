/**
 * useChatbotSession
 *
 * Manages the chatbot floating-panel state across the entire KDS session.
 * State is persisted to sessionStorage so:
 *   - Switching KDS tabs does NOT lose the conversation
 *   - Closing/minimizing the panel does NOT end the session
 *   - Same-tab refresh restores the current local session
 *   - Closing the browser tab clears sessionStorage and starts fresh
 *
 * Closing the panel  ≠  ending the session.
 * The session only ends when the user explicitly clicks "상담 종료" or
 * "새 문의 시작".
 */

import { useCallback, useEffect, useState } from "react";

import {
  fromStoredMessage,
  generateSupportMessageId,
  localSupportSessionProvider,
  sessionTimestamps,
  toStoredMessage,
} from "../session/localSupportSessionProvider";
import { getSupportSessionProvider } from "../session/apiSupportSessionProvider";
import { mergeSupportMessages } from "../session/supportMessageMerge";
import type {
  ChatMessage,
  ChatbotSessionState,
  ChatSessionStatus,
  QnaPathEntry,
  SupportFaqEventPayload,
} from "../types/support";

// ─── Singleton: shared across all components in the same render tree ──────────
// We use a module-level subscription pattern so every call to the hook
// gets the same live state without needing a React Context.

type Listener = (state: ChatbotSessionState) => void;

let _state: ChatbotSessionState =
  localSupportSessionProvider.getCurrentSession() ?? localSupportSessionProvider.createSession();
const _listeners = new Set<Listener>();

function notify() {
  const provider = getSupportSessionProvider();
  if (provider.source === "local") {
    void provider.saveSession(_state);
  }
  for (const l of _listeners) l(_state);
}

function setState(updater: (prev: ChatbotSessionState) => ChatbotSessionState) {
  _state = { ...updater(_state), ...sessionTimestamps() };
  notify();
}

export function clearChatbotSession() {
  localSupportSessionProvider.resetLocalCache?.();
  _state = localSupportSessionProvider.createSession();
  for (const l of _listeners) l(_state);
}

function isSessionState(value: ChatMessage | ChatbotSessionState): value is ChatbotSessionState {
  return "sessionId" in value && "messages" in value;
}

function mergeServerSession(prev: ChatbotSessionState, next: ChatbotSessionState): ChatbotSessionState {
  const shouldKeepLocalBotFlow =
    next.status === "BOT" && next.messages.length === 0 && prev.status !== "CLOSED" && prev.messages.length > 0;

  return {
    ...next,
    isOpen: prev.isOpen,
    isMinimized: prev.isMinimized,
    status: shouldKeepLocalBotFlow ? prev.status : next.status,
    messages: shouldKeepLocalBotFlow ? prev.messages : next.messages,
    selectedPath: prev.selectedPath,
    currentStepId: prev.currentStepId,
    unreadCount: prev.unreadCount,
  };
}

function applyServerSession(next: ChatbotSessionState) {
  setState((prev) => mergeServerSession(prev, next));
}

function mergeIncomingMessages(prev: ChatbotSessionState, incoming: ChatMessage[]): ChatbotSessionState {
  if (incoming.length === 0) return prev;
  return {
    ...prev,
    messages: mergeSupportMessages(prev.messages, incoming),
  };
}

function latestServerMessageId(session: ChatbotSessionState): number | null {
  return session.messages.reduce<number | null>((latest, message) => {
    if (typeof message.serverId !== "number") return latest;
    return latest === null ? message.serverId : Math.max(latest, message.serverId);
  }, null);
}

// ─── Public hook ──────────────────────────────────────────────────────────────

export type UseChatbotSessionReturn = {
  /** Full session snapshot — re-renders when anything changes */
  session: ChatbotSessionState;
  /** Computed: messages with Date timestamps (not ISO strings) */
  messages: ChatMessage[];
  isApiBacked: boolean;

  // Panel open/close (does NOT end the session)
  open: (context?: string) => void;
  close: () => void;
  minimize: () => void;

  // Conversation state mutations
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => ChatMessage;
  setStatus: (status: ChatSessionStatus) => void;
  setPath: (path: QnaPathEntry[]) => void;
  setCurrentStep: (stepId: string | null) => void;
  markRead: () => void;
  incrementUnread: () => void;

  // Session lifecycle
  endSession: () => void;
  startNewSession: () => void;
  requestAgentHandoff: () => void;
  cancelAgentHandoff: () => Promise<boolean>;
};

export function useChatbotSession(): UseChatbotSessionReturn {
  const [session, setLocalState] = useState<ChatbotSessionState>(_state);
  const isApiBacked = getSupportSessionProvider().source === "api";

  useEffect(() => {
    _listeners.add(setLocalState);
    return () => {
      _listeners.delete(setLocalState);
    };
  }, []);

  useEffect(() => {
    const provider = getSupportSessionProvider();
    if (provider.source !== "api") return;
    void Promise.resolve(provider.getCurrentSession())
      .then((current) => {
        if (current) {
          applyServerSession(current);
        }
      })
      .catch(() => {
        // Keep the local UI state if the support API is temporarily unavailable.
      });
  }, []);

  useEffect(() => {
    const provider = getSupportSessionProvider();
    if (provider.source !== "api" || session.status === "BOT" || session.status === "CLOSED") return;
    const pollingTimer = window.setInterval(() => {
      const afterId = latestServerMessageId(_state);
      if (provider.loadMessages && afterId !== null) {
        void Promise.resolve(provider.loadMessages(session.sessionId, { afterId }))
          .then((messages) => {
            setState((prev) => mergeIncomingMessages(prev, messages));
          })
          .catch(() => {
            // Keep current UI state if polling fails transiently.
          });
        return;
      }
      void Promise.resolve(provider.loadSession(session.sessionId))
        .then((current) => {
          if (current) {
            applyServerSession(current);
          }
        })
        .catch(() => {
          // Keep current UI state if polling fails transiently.
        });
    }, 5000);
    return () => window.clearInterval(pollingTimer);
  }, [session.sessionId, session.status]);

  const messages: ChatMessage[] = session.messages.map(fromStoredMessage);

  const open = useCallback((context?: string) => {
    setState((prev) => {
      const next = { ...prev, isOpen: true, isMinimized: false, unreadCount: 0 };
      if (context && prev.status === "BOT" && prev.messages.length === 0) {
        next.selectedPath = [
          { stepId: "faq", question: "FAQ에서 이어진 문의", selectedOptionLabel: context },
        ];
      }
      return next;
    });
    const provider = getSupportSessionProvider();
    if (provider.source === "api") {
      void Promise.resolve(provider.getCurrentSession())
        .then((current) => current ?? provider.createSession({ isOpen: true }))
        .then((serverSession) => {
          setState((prev) => {
            const next = mergeServerSession(prev, serverSession);
            next.isOpen = true;
            next.isMinimized = false;
            if (context && next.status === "BOT" && next.messages.length === 0) {
              next.selectedPath = [
                { stepId: "faq", question: "FAQ에서 이어진 문의", selectedOptionLabel: context },
              ];
            }
            return next;
          });
        })
        .catch(() => {
          // Opening the local panel should still work if the API request fails.
        });
    }
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const minimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: !prev.isMinimized, unreadCount: 0 }));
  }, []);

  const addMessage = useCallback(
    (msg: Omit<ChatMessage, "id" | "timestamp">): ChatMessage => {
      const provider = getSupportSessionProvider();
      const currentSessionId = _state.sessionId;
      const currentStatus = _state.status;
      const clientMessageId = msg.role === "user" ? generateSupportMessageId() : undefined;
      const full: ChatMessage = {
        ...localSupportSessionProvider.sendMessage(currentSessionId, { ...msg, clientMessageId }),
        clientMessageId,
        deliveryStatus: msg.role === "user" && provider.source === "api" ? "sending" : "sent",
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, toStoredMessage(full)],
      }));
      if (provider.source === "api" && msg.role === "user" && currentStatus !== "BOT") {
        void Promise.resolve(provider.sendMessage(currentSessionId, { ...msg, clientMessageId }))
          .then((result) => {
            if (isSessionState(result)) {
              applyServerSession(result);
            }
          })
          .catch(() => {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((message) =>
                message.clientMessageId === clientMessageId
                  ? { ...message, deliveryStatus: "failed" as const }
                  : message
              ),
            }));
          });
      }
      return full;
    },
    []
  );

  const setStatus = useCallback((status: ChatSessionStatus) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  const setPath = useCallback((path: QnaPathEntry[]) => {
    const provider = getSupportSessionProvider();
    const latestEntry = path[path.length - 1];
    if (provider.source === "api" && latestEntry) {
      const payload: SupportFaqEventPayload = {
        faq_id: latestEntry.stepId,
        label: latestEntry.selectedOptionLabel,
        path: path.map((entry) => entry.selectedOptionLabel),
        category: null,
      };
      void Promise.resolve(
        provider.recordEvent?.(_state.sessionId, {
          eventType: "FAQ_SELECTED",
          payload,
        })
      ).catch(() => undefined);
    }
    setState((prev) => ({ ...prev, selectedPath: path }));
  }, []);

  const setCurrentStep = useCallback((stepId: string | null) => {
    setState((prev) => ({ ...prev, currentStepId: stepId }));
  }, []);

  const markRead = useCallback(() => {
    setState((prev) => ({ ...prev, unreadCount: 0 }));
    const provider = getSupportSessionProvider();
    const lastReadMessageId = latestServerMessageId(_state);
    if (provider.source === "api" && provider.markRead && lastReadMessageId !== null) {
      void Promise.resolve(provider.markRead(_state.sessionId, lastReadMessageId))
        .then((serverSession) => {
          if (serverSession) applyServerSession(serverSession);
        })
        .catch(() => undefined);
    }
  }, []);

  const incrementUnread = useCallback(() => {
    setState((prev) => {
      if (prev.isOpen && !prev.isMinimized) return prev;
      return { ...prev, unreadCount: prev.unreadCount + 1 };
    });
  }, []);

  const endSession = useCallback(() => {
    const provider = getSupportSessionProvider();
    setState((prev) => {
      const closed = localSupportSessionProvider.closeSession(prev.sessionId);
      return {
        ...prev,
        status: closed.status,
        isOpen: closed.isOpen,
        isMinimized: closed.isMinimized,
      };
    });
    if (provider.source === "api") {
      void Promise.resolve(provider.closeSession(session.sessionId))
        .then(applyServerSession)
        .catch(() => {
          // Keep optimistic CLOSED state if the API request fails.
        });
    }
  }, [session.sessionId]);

  const startNewSession = useCallback(() => {
    const provider = getSupportSessionProvider();
    if (provider.source === "api") {
      const previousSessionId = session.sessionId;
      setState(() => localSupportSessionProvider.createSession({ isOpen: true }));
      void Promise.resolve(provider.closeSession(previousSessionId))
        .catch(() => undefined)
        .then(() => provider.createSession({ isOpen: true }))
        .then((serverSession) => {
          setState(() => ({
            ...serverSession,
            isOpen: true,
            isMinimized: false,
            selectedPath: [],
            currentStepId: null,
            unreadCount: 0,
          }));
        })
        .catch(() => {
          // Keep the fresh local session if server creation fails.
        });
      return;
    }
    setState(() => localSupportSessionProvider.createSession({ isOpen: true }));
  }, [session.sessionId]);

  const requestAgentHandoff = useCallback(() => {
    const provider = getSupportSessionProvider();
    setState((prev) => ({ ...prev, status: "WAITING_AGENT" }));
    if (provider.source === "api") {
      void Promise.resolve(provider.requestHandoff(session.sessionId))
        .then(applyServerSession)
        .catch(() => {
          addMessage({ role: "system", content: "상담원 연결 요청에 실패했습니다. 잠시 후 다시 시도해 주세요." });
        });
    }
  }, [addMessage, session.sessionId]);

  const cancelAgentHandoff = useCallback(async () => {
    const provider = getSupportSessionProvider();
    try {
      const nextSession = await Promise.resolve(provider.cancelHandoff(session.sessionId));
      applyServerSession(nextSession);
      return true;
    } catch {
      addMessage({ role: "system", content: "대기 종료에 실패했습니다. 잠시 후 다시 시도해 주세요." });
      return false;
    }
  }, [addMessage, session.sessionId]);

  return {
    session,
    messages,
    isApiBacked,
    open,
    close,
    minimize,
    addMessage,
    setStatus,
    setPath,
    setCurrentStep,
    markRead,
    incrementUnread,
    endSession,
    startNewSession,
    requestAgentHandoff,
    cancelAgentHandoff,
  };
}
