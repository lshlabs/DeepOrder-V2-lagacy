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

import { cn } from "@/lib/utils";
import { QNA_INITIAL_OPTIONS, QNA_STEPS } from "../data/supportData";
import { useChatbotSession } from "../hooks/useChatbotSession";
import type { QnaPathEntry } from "../types/support";

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
      <div className="grid grid-cols-2 gap-2 w-full">
        {options.map((opt) => (
          <button
            key={opt.id}
            className={cn(
              "flex items-center gap-[9px] justify-start min-h-[54px] w-full",
              "px-[10px] py-[9px] text-left rounded-md",
              "bg-card border border-border text-foreground",
              "hover:bg-primary/5 hover:border-primary/30 transition-colors"
            )}
            type="button"
            onClick={() => onChoose(opt.label, opt.nextStepId, opt.terminal, opt.answer)}
          >
            <span
              className={cn(
                "flex items-center justify-center w-[30px] h-[30px] shrink-0",
                "bg-muted border border-border rounded-sm text-primary"
              )}
            >
              {getInitialOptionIcon(opt.id)}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] font-bold text-foreground leading-[1.25]">
                {opt.label}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground leading-[1.25] overflow-hidden text-ellipsis whitespace-nowrap">
                {INITIAL_OPTION_HINTS[opt.id]}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-[7px] w-full">
      {options.map((opt) => (
        <button
          key={opt.id}
          className={cn(
            "flex items-center justify-end max-w-[82%] w-fit min-h-9 px-[13px] py-[9px]",
            "rounded-[16px_16px_4px_16px] bg-primary border-none text-primary-foreground text-right",
            "hover:bg-primary/90 transition-colors"
          )}
          type="button"
          onClick={() => onChoose(opt.label, opt.nextStepId, opt.terminal, opt.answer)}
        >
          <span className="block text-xs font-semibold leading-[1.45] overflow-wrap-anywhere">
            {opt.label}
          </span>
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
  const cardBase = cn(
    "flex items-center justify-center gap-1.5 min-h-11 w-full px-[10px] py-[9px]",
    "rounded-md border text-xs font-semibold text-center",
    "bg-card text-foreground border-border",
    "hover:bg-muted hover:border-border/80 transition-colors"
  );
  return (
    <div className="grid grid-cols-2 gap-[7px] w-full">
      <button
        className={cn(cardBase, "border-success/30 text-success hover:bg-success/5")}
        type="button"
        onClick={onResolved}
      >
        <CheckCircle size={12} aria-hidden="true" />
        해결됐어요
      </button>
      <button
        className={cn(cardBase, "border-destructive/20 text-destructive hover:bg-destructive/5")}
        type="button"
        onClick={onUnresolved}
      >
        <XCircle size={12} aria-hidden="true" />
        해결되지 않았어요
      </button>
      <button
        className={cn(cardBase, "border-blue-500/20 text-blue-500 hover:bg-blue-500/5")}
        type="button"
        onClick={onAI}
      >
        <Bot size={12} aria-hidden="true" />
        AI에게 질문
      </button>
      <button className={cardBase} type="button" onClick={onAgent}>
        <Headphones size={12} aria-hidden="true" />
        상담원 연결
      </button>
      <button className={cn(cardBase, "col-span-2")} type="button" onClick={onRestart}>
        <RefreshCcw size={12} aria-hidden="true" />
        처음으로
      </button>
    </div>
  );
}

function EscalationChoices({ onAI, onAgent }: EscalationChoicesProps) {
  const cardBase = cn(
    "flex items-center justify-center gap-1.5 min-h-11 w-full px-[10px] py-[9px]",
    "rounded-md border text-xs font-semibold text-center",
    "bg-card text-foreground border-border",
    "hover:bg-muted hover:border-border/80 transition-colors"
  );
  return (
    <div className="grid grid-cols-2 gap-[7px] w-full">
      <button
        className={cn(cardBase, "border-blue-500/20 text-blue-500 hover:bg-blue-500/5")}
        type="button"
        onClick={onAI}
      >
        <Bot size={12} aria-hidden="true" />
        AI에게 질문
      </button>
      <button className={cardBase} type="button" onClick={onAgent}>
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
  const userScrolledUpRef = useRef(false);

  const { isOpen, isMinimized, status, selectedPath, currentStepId, unreadCount } = session;

  function handleStartNewSession() {
    _initializedSessions.delete(session.sessionId);
    _greetedSessions.delete(session.sessionId);
    startNewSession();
  }

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const el = messagesRef.current;
    if (!el) return;
    if (userScrolledUpRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, botTyping, isOpen, isMinimized]);

  function handleMessagesScroll() {
    const el = messagesRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distFromBottom > 60;
  }

  useEffect(() => {
    if (isOpen && !isMinimized) {
      userScrolledUpRef.current = false;
      markRead();
    }
  }, [isOpen, isMinimized, markRead]);

  useEffect(() => {
    if (status !== "BOT") return;

    if (_initializedSessions.has(session.sessionId)) {
      if (messages.length > 0 && currentStepId) {
        const lastBotMsg = [...messages].reverse().find((m) => m.role === "bot");
        if (lastBotMsg) setActiveChoicesMsgId(lastBotMsg.id);
      } else if (messages.length === 0 && !_greetedSessions.has(session.sessionId)) {
        _greetedSessions.add(session.sessionId);
        const greetMsg = addMessage({ role: "bot", content: "문의 유형을 선택해 주세요." });
        setCurrentStep("initial");
        setActiveChoicesMsgId(greetMsg.id);
      }
      return;
    }
    _initializedSessions.add(session.sessionId);

    if (messages.length > 0) {
      if (currentStepId) {
        const lastBotMsg = [...messages].reverse().find((m) => m.role === "bot");
        if (lastBotMsg) setActiveChoicesMsgId(lastBotMsg.id);
      }
      return;
    }

    if (_greetedSessions.has(session.sessionId)) return;
    _greetedSessions.add(session.sessionId);

    const faqContext =
      selectedPath.length === 1 && selectedPath[0].stepId === "faq"
        ? selectedPath[0].selectedOptionLabel
        : null;

    const greetMsg = addMessage({
      role: "bot",
      content: faqContext
        ? "FAQ에서 이어진 문의입니다.\n관련 유형을 선택해 주세요."
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

  async function handleBotChoice(
    label: string,
    nextStepId?: string,
    terminal?: string,
    answer?: string
  ) {
    if (botTyping) return;
    addMessage({ role: "user", content: label });
    setActiveChoicesMsgId(null);
    userScrolledUpRef.current = false;

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
      const botMsg = addMessage({ role: "bot", content: "문제가 해결되었나요?" });
      setCurrentStep("terminal");
      setActiveChoicesMsgId(botMsg.id);
      return;
    }
    if (terminal === "agent") { transitionToAgent(newPath); return; }
    if (terminal === "ai") { transitionToAI(newPath); return; }

    if (answer) addMessage({ role: "bot", content: answer });

    if (nextStepId === "terminal") {
      const botMsg = addMessage({ role: "bot", content: "문제가 해결되었나요?" });
      setCurrentStep("terminal");
      setActiveChoicesMsgId(botMsg.id);
      return;
    }

    if (nextStepId && QNA_STEPS[nextStepId]) {
      const nextStep = QNA_STEPS[nextStepId];
      const botMsg = addMessage({ role: "bot", content: nextStep.question });
      if (nextStep.autoTerminal) {
        const terminalMsg = addMessage({ role: "bot", content: "문제가 해결되었나요?" });
        setCurrentStep("terminal");
        setActiveChoicesMsgId(terminalMsg.id);
      } else {
        setCurrentStep(nextStepId);
        setActiveChoicesMsgId(botMsg.id);
      }
    }
  }

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
    if (choice === "ai") { setShowEscalationChoices(false); transitionToAI(selectedPath); }
    if (choice === "agent") { setShowEscalationChoices(false); transitionToAgent(selectedPath); }
    if (choice === "restart") {
      setShowEscalationChoices(false);
      addMessage({ role: "system", content: "처음으로 돌아갑니다." });
      setPath([]);
      setCurrentStep("initial");
      setStatus("BOT");
      const botMsg = addMessage({ role: "bot", content: "아래에서 문제 유형을 다시 선택해 주세요." });
      setActiveChoicesMsgId(botMsg.id);
    }
  }

  function transitionToAI(path: QnaPathEntry[]) {
    void path;
    setStatus("AI");
    addMessage({ role: "ai", content: "추가로 궁금한 점을 자유롭게 입력해 주세요." });
    setActiveChoicesMsgId(null);
    userScrolledUpRef.current = false;
    setTimeout(() => textareaRef.current?.focus(), 80);
  }

  function transitionToAgent(path: QnaPathEntry[]) {
    void path;
    requestAgentHandoff();
    addMessage({ role: "system", content: "이전 상담 내용을 전달하고 상담원을 연결하고 있습니다." });
    userScrolledUpRef.current = false;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || status === "CLOSED" || status === "BOT" || status === "WAITING_AGENT") return;
    setInput("");
    setSending(true);
    userScrolledUpRef.current = false;
    addMessage({ role: "user", content: text });

    if (status === "AI") {
      if (isApiBacked) { setSending(false); textareaRef.current?.focus(); return; }
      await new Promise((r) => setTimeout(r, 900));
      addMessage({ role: "ai", content: nextSimulatedAiReply() });
      incrementUnread();
    } else if (status === "AGENT") {
      await new Promise((r) => setTimeout(r, 1200));
      addMessage({ role: "agent", content: "확인했습니다. 조금 더 상세히 확인 후 안내해 드리겠습니다." });
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
    if (cancelled) { setActiveChoicesMsgId(null); textareaRef.current?.focus(); }
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

  const canType = status === "AI" || status === "AGENT";
  const showEndBtn = status === "AI" || status === "AGENT";
  const waitingElapsedLabel =
    status === "WAITING_AGENT" && waitingStartedAtMs !== null
      ? formatElapsedTime(waitNowMs - waitingStartedAtMs)
      : "0:00";

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && !isMinimized ? (
        <button
          className="fixed inset-0 bg-black/[0.18] border-none p-0 cursor-default z-[998] block md:hidden"
          type="button"
          aria-label="챗봇 닫기"
          onClick={close}
        />
      ) : null}

      {/* Floating panel */}
      {isOpen && !isMinimized ? (
        <div
          className={cn(
            "fixed z-[999] flex flex-col overflow-hidden",
            "bg-card border border-border shadow-[0_8px_32px_rgba(0,0,0,0.16)]",
            // Mobile: full-width bottom sheet
            "bottom-0 left-0 right-0 w-full h-[80dvh]",
            "rounded-t-xl rounded-b-none",
            // Desktop: floating card
            "md:bottom-[88px] md:left-auto md:right-6 md:w-[360px] md:h-[520px]",
            "md:rounded-xl"
          )}
          role="dialog"
          aria-label="챗봇 상담"
          aria-modal="false"
        >
          {/* Header */}
          <div className="flex items-center gap-[10px] h-[52px] px-[14px] pr-[10px] bg-card border-b border-border shrink-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-primary/10 border border-primary/30 text-primary"
              aria-hidden="true"
            >
              {status === "AI" ? (
                <Bot size={16} />
              ) : status === "AGENT" || status === "WAITING_AGENT" ? (
                <Headphones size={16} />
              ) : (
                <MessageCircleQuestionMark size={16} />
              )}
            </div>
            <div className="flex items-center flex-1 gap-1.5 min-w-0">
              <span className="text-[13px] font-bold text-foreground">
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
            <div className="flex items-center shrink-0 gap-0.5">
              {showEndBtn ? (
                <button
                  className={cn(
                    "inline-flex items-center gap-1 h-[26px] px-2 rounded-sm text-[11px] font-medium",
                    "border border-destructive/20 text-destructive bg-transparent",
                    "hover:bg-destructive/5 hover:border-destructive/30 transition-colors"
                  )}
                  onClick={handleClose}
                  type="button"
                  aria-label="처음으로"
                >
                  처음으로
                </button>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex flex-1 flex-col gap-[10px] min-h-0 overflow-y-auto p-3"
            ref={messagesRef}
            role="log"
            aria-live="polite"
            onScroll={handleMessagesScroll}
          >
            {messages.map((msg) => {
              if (msg.role === "system") {
                return (
                  <div key={msg.id} className="flex justify-center py-0.5 w-full">
                    <span className="bg-muted border border-border rounded-full text-muted-foreground text-[10px] font-medium max-w-[90%] px-[10px] py-[3px] text-center whitespace-pre-line">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end w-full">
                    <div className="flex flex-col items-end gap-[3px] max-w-[82%]">
                      <div className="animate-chatbot-message-in rounded-[16px_16px_4px_16px] bg-primary px-3 py-[9px]">
                        {msg.content.split("\n").map((line, i) => (
                          <p key={i} className="text-[13px] leading-relaxed text-primary-foreground m-0">
                            {line}
                          </p>
                        ))}
                      </div>
                      <time className="text-[10px] text-muted-foreground px-0.5 text-right">
                        {formatTime(msg.timestamp)}
                      </time>
                    </div>
                  </div>
                );
              }

              if (msg.role === "bot") {
                const isActive = msg.id === activeChoicesMsgId;
                return (
                  <div key={msg.id} className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-start gap-2 w-full">
                      <div className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-muted-foreground text-white shrink-0 mt-0.5" aria-hidden="true">
                        <MessageCircleQuestionMark size={12} />
                      </div>
                      <div className="flex flex-col gap-[3px] max-w-[82%] min-w-0">
                        <div className="animate-chatbot-message-in rounded-[4px_16px_16px_16px] bg-muted border border-border px-3 py-[9px]">
                          {msg.content.split("\n").map((line, i) => (
                            <p key={i} className="text-[13px] leading-relaxed text-foreground m-0">
                              {line || "\u00A0"}
                            </p>
                          ))}
                        </div>
                        <time className="text-[10px] text-muted-foreground px-0.5">
                          {formatTime(msg.timestamp)}
                        </time>
                      </div>
                    </div>
                    {isActive && currentStepId && !botTyping ? (
                      <div className="flex justify-end w-full">
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

              if (msg.role === "ai") {
                return (
                  <div key={msg.id} className="flex items-start gap-2 w-full">
                    <div className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-blue-500 text-white shrink-0 mt-0.5" aria-hidden="true">
                      <Bot size={12} />
                    </div>
                    <div className="flex flex-col gap-[3px] max-w-[82%] min-w-0">
                      <div className="animate-chatbot-message-in rounded-[4px_16px_16px_16px] bg-muted border border-border px-3 py-[9px]">
                        {msg.content.split("\n").map((line, i) => (
                          <p key={i} className="text-[13px] leading-relaxed text-foreground m-0">
                            {line || "\u00A0"}
                          </p>
                        ))}
                      </div>
                      <time className="text-[10px] text-muted-foreground px-0.5">
                        {formatTime(msg.timestamp)}
                      </time>
                    </div>
                  </div>
                );
              }

              if (msg.role === "agent") {
                return (
                  <div key={msg.id} className="flex items-start gap-2 w-full">
                    <div className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-success text-success-foreground shrink-0 mt-0.5" aria-hidden="true">
                      <Headphones size={12} />
                    </div>
                    <div className="flex flex-col gap-[3px] max-w-[82%] min-w-0">
                      <div className="animate-chatbot-message-in rounded-[4px_16px_16px_16px] bg-success/10 border border-success/20 px-3 py-[9px]">
                        {msg.content.split("\n").map((line, i) => (
                          <p key={i} className="text-[13px] leading-relaxed text-foreground m-0">
                            {line}
                          </p>
                        ))}
                      </div>
                      <time className="text-[10px] text-muted-foreground px-0.5">
                        {formatTime(msg.timestamp)}
                      </time>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Typing indicator */}
            {sending && (status === "AI" || status === "AGENT") ? (
              <div className="flex items-start gap-2 w-full">
                <div
                  className={cn(
                    "flex items-center justify-center w-[26px] h-[26px] rounded-full text-white shrink-0 mt-0.5",
                    status === "AGENT" ? "bg-success" : "bg-blue-500"
                  )}
                  aria-hidden="true"
                >
                  {status === "AGENT" ? <Headphones size={12} /> : <Bot size={12} />}
                </div>
                <TypingIndicator />
              </div>
            ) : null}

            {botTyping && status === "BOT" ? (
              <div className="flex items-start gap-2 w-full animate-chatbot-message-in">
                <div className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-muted-foreground text-white shrink-0 mt-0.5" aria-hidden="true">
                  <MessageCircleQuestionMark size={12} />
                </div>
                <TypingIndicator ariaLabel="챗봇 답변 작성 중" />
              </div>
            ) : null}
          </div>

          {/* Free-text input area */}
          {canType ? (
            <div className="flex items-end gap-2 bg-card border-t border-border shrink-0 px-[10px] py-2">
              <textarea
                ref={textareaRef}
                className={cn(
                  "flex-1 bg-muted border border-border rounded-md text-foreground",
                  "text-[13px] leading-relaxed px-[10px] py-[7px] outline-none resize-none",
                  "placeholder:text-muted-foreground transition-colors",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20"
                )}
                disabled={sending}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                rows={2}
                value={input}
              />
              <button
                aria-label="보내기"
                className={cn(
                  "flex items-center justify-center w-[34px] h-[34px] rounded-md shrink-0",
                  "bg-primary text-primary-foreground border-none",
                  "hover:bg-primary/90 disabled:opacity-40 transition-colors"
                )}
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
            <div className="flex items-center justify-center gap-[7px] bg-warning/10 border-t border-warning/30 text-warning text-xs font-medium shrink-0 px-3 py-[9px]">
              <div className="flex items-center gap-[7px] justify-center">
                <Loader size={13} aria-hidden="true" className="animate-spin" />
                <span>상담원 연결 대기 중...</span>
                <span className="text-muted-foreground text-xs font-semibold">{waitingElapsedLabel}</span>
                <button
                  className="bg-transparent border-none text-warning text-xs font-bold h-auto p-[0_2px] underline underline-offset-2 cursor-pointer disabled:cursor-default disabled:opacity-55"
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
            <div className="flex flex-col items-center gap-2 bg-card border-t border-border shrink-0 px-4 py-3 text-center">
              <p className="text-muted-foreground text-xs m-0">상담이 종료되었습니다.</p>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 h-[30px] px-3 rounded-sm",
                  "bg-muted border border-border text-foreground text-xs font-semibold",
                  "hover:bg-muted/80 hover:border-border/80 transition-colors"
                )}
                onClick={handleStartNewSession}
                type="button"
              >
                <RefreshCcw size={12} aria-hidden="true" />
                새 문의 시작
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* FAB label */}
      {!isOpen || isMinimized ? (
        <span
          className={cn(
            "fixed z-[1000] pointer-events-none",
            "bg-card border border-border rounded-full",
            "text-muted-foreground text-xs font-semibold leading-none px-[10px] py-2",
            "shadow-[0_4px_14px_rgba(17,19,24,0.12)]",
            "bottom-[76px] right-4 md:bottom-[84px] md:right-6"
          )}
          aria-hidden="true"
        >
          챗봇 문의
        </span>
      ) : null}

      {/* FAB button */}
      <button
        aria-label={isOpen && !isMinimized ? "챗봇 최소화" : "챗봇 상담 열기"}
        className={cn(
          "fixed z-[1000] flex items-center justify-center w-[52px] h-[52px] rounded-full border-none",
          "shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all",
          "bottom-4 right-4 md:bottom-6 md:right-6",
          isOpen && !isMinimized
            ? "bg-card text-foreground hover:bg-muted hidden md:flex"
            : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)] hover:-translate-y-px"
        )}
        onClick={() => (isOpen && !isMinimized ? minimize() : open())}
        type="button"
      >
        <MessageCircleQuestionMark size={22} aria-hidden="true" />
        {unreadCount > 0 && (!isOpen || isMinimized) ? (
          <span
            className="absolute -top-[3px] -right-[3px] flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive border-2 border-primary text-white text-[10px] font-bold px-[3px]"
            aria-label={`읽지 않은 메시지 ${unreadCount}개`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
    </>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator({ ariaLabel }: { ariaLabel?: string }) {
  return (
    <div
      className="flex items-center gap-1 bg-card border border-border rounded-md h-[34px] px-3"
      aria-label={ariaLabel}
    >
      {[0, 150, 300].map((delay, i) => (
        <span
          key={i}
          className="block w-[5px] h-[5px] rounded-full bg-muted-foreground opacity-50 animate-chatbot-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
