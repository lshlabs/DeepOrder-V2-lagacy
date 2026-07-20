import { Eye, EyeOff } from "lucide-react";
import type { FormEventHandler, RefObject } from "react";

import type { LoginRequest } from "../types";

export type LoginFormProps = {
  autoLogin: boolean;
  form: LoginRequest;
  loginIdRef: RefObject<HTMLInputElement | null>;
  rememberLoginId: boolean;
  showPassword: boolean;
  submitting: boolean;
  onAutoLoginChange: (checked: boolean) => void;
  onLoginIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberLoginIdChange: (checked: boolean) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onTogglePassword: () => void;
};

export function LoginForm({
  autoLogin,
  form,
  loginIdRef,
  rememberLoginId,
  showPassword,
  submitting,
  onAutoLoginChange,
  onLoginIdChange,
  onPasswordChange,
  onRememberLoginIdChange,
  onSubmit,
  onTogglePassword,
}: LoginFormProps) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="login-id">아이디</label>
        <input
          id="login-id"
          ref={loginIdRef}
          autoComplete="username"
          name="loginId"
          onChange={(event) => onLoginIdChange(event.target.value)}
          required
          type="text"
          placeholder="아이디"
          value={form.loginId}
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
            onChange={(event) => onPasswordChange(event.target.value)}
            required
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호 / PIN"
            value={form.password}
          />
          <button
            className="field-password-toggle"
            type="button"
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            onClick={onTogglePassword}
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
            onChange={(event) => onRememberLoginIdChange(event.target.checked)}
          />
          아이디 저장
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(event) => onAutoLoginChange(event.target.checked)}
          />
          자동 로그인
        </label>
      </div>

      <button className="auth-submit" disabled={submitting} type="submit">
        {submitting ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
