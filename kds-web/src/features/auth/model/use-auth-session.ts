import { useEffect, useState } from "react";

import { clearChatbotSession } from "@/features/support/hooks/useChatbotSession";
import {
  ApiError,
  apiGetCurrentUser,
  apiLogout,
  apiRefresh,
  apiCloseSupportConversation,
  apiGetCurrentSupportConversation,
} from "../api/auth-api";
import {
  clearStoredTokens,
  loadStoredTokens,
  saveAccessToken,
  saveStoredTokens,
} from "../lib/auth-storage";
import type {
  AuthResponse,
  AuthSession,
  CurrentUserResponse,
  RegisterResponse,
} from "./types";

export type AuthState =
  | { status: "booting" }
  | { status: "unauthenticated"; error: string | null }
  | { status: "pending"; session: AuthSession }
  | { status: "authenticated"; session: AuthSession };

export interface UseAuthSessionReturn {
  state: AuthState;
  registeredPending: RegisterResponse | null;
  handleLoginSuccess: (response: AuthResponse) => void;
  handleRegisterSuccess: (response: RegisterResponse) => void;
  handleLogout: () => Promise<void>;
  handleBackFromPending: () => void;
  reauthorize: (overrideRefreshToken?: string) => Promise<string | null>;
}

export function useAuthSession(): UseAuthSessionReturn {
  const [state, setState] = useState<AuthState>({ status: "booting" });
  const [registeredPending, setRegisteredPending] = useState<RegisterResponse | null>(null);
  // Store session ref for use inside async callbacks without causing dep-loop
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    const tokens = loadStoredTokens();
    if (!tokens.accessToken) {
      setState({ status: "unauthenticated", error: null });
      return;
    }

    try {
      const current = await apiGetCurrentUser(tokens.accessToken);
      const s = buildSession(current, tokens.accessToken, tokens.refreshToken ?? "", tokens.storage === "local");
      setSession(s);
      applySessionState(s);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && tokens.refreshToken) {
        const next = await reauthorize(tokens.refreshToken);
        if (next) return;
      }
      clearStoredTokens();
      setSession(null);
      setState({
        status: "unauthenticated",
        error: error instanceof Error ? error.message : "세션을 복원하지 못했습니다.",
      });
    }
  }

  async function reauthorize(overrideRefreshToken?: string): Promise<string | null> {
    const refreshToken = overrideRefreshToken ?? loadStoredTokens().refreshToken;
    if (!refreshToken) {
      clearStoredTokens();
      setSession(null);
      setRegisteredPending(null);
      setState({ status: "unauthenticated", error: null });
      return null;
    }

    try {
      const refreshed = await apiRefresh(refreshToken);
      const persistent = session?.autoLogin ?? loadStoredTokens().storage === "local";
      saveAccessToken(refreshed.accessToken, persistent ? "local" : "session");
      const current = await apiGetCurrentUser(refreshed.accessToken);
      const s = buildSession(current, refreshed.accessToken, refreshToken, persistent);
      setSession(s);
      applySessionState(s);
      return refreshed.accessToken;
    } catch {
      clearStoredTokens();
      setSession(null);
      setRegisteredPending(null);
      setState({ status: "unauthenticated", error: null });
      return null;
    }
  }

  function applySessionState(s: AuthSession) {
    if (s.user.approvalStatus !== "APPROVED") {
      setState({ status: "pending", session: s });
    } else {
      setState({ status: "authenticated", session: s });
    }
  }

  function handleLoginSuccess(response: AuthResponse) {
    saveStoredTokens(response.accessToken, response.refreshToken, response.autoLogin);
    const s: AuthSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      autoLogin: response.autoLogin,
      user: response.user,
      store: response.store,
    };
    setSession(s);
    setRegisteredPending(null);
    applySessionState(s);
  }

  function handleRegisterSuccess(response: RegisterResponse) {
    clearStoredTokens();
    setSession(null);
    setRegisteredPending(response);
    setState({ status: "unauthenticated", error: null });
  }

  async function handleLogout() {
    const tokens = loadStoredTokens();
    const accessToken = session?.accessToken ?? tokens.accessToken;
    const refreshToken = session?.refreshToken ?? tokens.refreshToken;
    try {
      if (accessToken) await closeSupportBestEffort(accessToken);
      if (refreshToken) await apiLogout(refreshToken);
    } catch {
      // best-effort
    } finally {
      clearStoredTokens();
      clearChatbotSession();
      setSession(null);
      setRegisteredPending(null);
      setState({ status: "unauthenticated", error: null });
    }
  }

  function handleBackFromPending() {
    clearStoredTokens();
    setSession(null);
    setRegisteredPending(null);
    setState({ status: "unauthenticated", error: null });
  }

  return {
    state,
    registeredPending,
    handleLoginSuccess,
    handleRegisterSuccess,
    handleLogout,
    handleBackFromPending,
    reauthorize,
  };
}

async function closeSupportBestEffort(accessToken: string) {
  try {
    const current = await apiGetCurrentSupportConversation(accessToken);
    if (current) await apiCloseSupportConversation(accessToken, current.id);
  } catch {
    // best-effort
  }
}

function buildSession(
  current: CurrentUserResponse,
  accessToken: string,
  refreshToken: string,
  autoLogin: boolean,
): AuthSession {
  return { accessToken, refreshToken, autoLogin, user: current.user, store: current.store };
}
