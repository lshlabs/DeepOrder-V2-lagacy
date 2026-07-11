import { useRef, useState } from "react";

import { AuthShell } from "@/features/auth/ui/AuthShell";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { SignupForm } from "@/features/auth/ui/SignupForm";
import { ApprovalPendingView } from "@/features/auth/ui/ApprovalPendingView";
import type { AuthResponse, AuthStore, AuthUser, RegisterResponse } from "@/types";

type AuthPageProps = {
  onLoginSuccess: (response: AuthResponse) => void;
  onRegisterSuccess: (response: RegisterResponse) => void;
  pendingInfo?: { user: AuthUser; store: AuthStore } | null;
  onBackFromPending?: () => void;
};

export function AuthPage({
  onLoginSuccess,
  onRegisterSuccess,
  pendingInfo,
  onBackFromPending,
}: AuthPageProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const loginIdRef = useRef<HTMLInputElement>(null);

  function handleBack() {
    onBackFromPending?.();
    window.setTimeout(() => loginIdRef.current?.focus(), 0);
  }

  if (pendingInfo) {
    return (
      <AuthShell>
        <ApprovalPendingView
          user={pendingInfo.user}
          store={pendingInfo.store}
          onBack={handleBack}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {/* Tab switcher */}
      <div
        className="flex gap-0.5 p-0.5 bg-muted rounded-lg border border-border"
        role="tablist"
        aria-label="인증 화면 선택"
      >
        <button
          aria-selected={tab === "login"}
          className={`flex-1 h-8 text-[13px] font-medium rounded-md transition-colors ${
            tab === "login"
              ? "bg-background border border-border text-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("login")}
          role="tab"
          type="button"
        >
          로그인
        </button>
        <button
          aria-selected={tab === "register"}
          className={`flex-1 h-8 text-[13px] font-medium rounded-md transition-colors ${
            tab === "register"
              ? "bg-background border border-border text-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("register")}
          role="tab"
          type="button"
        >
          매장 가입
        </button>
      </div>

      {tab === "login" ? (
        <LoginForm loginIdRef={loginIdRef} onSuccess={onLoginSuccess} />
      ) : (
        <SignupForm onSuccess={onRegisterSuccess} />
      )}
    </AuthShell>
  );
}
