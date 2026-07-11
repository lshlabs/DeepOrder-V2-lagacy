import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { apiLogin } from "../api/auth-api";
import type { AuthResponse, LoginRequest } from "../model/types";

const REMEMBERED_LOGIN_ID_KEY = "deeporder.kds.rememberedLoginId";
const AUTO_LOGIN_KEY = "deeporder.kds.autoLogin";

const defaultForm: LoginRequest = { loginId: "", password: "", autoLogin: false };

interface LoginFormProps {
  loginIdRef?: React.RefObject<HTMLInputElement | null>;
  onSuccess: (response: AuthResponse) => void;
}

export function LoginForm({ loginIdRef, onSuccess }: LoginFormProps) {
  const [form, setForm] = useState(() => {
    const rememberedLoginId = window.localStorage.getItem(REMEMBERED_LOGIN_ID_KEY) ?? "";
    const autoLogin = window.localStorage.getItem(AUTO_LOGIN_KEY) === "true";
    return { ...defaultForm, loginId: rememberedLoginId, autoLogin };
  });
  const [rememberLoginId, setRememberLoginId] = useState(
    () => Boolean(window.localStorage.getItem(REMEMBERED_LOGIN_ID_KEY))
  );
  const [autoLogin, setAutoLogin] = useState(() => window.localStorage.getItem(AUTO_LOGIN_KEY) === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiLogin({
        loginId: form.loginId.trim().toLowerCase(),
        password: form.password,
        autoLogin,
      });

      if (rememberLoginId) {
        window.localStorage.setItem(REMEMBERED_LOGIN_ID_KEY, form.loginId.trim().toLowerCase());
      } else {
        window.localStorage.removeItem(REMEMBERED_LOGIN_ID_KEY);
      }

      window.localStorage[autoLogin ? "setItem" : "removeItem"](AUTO_LOGIN_KEY, "true");
      onSuccess(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      {error ? (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-id">아이디</Label>
        <Input
          id="login-id"
          ref={loginIdRef}
          autoComplete="username"
          name="loginId"
          placeholder="아이디"
          required
          type="text"
          value={form.loginId}
          onChange={(e) => setForm((c) => ({ ...c, loginId: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">비밀번호 / PIN</Label>
        <div className="relative">
          <Input
            id="login-password"
            autoComplete="current-password"
            className="pr-10"
            minLength={4}
            name="password"
            placeholder="비밀번호 / PIN"
            required
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
          />
          <button
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            type="button"
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mt-[-2px]">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            checked={rememberLoginId}
            className="accent-primary"
            type="checkbox"
            onChange={(e) => setRememberLoginId(e.target.checked)}
          />
          아이디 저장
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            checked={autoLogin}
            className="accent-primary"
            type="checkbox"
            onChange={(e) => {
              const checked = e.target.checked;
              setAutoLogin(checked);
              setForm((c) => ({ ...c, autoLogin: checked }));
            }}
          />
          자동 로그인
        </label>
      </div>

      <Button className="w-full mt-1" disabled={submitting} type="submit">
        {submitting ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
