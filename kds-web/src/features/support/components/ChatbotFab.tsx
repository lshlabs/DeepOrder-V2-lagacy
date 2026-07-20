/**
 * ChatbotFab
 *
 * Floating Action Button + the floating chatbot panel.
 * All chatbot state lives in useChatbotSession (persisted to sessionStorage).
 *
 * Design reference: Air Premia chatbot — plain text bot messages, user selections
 * appear as right-aligned pill chips (not left-side bot choices).
 *
 * State machine:
 *   BOT          → guided Q&A; user choices shown as right-aligned chips
 *   AI           → free-text input, simulated AI replies
 *   WAITING_AGENT → input disabled while waiting for server-side agent assignment
 *   AGENT        → free-text input, simulated agent replies
 *   CLOSED       → read-only, new-session CTA
 */

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Bot,
  CheckCircle,
  ClipboardList,
  Headphones,
  KeyRound,
  ListChecks,
  Loader,
  MessageCircleQuestionMark,
  RefreshCcw,
  Send,
  Settings,
  Store,
  XCircle,
} from "lucide-react";

import { QNA_INITIAL_OPTIONS, QNA_STEPS } from "../data/supportData";
import { useChatbotSession } from "../hooks/useChatbotSession";
import type { QnaPathEntry } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

const SIMULATED_AI: string[] = [
  "말씀하신 내용을 확인했습니다. 설정 메뉴에서 해당 항목을 먼저 확인해 보시겠어요?",
  "kds-web 기능 기준으로 안내해 드릴게요. 조금 더 구체적으로 설명해 주시면 더 정확히 안내 가능합니다.",
  "해당 문제는 권한 설정과 관련이 있을 수 있습니다. 매니저 계정으로 확인이 필요합니다.",
  "직접 데이터 변경은 지원하지 않지만, 화면에서 처리하는 방법을 안내해 드릴 수 있습니다.",
  "이 문제는 상담원 연결이 필요한 경우일 수 있습니다. 상담원 연결을 원하시면 아래 버튼을 눌러주세요.",
];
let _aiIdx = 0;
const BOT_REPLY_DELAY_MS = 520;

const INITIAL_OPTION_HINTS: Record<string, string> = {
  "q-orders": "신규/완료/취소",
  "q-alerts": "소리/권한/기기",
  "q-handling": "완료/체크/알레르기",
  "q-status": "일시중지/브레이크",
  "q-tasks": "담당 메뉴/수량",
  "q-staff": "로그인/PIN/비활성",
  "q-account": "비밀번호/재인증",
  "q-agent": "상담원에게 전달",
};

// Module-level Set tracks which sessionIds have already received their welcome message.
// Using a module-level (not component-level) guard is the only reliable way to prevent
// duplicates across React Strict Mode's double effect invocation, panel close/re-open,
// and component remounts — all of which reset any useRef value.
const _initializedSessions = new Set<string>();
const _greetedSessions = new Set<string>();

function nextSimulatedAiReply(): string {
  const r = SIMULATED_AI[_aiIdx % SIMULATED_AI.length];
  _aiIdx += 1;
  return r;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getInitialOptionIcon(id: string) {
  switch (id) {
    case "q-orders":
      return <ClipboardList size={16} aria-hidden="true" />;
    case "q-alerts":
      return <Bell size={16} aria-hidden="true" />;
    case "q-handling":
      return <ListChecks size={16} aria-hidden="true" />;
    case "q-status":
      return <Store size={16} aria-hidden="true" />;
    case "q-tasks":
      return <CheckCircle size={16} aria-hidden="true" />;
    case "q-staff":
      return <KeyRound size={16} aria-hidden="true" />;
    case "q-account":
      return <Settings size={16} aria-hidden="true" />;
    case "q-agent":
      return <Headphones size={16} aria-hidden="true" />;
    default:
      return <MessageCircleQuestionMark size={16} aria-hidden="true" />;
  }
}

// ─── UserChoiceChips ──────────────────────────────────────────────────────────
// Renders the guided Q&A options as right-aligned pill chips (user's perspective).

type UserChoiceChipsProps = {
  stepId: string;
  onChoose: (label: string, nextStepId?: string, terminal?: string, answer?: string) => void;
};

function UserChoiceChips({ stepId, onChoose }: UserChoiceChipsProps) {
  const options =
    stepId === "initial"
      ? QNA_INITIAL_OPTIONS.map((opt) => ({
          id: opt.id,
          label: opt.label,
          nextStepId: opt.nextStepId,
          terminal: opt.terminal,
          answer: undefined as string | undefined,
        }))
      : (QNA_STEPS[stepId]?.options ?? []).map((opt) => ({
          id: opt.id,
          label: opt.label,
          nextStepId: opt.nextStepId,
          terminal: opt.terminal,
          answer: opt.answer,
        }));

  if (options.length === 0) return null;

  if (stepId === "initial") {
    return (
      <div className="chatbot-initial-grid">
        {options.map((opt) => (
          <button
            key={opt.id}
            className="chatbot-category-card"
            type="button"
            onClick={() => onChoose(opt.label, opt.nextStepId, opt.terminal, opt.answer)}
          >
            <span className="chatbot-category-icon">{getInitialOptionIcon(opt.id)}</span>
            <span className="chatbot-category-text">
              <span className="chatbot-category-label">{opt.label}</span>
              <span className="chatbot-category-hint">{INITIAL_OPTION_HINTS[opt.id]}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="chatbot-step-grid">
      {options.map((opt) => (
        <button
          key={opt.id}
          className="chatbot-step-card"
          type="button"
          onClick={() => onChoose(opt.label, opt.nextStepId, opt.terminal, opt.answer)}
        >
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── TerminalChips ────────────────────────────────────────────────────────────

type TerminalChipsProps = {
  onResolved: () => void;
  onUnresolved: () => void;
  onAI: () => void;
  onAgent: () => void;
  onRestart: () => void;
};

type EscalationChoicesProps = {
  onAI: () => void;
  onAgent: () => void;
};

function TerminalChips({ onResolved, onUnresolved, onAI, onAgent, onRestart }: TerminalChipsProps) {
  return (
    <div className="chatbot-terminal-grid">
      <button className="chatbot-terminal-card chatbot-terminal-card--green" type="button" onClick={onResolved}>
        <CheckCircle size={12} aria-hidden="true" />
        해결됐어요
      </button>
      <button className="chatbot-terminal-card chatbot-terminal-card--red" type="button" onClick={onUnresolved}>
        <XCircle size={12} aria-hidden="true" />
        해결되지 않았어요
      </button>
      <button className="chatbot-terminal-card chatbot-terminal-card--blue" type="button" onClick={onAI}>
        <Bot size={12} aria-hidden="true" />
        AI에게 질문
      </button>
      <button className="chatbot-terminal-card" type="button" onClick={onAgent}>
        <Headphones size={12} aria-hidden="true" />
        상담원 연결
      </button>
      <button className="chatbot-terminal-card chatbot-terminal-card--wide" type="button" onClick={onRestart}>
        <RefreshCcw size={12} aria-hidden="true" />
        처음으로
      </button>
    </div>
  );
}

function EscalationChoices({ onAI, onAgent }: EscalationChoicesProps) {
  return (
    <div className="chatbot-terminal-grid">
      <button className="chatbot-terminal-card chatbot-terminal-card--blue" type="button" onClick={onAI}>
        <Bot size={12} aria-hidden="true" />
        AI에게 질문
      </button>
      <button className="chatbot-terminal-card" type="button" onClick={onAgent}>
        <Headphones size={12} aria-hidden="true" />
        상담원 연결
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatbotFab() {
  const {
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
  } = useChatbotSession();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelingHandoff, setCancelingHandoff] = useState(false);
  const [waitingStartedAtMs, setWaitingStartedAtMs] = useState<number | null>(null);
  const [waitNowMs, setWaitNowMs] = useState(() => Date.now());
  const [botTyping, setBotTyping] = useState(false);
  const [showEscalationChoices, setShowEscalationChoices] = useState(false);
  const [activeChoicesMsgId, setActiveChoicesMsgId] = useState<string | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the user has scrolled up away from the bottom
  const userScrolledUpRef = useRef(false);

  const { isOpen, isMinimized, status, selectedPath, currentStepId, unreadCount } = session;

  // Remove the current sessionId from the guard Set before starting a new session
  // so the new session's fresh ID can be initialized cleanly.
  function handleStartNewSession() {
    _initializedSessions.delete(session.sessionId);
    _greetedSessions.delete(session.sessionId);
    startNewSession();
  }

  // ── Smart scroll: only auto-scroll when user is at/near the bottom ─────────
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const el = messagesRef.current;
    if (!el) return;
    // If the user has scrolled up, don't hijack their scroll position
    if (userScrolledUpRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, botTyping, isOpen, isMinimized]);

  // Track whether user has scrolled away from the bottom
  function handleMessagesScroll() {
    const el = messagesRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distFromBottom > 60;
  }

  // When panel is opened/un-minimized, reset scroll lock
  useEffect(() => {
    if (isOpen && !isMinimized) {
      userScrolledUpRef.current = false;
      markRead();
    }
  }, [isOpen, isMinimized, markRead]);

  // ── Init: show greeting + first choices when session starts fresh ──────────
  // Uses a module-level Set keyed by sessionId so Strict Mode's double-invoke
  // of effects cannot produce a duplicate welcome message.
  useEffect(() => {
    if (status !== "BOT") return;

    if (_initializedSessions.has(session.sessionId)) {
      // Session already initialized — just restore the active chip pointer
      if (messages.length > 0 && currentStepId) {
        const lastBotMsg = [...messages].reverse().find((m) => m.role === "bot");
        if (lastBotMsg) setActiveChoicesMsgId(lastBotMsg.id);
      } else if (messages.length === 0 && !_greetedSessions.has(session.sessionId)) {
        _greetedSessions.add(session.sessionId);
        const greetMsg = addMessage({
          role: "bot",
          content: "문의 유형을 선택해 주세요.",
        });
        setCurrentStep("initial");
        setActiveChoicesMsgId(greetMsg.id);
      }
      return;
    }
    _initializedSessions.add(session.sessionId);

    if (messages.length > 0) {
      // Session already has messages (restored from storage) — restore active chips
      if (currentStepId) {
        const lastBotMsg = [...messages].reverse().find((m) => m.role === "bot");
        if (lastBotMsg) setActiveChoicesMsgId(lastBotMsg.id);
      }
      return;
    }

    // Fresh session — show welcome message + initial choices
    if (_greetedSessions.has(session.sessionId)) return;
    _greetedSessions.add(session.sessionId);

    const faqContext =
      selectedPath.length === 1 && selectedPath[0].stepId === "faq"
        ? selectedPath[0].selectedOptionLabel
        : null;

    const greetMsg = addMessage({
      role: "bot",
      content: faqContext
        ? `FAQ에서 이어진 문의입니다.\n관련 유형을 선택해 주세요.`
        : "문의 유형을 선택해 주세요.",
    });
    setCurrentStep("initial");
    setActiveChoicesMsgId(greetMsg.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]);

  useEffect(() => {
    if (isApiBacked) return;
    if (status !== "WAITING_AGENT") return;
    if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    agentTimerRef.current = setTimeout(() => {
      setStatus("AGENT");
      addMessage({ role: "system", content: "상담원이 연결되었습니다." });
      incrementUnread();
      addMessage({
        role: "agent",
        content: "안녕하세요. 상담원입니다. 불편을 드려 죄송합니다. 확인한 내용을 바탕으로 도움을 드리겠습니다.",
      });
      setActiveChoicesMsgId(null);
      incrementUnread();
    }, 3000);
    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status !== "WAITING_AGENT") {
      setWaitingStartedAtMs(null);
      return;
    }
    const startedAt = Date.now();
    setWaitingStartedAtMs(startedAt);
    setWaitNowMs(startedAt);
    const timer = window.setInterval(() => setWaitNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status, session.sessionId]);

  // ── BOT choice handler ─────────────────────────────────────────────────────
  async function handleBotChoice(
    label: string,
    nextStepId?: string,
    terminal?: string,
    answer?: string
  ) {
    if (botTyping) return;

    // Record user selection as a user bubble (right-side)
    addMessage({ role: "user", content: label });
    setActiveChoicesMsgId(null);
    userScrolledUpRef.current = false; // auto-scroll after user action

    const newEntry: QnaPathEntry = {
      stepId: currentStepId ?? "initial",
      question:
        currentStepId === "initial"
          ? "어떻게 도와드릴까요?"
          : (QNA_STEPS[currentStepId ?? ""]?.question ?? ""),
      selectedOptionLabel: label,
    };
    const newPath = [...selectedPath, newEntry];
    setPath(newPath);

    setBotTyping(true);
    await wait(BOT_REPLY_DELAY_MS);
    setBotTyping(false);

    if (terminal === "resolved") {
      const botMsg = addMessage({
        role: "bot",
        content: "문제가 해결되었나요?",
      });
      setCurrentStep("terminal");
      setActiveChoicesMsgId(botMsg.id);
      return;
    }
    if (terminal === "agent") {
      transitionToAgent(newPath);
      return;
    }
    if (terminal === "ai") {
      transitionToAI(newPath);
      return;
    }

    if (answer) {
      addMessage({ role: "bot", content: answer });
    }

    if (nextStepId === "terminal") {
      const botMsg = addMessage({
        role: "bot",
        content: "문제가 해결되었나요?",
      });
      setCurrentStep("terminal");
      setActiveChoicesMsgId(botMsg.id);
      return;
    }

    if (nextStepId && QNA_STEPS[nextStepId]) {
      const nextStep = QNA_STEPS[nextStepId];
      const botMsg = addMessage({ role: "bot", content: nextStep.question });

      if (nextStep.autoTerminal) {
        // Deliver answer directly — skip confirm chip, go straight to terminal
        const terminalMsg = addMessage({ role: "bot", content: "문제가 해결되었나요?" });
        setCurrentStep("terminal");
        setActiveChoicesMsgId(terminalMsg.id);
      } else {
        setCurrentStep(nextStepId);
        setActiveChoicesMsgId(botMsg.id);
      }
    }
  }

  // ── Terminal choice handler ────────────────────────────────────────────────
  function handleTerminalChoice(choice: "resolved" | "unresolved" | "ai" | "agent" | "restart") {
    setActiveChoicesMsgId(null);
    userScrolledUpRef.current = false;
    if (choice === "resolved") {
      setShowEscalationChoices(false);
      addMessage({ role: "system", content: "문제가 해결되었습니다. 도움이 되었으면 좋겠습니다." });
      endSession();
      return;
    }
    if (choice === "unresolved") {
      setShowEscalationChoices(true);
      const botMsg = addMessage({ role: "bot", content: "어떤 방식으로 도와드릴까요?" });
      setActiveChoicesMsgId(botMsg.id);
      return;
    }
    if (choice === "ai") {
      setShowEscalationChoices(false);
      transitionToAI(selectedPath);
    }
    if (choice === "agent") {
      setShowEscalationChoices(false);
      transitionToAgent(selectedPath);
    }
    if (choice === "restart") {
      setShowEscalationChoices(false);
      addMessage({ role: "system", content: "처음으로 돌아갑니다." });
      setPath([]);
      setCurrentStep("initial");
      setStatus("BOT");
      const botMsg = addMessage({
        role: "bot",
        content: "아래에서 문제 유형을 다시 선택해 주세요.",
      });
      setActiveChoicesMsgId(botMsg.id);
    }
  }

  function transitionToAI(path: QnaPathEntry[]) {
    void path;
    setStatus("AI");
    addMessage({
      role: "ai",
      content: "추가로 궁금한 점을 자유롭게 입력해 주세요.",
    });
    setActiveChoicesMsgId(null);
    userScrolledUpRef.current = false;
    setTimeout(() => textareaRef.current?.focus(), 80);
  }

  function transitionToAgent(path: QnaPathEntry[]) {
    void path;
    requestAgentHandoff();
    addMessage({
      role: "system",
      content: "이전 상담 내용을 전달하고 상담원을 연결하고 있습니다.",
    });
    userScrolledUpRef.current = false;
  }

  // ── Free-text send ─────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || sending || status === "CLOSED" || status === "BOT" || status === "WAITING_AGENT") return;
    setInput("");
    setSending(true);
    userScrolledUpRef.current = false;
    addMessage({ role: "user", content: text });

    if (status === "AI") {
      if (isApiBacked) {
        setSending(false);
        textareaRef.current?.focus();
        return;
      }
      await new Promise((r) => setTimeout(r, 900));
      addMessage({ role: "ai", content: nextSimulatedAiReply() });
      incrementUnread();
    } else if (status === "AGENT") {
      await new Promise((r) => setTimeout(r, 1200));
      addMessage({
        role: "agent",
        content: "확인했습니다. 조금 더 상세히 확인 후 안내해 드리겠습니다.",
      });
      incrementUnread();
    }

    setSending(false);
    textareaRef.current?.focus();
  }

  async function handleCancelHandoff() {
    if (cancelingHandoff) return;
    setCancelingHandoff(true);
    const cancelled = await cancelAgentHandoff();
    setCancelingHandoff(false);
    if (cancelled) {
      setActiveChoicesMsgId(null);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !(e.keyCode === 229)) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleClose() {
    handleStartNewSession();
  }

  // ── Computed flags ─────────────────────────────────────────────────────────
  const canType = status === "AI" || status === "AGENT";
  const showEndBtn = status === "AI" || status === "AGENT";
  const waitingElapsedLabel =
    status === "WAITING_AGENT" && waitingStartedAtMs !== null
      ? formatElapsedTime(waitNowMs - waitingStartedAtMs)
      : "0:00";

  return (
    <>
      {isOpen && !isMinimized ? (
        <button
          className="chatbot-backdrop"
          type="button"
          aria-label="챗봇 닫기"
          onClick={close}
        />
      ) : null}

      {/* Floating panel — hidden entirely when minimized (minimized = FAB only visible) */}
      {isOpen && !isMinimized ? (
        <div
          className="chatbot-panel"
          role="dialog"
          aria-label="챗봇 상담"
          aria-modal="false"
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-icon" aria-hidden="true">
              {status === "AI" ? (
                <Bot size={16} />
              ) : status === "AGENT" || status === "WAITING_AGENT" ? (
                <Headphones size={16} />
              ) : (
                <MessageCircleQuestionMark size={16} />
              )}
            </div>
            <div className="chatbot-header-title">
              <span className="chatbot-header-name">
                {status === "AI"
                  ? "AI 상담"
                  : status === "WAITING_AGENT"
                  ? "상담원 연결 대기"
                  : status === "AGENT"
                  ? "상담원 상담"
                  : status === "CLOSED"
                  ? "상담 종료"
                  : "고객지원 챗봇"}
              </span>
            </div>
            <div className="chatbot-header-actions">
              {showEndBtn ? (
                <button
                  className="chatbot-header-action-btn chatbot-header-action-btn--end"
                  onClick={handleClose}
                  type="button"
                  title="처음으로"
                  aria-label="처음으로"
                >
                  처음으로
                </button>
              ) : null}
              {/*
               * 최소화 버튼, 닫기 버튼 제거.
               * - 최소화: 외부 클릭 또는 FAB 버튼 클릭으로만 동작.
               * - 닫기(패널 숨김): 추후 세션 만료 등의 이벤트에서 close()를 호출해 구현 예정.
               *   현재는 미구현 상태이며 FAB를 통한 재오픈으로 대체.
               */}
            </div>
          </div>

          {/* Body */}
          <>
            {/* Messages */}
              <div
                className="chatbot-messages"
                ref={messagesRef}
                role="log"
                aria-live="polite"
                onScroll={handleMessagesScroll}
              >
                {messages.map((msg) => {
                  // ── System message ─────────────────────────────────────────
                  if (msg.role === "system") {
                    return (
                      <div key={msg.id} className="chatbot-msg-system">
                        <span>{msg.content}</span>
                      </div>
                    );
                  }

                  // ── User message (text typed by user) ──────────────────────
                  if (msg.role === "user") {
                    return (
                      <div key={msg.id} className="chatbot-msg chatbot-msg--user">
                        <div className="chatbot-msg-body chatbot-msg-body--user">
                          <div className="chatbot-bubble chatbot-bubble--user">
                            {msg.content.split("\n").map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                          <time className="chatbot-msg-time chatbot-msg-time--user">
                            {formatTime(msg.timestamp)}
                          </time>
                        </div>
                      </div>
                    );
                  }

                  // ── Bot message (from guided Q&A) ──────────────────────────
                  if (msg.role === "bot") {
                    const isActive = msg.id === activeChoicesMsgId;
                    return (
                      <div key={msg.id} className="chatbot-msg-group">
                        {/* Bot bubble row */}
                        <div className="chatbot-msg chatbot-msg--bot">
                          <div className="chatbot-msg-avatar chatbot-msg-avatar--bot" aria-hidden="true">
                            <MessageCircleQuestionMark size={12} />
                          </div>
                          <div className="chatbot-msg-body">
                            <div className="chatbot-bubble chatbot-bubble--bot">
                              {msg.content.split("\n").map((line, i) => (
                                <p key={i}>{line || "\u00A0"}</p>
                              ))}
                            </div>
                            <time className="chatbot-msg-time">{formatTime(msg.timestamp)}</time>
                          </div>
                        </div>
                        {isActive && currentStepId && !botTyping ? (
                          <div className="chatbot-choice-row">
                            {showEscalationChoices ? (
                              <EscalationChoices
                                onAI={() => handleTerminalChoice("ai")}
                                onAgent={() => handleTerminalChoice("agent")}
                              />
                            ) : currentStepId !== "terminal" ? (
                              <UserChoiceChips stepId={currentStepId} onChoose={handleBotChoice} />
                            ) : (
                              <TerminalChips
                                onResolved={() => handleTerminalChoice("resolved")}
                                onUnresolved={() => handleTerminalChoice("unresolved")}
                                onAI={() => handleTerminalChoice("ai")}
                                onAgent={() => handleTerminalChoice("agent")}
                                onRestart={() => handleTerminalChoice("restart")}
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  // ── AI message ─────────────────────────────────────────────
                  if (msg.role === "ai") {
                    return (
                      <div key={msg.id} className="chatbot-msg chatbot-msg--ai">
                        <div className="chatbot-msg-avatar chatbot-msg-avatar--ai" aria-hidden="true">
                          <Bot size={12} />
                        </div>
                        <div className="chatbot-msg-body">
                          <div className="chatbot-bubble chatbot-bubble--ai">
                            {msg.content.split("\n").map((line, i) => (
                              <p key={i}>{line || "\u00A0"}</p>
                            ))}
                          </div>
                          <time className="chatbot-msg-time">{formatTime(msg.timestamp)}</time>
                        </div>
                      </div>
                    );
                  }

                  // ── Agent message ──────────────────────────────────────────
                  if (msg.role === "agent") {
                    return (
                      <div key={msg.id} className="chatbot-msg chatbot-msg--agent">
                        <div className="chatbot-msg-avatar chatbot-msg-avatar--agent" aria-hidden="true">
                          <Headphones size={12} />
                        </div>
                        <div className="chatbot-msg-body">
                          <div className="chatbot-bubble chatbot-bubble--agent">
                            {msg.content.split("\n").map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                          <time className="chatbot-msg-time">{formatTime(msg.timestamp)}</time>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Typing indicator */}
                {sending && (status === "AI" || status === "AGENT") ? (
                  <div className="chatbot-msg chatbot-msg--ai">
                    <div
                      className={`chatbot-msg-avatar ${
                        status === "AGENT" ? "chatbot-msg-avatar--agent" : "chatbot-msg-avatar--ai"
                      }`}
                      aria-hidden="true"
                    >
                      {status === "AGENT" ? <Headphones size={12} /> : <Bot size={12} />}
                    </div>
                    <div className="chatbot-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ) : null}

                {botTyping && status === "BOT" ? (
                  <div className="chatbot-msg chatbot-msg--bot chatbot-msg--typing">
                    <div className="chatbot-msg-avatar chatbot-msg-avatar--bot" aria-hidden="true">
                      <MessageCircleQuestionMark size={12} />
                    </div>
                    <div className="chatbot-typing chatbot-typing--bot" aria-label="챗봇 답변 작성 중">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Free-text input area */}
              {canType ? (
                <div className="chatbot-input-area">
                  <textarea
                    ref={textareaRef}
                    className="chatbot-textarea"
                    disabled={sending}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요..."
                    rows={2}
                    value={input}
                  />
                  <button
                    aria-label="보내기"
                    className="chatbot-send-btn"
                    disabled={!input.trim() || sending}
                    onClick={() => void handleSend()}
                    type="button"
                  >
                    <Send size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              {/* Waiting state notice */}
              {status === "WAITING_AGENT" ? (
                <div className="chatbot-waiting-notice">
                  <div className="chatbot-waiting-status">
                    <Loader size={13} aria-hidden="true" className="chatbot-spin" />
                    <span>상담원 연결 대기 중...</span>
                    <span className="chatbot-waiting-elapsed">{waitingElapsedLabel}</span>
                    <button
                      className="chatbot-waiting-cancel-btn"
                      disabled={cancelingHandoff}
                      onClick={() => void handleCancelHandoff()}
                      type="button"
                    >
                      {cancelingHandoff ? "처리 중" : "종료"}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Closed state CTA */}
              {status === "CLOSED" ? (
                <div className="chatbot-closed-footer">
                  <p>상담이 종료되었습니다.</p>
                  <button
                    className="chatbot-new-session-btn"
                    onClick={handleStartNewSession}
                    type="button"
                  >
                    <RefreshCcw size={12} aria-hidden="true" />
                    새 문의 시작
                  </button>
                </div>
              ) : null}
          </>
        </div>
      ) : null}

      {!isOpen || isMinimized ? (
        <span className="chatbot-fab-label" aria-hidden="true">
          챗봇 문의
        </span>
      ) : null}

      {/* FAB — always visible; toggles between open and minimized */}
      <button
        aria-label={isOpen && !isMinimized ? "챗봇 최소화" : "챗봇 상담 열기"}
        className={`chatbot-fab${isOpen && !isMinimized ? " chatbot-fab--open" : ""}`}
        onClick={() => (isOpen && !isMinimized ? minimize() : open())}
        type="button"
      >
        <MessageCircleQuestionMark size={22} aria-hidden="true" />
        {unreadCount > 0 && (!isOpen || isMinimized) ? (
          <span className="chatbot-fab-badge" aria-label={`읽지 않은 메시지 ${unreadCount}개`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
    </>
  );
}
