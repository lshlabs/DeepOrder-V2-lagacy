import { useAuthSession } from "@/features/auth";
import { AuthPage } from "@/pages/auth/AuthPage";
import { KdsPage } from "@/pages/kds/KdsPage";

export default function App() {
  const {
    state,
    registeredPending,
    handleLoginSuccess,
    handleRegisterSuccess,
    handleLogout,
    handleBackFromPending,
    reauthorize,
  } = useAuthSession();

  if (state.status === "booting") {
    return (
      <main className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col gap-6 w-full max-w-sm border border-border rounded-xl bg-card p-6 md:p-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Auth Session
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">세션 확인 중</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            저장된 토큰을 확인하고 매장 계정 상태를 복원하고 있습니다.
          </p>
        </div>
      </main>
    );
  }

  if (registeredPending) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        pendingInfo={{ user: registeredPending.user, store: registeredPending.store }}
        onBackFromPending={handleBackFromPending}
      />
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <>
        {state.error ? (
          <div
            className="fixed top-4 left-4 z-20 max-w-sm rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}
        <AuthPage onLoginSuccess={handleLoginSuccess} onRegisterSuccess={handleRegisterSuccess} />
      </>
    );
  }

  if (state.status === "pending") {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        pendingInfo={{ user: state.session.user, store: state.session.store }}
        onBackFromPending={handleBackFromPending}
      />
    );
  }

  // status === "authenticated"
  return (
    <KdsPage
      onLogout={handleLogout}
      onUnauthorized={reauthorize}
      session={state.session}
    />
  );
}
