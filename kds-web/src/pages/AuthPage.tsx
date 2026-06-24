import { useEffect, useRef, useState } from "react";
import { ChefHat, Eye, EyeOff } from "lucide-react";

import { API_ORIGIN, ApiError, apiCheckIdentifier, apiLogin, apiRegister } from "../lib/api";
import type {
  AuthResponse,
  AuthStore,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from "../types";

type AuthPageProps = {
  onLoginSuccess: (response: AuthResponse) => void;
  onRegisterSuccess: (response: RegisterResponse) => void;
  pendingInfo?: { user: AuthUser; store: AuthStore } | null;
  onBackFromPending?: () => void;
};

const REMEMBERED_LOGIN_ID_KEY = "deeporder.kds.rememberedLoginId";
const AUTO_LOGIN_KEY = "deeporder.kds.autoLogin";
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{3,31}$/;

const defaultLoginForm: LoginRequest = {
  loginId: "",
  password: "",
  autoLogin: false,
};

const defaultRegisterForm: RegisterRequest = {
  name: "",
  loginId: "",
  password: "",
  storeName: "",
  storePhone: "",
  zipNo: "",
  roadAddress: "",
  jibunAddress: "",
  addressDetail: "",
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
  const [identifierHint, setIdentifierHint] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-hero-top">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <ChefHat size={16} aria-hidden="true" />
            </div>
            <span className="auth-brand-name">DeepOrder KDS</span>
          </div>

          <div className="auth-hero-headline">
            <h1>
              주방을 더
              <br />
              스마트하게
            </h1>
            <p>실시간 주문 접수부터 AI 분석까지. 매장 운영에 꼭 필요한 것만 담았습니다.</p>
          </div>
        </div>

        <p className="auth-hero-footer">© 2025 DeepOrder. All rights reserved.</p>
      </section>

      <section className="auth-card">
        <div className="auth-form-wrap">
          {showPendingView ? (
            <div className="auth-view auth-view--visible" aria-hidden={false}>
              <div className="pending-head">
                <span className="status-badge">승인 대기</span>
                <h2>가입 신청 완료</h2>
                <p>관리자 검토 후 승인되면 로그인할 수 있습니다.</p>
              </div>

              <div className="pending-summary">
                <div className="pending-row">
                  <span>매장명</span>
                  <strong>{pendingStore?.storeName ?? "-"}</strong>
                </div>
                <div className="pending-row">
                  <span>이름</span>
                  <strong>{pendingUser?.name ?? "-"}</strong>
                </div>
              </div>

              <button className="btn-outline auth-submit" onClick={handleBack} type="button">
                이전으로
              </button>
            </div>
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
                <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
                  <div className="field">
                    <label htmlFor="login-id">아이디</label>
                    <input
                      id="login-id"
                      ref={loginIdRef}
                      autoComplete="username"
                      name="loginId"
                      onChange={(event) => setLoginForm((current) => ({ ...current, loginId: event.target.value }))}
                      required
                      type="text"
                      placeholder="아이디"
                      value={loginForm.loginId}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="login-password">비밀번호 / PIN</label>
                    <div className="field-password">
                      <input
                        id="login-password"
                        autoComplete="current-password"
                        minLength={4}
                        name="password"
                        onChange={(event) =>
                          setLoginForm((current) => ({ ...current, password: event.target.value }))
                        }
                        required
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호 / PIN"
                        value={loginForm.password}
                      />
                      <button
                        className="field-password-toggle"
                        type="button"
                        aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  <div className="login-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberLoginId}
                        onChange={(event) => setRememberLoginId(event.target.checked)}
                      />
                      아이디 저장
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={autoLogin}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setAutoLogin(checked);
                          setLoginForm((current) => ({ ...current, autoLogin: checked }));
                        }}
                      />
                      자동 로그인
                    </label>
                  </div>

                  <button className="auth-submit" disabled={submitting} type="submit">
                    {submitting ? "로그인 중…" : "로그인"}
                  </button>
                </form>
              </div>

                <div
                  className={`auth-tab-panel${tab === "register" ? " auth-tab-panel--visible" : ""}`}
                  aria-hidden={tab !== "register"}
                >
                <form className="auth-form" onSubmit={handleRegisterSubmit} noValidate>
                  <div className="field">
                    <label htmlFor="reg-name">이름</label>
                    <input
                      id="reg-name"
                      name="name"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                      required
                      placeholder="이름"
                      value={registerForm.name}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="reg-login-id">아이디</label>
                    <div className="field-inline">
                      <input
                        id="reg-login-id"
                        autoComplete="username"
                        name="loginId"
                        onChange={(event) => {
                          const value = event.target.value;
                          setRegisterForm((current) => ({ ...current, loginId: value }));
                          setIdentifierCheckedValue((current) =>
                            current === value.trim().toLowerCase() ? current : null,
                          );
                          setIdentifierHint(null);
                        }}
                        required
                        type="text"
                        placeholder="아이디"
                        value={registerForm.loginId}
                      />
                      <button className="btn-outline" onClick={() => void handleCheckIdentifier()} type="button" disabled={checkingIdentifier}>
                        {checkingIdentifier ? "확인 중…" : "중복확인"}
                      </button>
                    </div>
                  </div>

                  {identifierHint ? (
                    <div className={identifierHint.type === "error" ? "banner error" : "banner"} role="status">
                      {identifierHint.message}
                    </div>
                  ) : null}

                  <div className="field">
                    <label htmlFor="reg-password">비밀번호</label>
                    <div className="field-password">
                      <input
                        id="reg-password"
                        autoComplete="new-password"
                        minLength={8}
                        pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                        name="password"
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, password: event.target.value }))
                        }
                        placeholder="영문+숫자 8자 이상"
                        required
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerForm.password}
                      />
                      <button
                        className="field-password-toggle"
                        type="button"
                        aria-label={showRegisterPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        title={showRegisterPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        onClick={() => setShowRegisterPassword((current) => !current)}
                      >
                        {showRegisterPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="reg-store-name">매장명</label>
                      <input
                        id="reg-store-name"
                        name="storeName"
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, storeName: event.target.value }))
                        }
                        placeholder="매장명"
                        required
                        value={registerForm.storeName}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="reg-phone">연락처</label>
                      <input
                        id="reg-phone"
                        name="storePhone"
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, storePhone: event.target.value }))
                        }
                        placeholder="01012345678"
                        required
                        value={registerForm.storePhone}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="reg-store-address">매장주소</label>
                    <div className="field-inline">
                      <input
                        id="reg-store-address"
                        name="roadAddress"
                        readOnly
                        value={registerForm.roadAddress}
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, roadAddress: event.target.value }))
                        }
                      />
                      <button className="btn-outline" onClick={handleAddressSearch} type="button">
                        주소 검색
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="reg-address-detail">상세주소</label>
                    <input
                      id="reg-address-detail"
                      name="addressDetail"
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, addressDetail: event.target.value }))
                      }
                      value={registerForm.addressDetail}
                    />
                  </div>

                  {addressHint ? (
                    <div className="banner" role="status">
                      {addressHint}
                    </div>
                  ) : null}

                  <button className="auth-submit" disabled={submitting} type="submit">
                    {submitting ? "신청 중…" : "가입 신청"}
                  </button>
                </form>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
