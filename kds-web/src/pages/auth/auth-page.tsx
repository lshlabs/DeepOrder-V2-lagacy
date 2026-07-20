import { useEffect, useRef, useState } from "react";

import {
  AUTO_LOGIN_KEY,
  AuthHero,
  IDENTIFIER_PATTERN,
  REMEMBERED_LOGIN_ID_KEY,
  apiCheckIdentifier,
  apiLogin,
  apiRegister,
  defaultLoginForm,
  defaultRegisterForm,
} from "@/features/auth";
import { API_ORIGIN, ApiError } from "@/lib/api";
import type {
  AuthResponse,
  AuthStore,
  AuthUser,
  RegisterRequest,
  RegisterResponse,
  IdentifierHint,
} from "@/features/auth";

import { ApprovalPendingPage } from "./approval-pending-page";
import { LoginPage } from "./login-page";
import { RegisterPage } from "./register-page";

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
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [identifierHint, setIdentifierHint] = useState<IdentifierHint | null>(null);
  const [identifierCheckedValue, setIdentifierCheckedValue] = useState<string | null>(null);
  const [checkingIdentifier, setCheckingIdentifier] = useState(false);
  const [rememberLoginId, setRememberLoginId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [view, setView] = useState<"form" | "pending">(pendingInfo ? "pending" : "form");
  const loginIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rememberedLoginId = window.localStorage.getItem(REMEMBERED_LOGIN_ID_KEY);
    const rememberedAutoLogin = window.localStorage.getItem(AUTO_LOGIN_KEY) === "true";
    setAutoLogin(rememberedAutoLogin);
    if (!rememberedLoginId) {
      setLoginForm((current) => ({ ...current, autoLogin: rememberedAutoLogin }));
      return;
    }

    setLoginForm((current) => ({ ...current, loginId: rememberedLoginId, autoLogin: rememberedAutoLogin }));
    setRememberLoginId(true);
  }, []);

  useEffect(() => {
    if (pendingInfo) {
      setView("pending");
      return;
    }

    setView("form");
  }, [pendingInfo]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== API_ORIGIN) return;
      const data = event.data as { type?: string; payload?: Partial<RegisterRequest> };
      if (data?.type !== "deeporder.juso.selected" || !data.payload) return;

      const payload = data.payload;
      setRegisterForm((current) => ({
        ...current,
        zipNo: payload.zipNo ?? current.zipNo,
        roadAddress: payload.roadAddress ?? current.roadAddress,
        jibunAddress: payload.jibunAddress ?? current.jibunAddress,
        addressDetail: payload.addressDetail ?? current.addressDetail,
      }));
      setAddressHint(null);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function switchTab(next: "login" | "register") {
    setTab(next);
    setErrorMessage(null);
    setAddressHint(null);
    setIdentifierHint(null);
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiLogin({
        loginId: loginForm.loginId.trim().toLowerCase(),
        password: loginForm.password,
        autoLogin,
      });

      if (rememberLoginId) {
        window.localStorage.setItem(REMEMBERED_LOGIN_ID_KEY, loginForm.loginId.trim().toLowerCase());
      } else {
        window.localStorage.removeItem(REMEMBERED_LOGIN_ID_KEY);
      }

      if (autoLogin) {
        window.localStorage.setItem(AUTO_LOGIN_KEY, "true");
      } else {
        window.localStorage.removeItem(AUTO_LOGIN_KEY);
      }

      onLoginSuccess(response);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = registerForm.loginId.trim().toLowerCase();
    if (!IDENTIFIER_PATTERN.test(identifier)) {
      setErrorMessage("아이디는 영문 소문자, 숫자, ., _, - 만 사용해 4~32자로 입력해주세요.");
      return;
    }
    if (identifierCheckedValue !== identifier) {
      setErrorMessage("아이디 중복확인을 완료해주세요.");
      return;
    }

    const hasLetter = /[A-Za-z]/.test(registerForm.password);
    const hasNumber = /\d/.test(registerForm.password);
    if (registerForm.password.length < 8 || !hasLetter || !hasNumber) {
      setErrorMessage("비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiRegister({
        name: registerForm.name.trim(),
        loginId: identifier,
        password: registerForm.password,
        storeName: registerForm.storeName.trim(),
        storePhone: registerForm.storePhone.trim(),
        zipNo: registerForm.zipNo.trim(),
        roadAddress: registerForm.roadAddress.trim(),
        jibunAddress: registerForm.jibunAddress.trim(),
        addressDetail: registerForm.addressDetail.trim(),
      });
      onRegisterSuccess(response);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckIdentifier() {
    const identifier = registerForm.loginId.trim().toLowerCase();
    setErrorMessage(null);

    if (!IDENTIFIER_PATTERN.test(identifier)) {
      setIdentifierCheckedValue(null);
      setIdentifierHint({
        type: "error",
        message: "아이디는 영문 소문자, 숫자, ., _, - 만 사용해 4~32자로 입력해주세요.",
      });
      return;
    }

    setCheckingIdentifier(true);
    try {
      const result = await apiCheckIdentifier(identifier);
      setIdentifierCheckedValue(result.available ? identifier : null);
      setIdentifierHint({ type: result.available ? "success" : "error", message: result.message });
    } catch (error) {
      setIdentifierCheckedValue(null);
      setIdentifierHint({
        type: "error",
        message: error instanceof ApiError ? error.message : "아이디 중복확인에 실패했습니다.",
      });
    } finally {
      setCheckingIdentifier(false);
    }
  }

  function handleAddressSearch() {
    const popupUrl = `${API_ORIGIN}/api/address/juso-popup?origin=${encodeURIComponent(window.location.origin)}`;
    const popup = window.open(
      popupUrl,
      "deeporder-juso-popup",
      "width=570,height=620,noopener=no,resizable=yes,scrollbars=yes",
    );

    if (!popup) {
      setAddressHint("팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.");
      return;
    }

    popup.focus();
  }

  function handleBack() {
    setView("form");
    onBackFromPending?.();
    window.setTimeout(() => loginIdRef.current?.focus(), 0);
  }

  const pendingUser = pendingInfo?.user ?? null;
  const pendingStore = pendingInfo?.store ?? null;

  const showPendingView = view === "pending" && Boolean(pendingInfo);
  const showFormView = !showPendingView;

  return (
    <main className="auth-shell">
      <AuthHero />

      <section className="auth-card">
        <div className="auth-form-wrap">
          {showPendingView ? (
            <ApprovalPendingPage
              storeName={pendingStore?.storeName ?? null}
              userName={pendingUser?.name ?? null}
              onBack={handleBack}
            />
          ) : null}

          {showFormView ? (
            <div className="auth-view auth-view--visible" aria-hidden={false}>
              <div className="auth-tabs" role="tablist" aria-label="인증 화면 선택">
              <button
                className={tab === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => switchTab("login")}
                role="tab"
                aria-selected={tab === "login"}
                type="button"
              >
                로그인
              </button>
              <button
                className={tab === "register" ? "auth-tab active" : "auth-tab"}
                onClick={() => switchTab("register")}
                role="tab"
                aria-selected={tab === "register"}
                type="button"
              >
                매장 가입
              </button>
            </div>

            {errorMessage ? (
              <div className="banner error" role="alert">
                {errorMessage}
              </div>
            ) : null}

              <div className="auth-tab-panels">
                <div
                  className={`auth-tab-panel${tab === "login" ? " auth-tab-panel--visible" : ""}`}
                  aria-hidden={tab !== "login"}
                >
                <LoginPage
                  autoLogin={autoLogin}
                  form={loginForm}
                  loginIdRef={loginIdRef}
                  rememberLoginId={rememberLoginId}
                  showPassword={showPassword}
                  submitting={submitting}
                  onAutoLoginChange={(checked) => {
                    setAutoLogin(checked);
                    setLoginForm((current) => ({ ...current, autoLogin: checked }));
                  }}
                  onLoginIdChange={(value) => setLoginForm((current) => ({ ...current, loginId: value }))}
                  onPasswordChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                  onRememberLoginIdChange={setRememberLoginId}
                  onSubmit={handleLoginSubmit}
                  onTogglePassword={() => setShowPassword((current) => !current)}
                />
              </div>

                <div
                  className={`auth-tab-panel${tab === "register" ? " auth-tab-panel--visible" : ""}`}
                  aria-hidden={tab !== "register"}
                >
                <RegisterPage
                  addressHint={addressHint}
                  checkingIdentifier={checkingIdentifier}
                  form={registerForm}
                  identifierHint={identifierHint}
                  showPassword={showRegisterPassword}
                  submitting={submitting}
                  onAddressSearch={handleAddressSearch}
                  onCheckIdentifier={() => void handleCheckIdentifier()}
                  onFieldChange={(field, value) =>
                    setRegisterForm((current) => ({ ...current, [field]: value }))
                  }
                  onLoginIdChange={(value) => {
                    setRegisterForm((current) => ({ ...current, loginId: value }));
                    setIdentifierCheckedValue((current) =>
                      current === value.trim().toLowerCase() ? current : null,
                    );
                    setIdentifierHint(null);
                  }}
                  onSubmit={handleRegisterSubmit}
                  onTogglePassword={() => setShowRegisterPassword((current) => !current)}
                />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
