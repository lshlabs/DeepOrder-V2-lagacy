import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, API_ORIGIN } from "@/lib/api";
import { apiCheckIdentifier, apiRegister } from "../api/auth-api";
import type { RegisterRequest, RegisterResponse } from "../model/types";

const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{3,31}$/;

const defaultForm: RegisterRequest = {
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

interface SignupFormProps {
  onSuccess: (response: RegisterResponse) => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [form, setForm] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [identifierHint, setIdentifierHint] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [identifierCheckedValue, setIdentifierCheckedValue] = useState<string | null>(null);
  const [checkingIdentifier, setCheckingIdentifier] = useState(false);

  // Listen for address popup postMessage
  useState(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== API_ORIGIN) return;
      const data = event.data as { type?: string; payload?: Partial<RegisterRequest> };
      if (data?.type !== "deeporder.juso.selected" || !data.payload) return;
      const p = data.payload;
      setForm((c) => ({
        ...c,
        zipNo: p.zipNo ?? c.zipNo,
        roadAddress: p.roadAddress ?? c.roadAddress,
        jibunAddress: p.jibunAddress ?? c.jibunAddress,
        addressDetail: p.addressDetail ?? c.addressDetail,
      }));
      setAddressHint(null);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  });

  async function handleCheckIdentifier() {
    const id = form.loginId.trim().toLowerCase();
    setError(null);
    if (!IDENTIFIER_PATTERN.test(id)) {
      setIdentifierCheckedValue(null);
      setIdentifierHint({
        type: "error",
        message: "아이디는 영문 소문자, 숫자, ., _, - 만 사용해 4~32자로 입력해주세요.",
      });
      return;
    }
    setCheckingIdentifier(true);
    try {
      const result = await apiCheckIdentifier(id);
      setIdentifierCheckedValue(result.available ? id : null);
      setIdentifierHint({ type: result.available ? "success" : "error", message: result.message });
    } catch (err) {
      setIdentifierCheckedValue(null);
      setIdentifierHint({
        type: "error",
        message: err instanceof ApiError ? err.message : "아이디 중복확인에 실패했습니다.",
      });
    } finally {
      setCheckingIdentifier(false);
    }
  }

  function handleAddressSearch() {
    const url = `${API_ORIGIN}/api/address/juso-popup?origin=${encodeURIComponent(window.location.origin)}`;
    const popup = window.open(url, "deeporder-juso-popup", "width=570,height=620,noopener=no,resizable=yes,scrollbars=yes");
    if (!popup) {
      setAddressHint("팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.");
      return;
    }
    popup.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = form.loginId.trim().toLowerCase();
    if (!IDENTIFIER_PATTERN.test(id)) {
      setError("아이디는 영문 소문자, 숫자, ., _, - 만 사용해 4~32자로 입력해주세요.");
      return;
    }
    if (identifierCheckedValue !== id) {
      setError("아이디 중복확인을 완료해주세요.");
      return;
    }
    const hasLetter = /[A-Za-z]/.test(form.password);
    const hasNumber = /\d/.test(form.password);
    if (form.password.length < 8 || !hasLetter || !hasNumber) {
      setError("비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiRegister({
        name: form.name.trim(),
        loginId: id,
        password: form.password,
        storeName: form.storeName.trim(),
        storePhone: form.storePhone.trim(),
        zipNo: form.zipNo.trim(),
        roadAddress: form.roadAddress.trim(),
        jibunAddress: form.jibunAddress.trim(),
        addressDetail: form.addressDetail.trim(),
      });
      onSuccess(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = "flex flex-col gap-1.5";
  const hintClass = (type: "success" | "error") =>
    type === "error"
      ? "text-xs text-destructive"
      : "text-xs text-green-600 dark:text-green-400";

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      {error ? (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Name */}
      <div className={fieldClass}>
        <Label htmlFor="reg-name">이름</Label>
        <Input
          id="reg-name"
          name="name"
          placeholder="이름"
          required
          value={form.name}
          onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
        />
      </div>

      {/* Login ID */}
      <div className={fieldClass}>
        <Label htmlFor="reg-login-id">아이디</Label>
        <div className="flex gap-2">
          <Input
            id="reg-login-id"
            autoComplete="username"
            className="flex-1"
            name="loginId"
            placeholder="아이디"
            required
            type="text"
            value={form.loginId}
            onChange={(e) => {
              const value = e.target.value;
              setForm((c) => ({ ...c, loginId: value }));
              setIdentifierCheckedValue((c) =>
                c === value.trim().toLowerCase() ? c : null,
              );
              setIdentifierHint(null);
            }}
          />
          <Button
            disabled={checkingIdentifier}
            onClick={() => void handleCheckIdentifier()}
            size="sm"
            type="button"
            variant="outline"
          >
            {checkingIdentifier ? "확인 중…" : "중복확인"}
          </Button>
        </div>
        {identifierHint ? (
          <p className={hintClass(identifierHint.type)} role="status">
            {identifierHint.message}
          </p>
        ) : null}
      </div>

      {/* Password */}
      <div className={fieldClass}>
        <Label htmlFor="reg-password">비밀번호</Label>
        <div className="relative">
          <Input
            id="reg-password"
            autoComplete="new-password"
            className="pr-10"
            minLength={8}
            name="password"
            pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
            placeholder="영문+숫자 8자 이상"
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
            type="button"
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Store row */}
      <div className="grid grid-cols-2 gap-2">
        <div className={fieldClass}>
          <Label htmlFor="reg-store-name">매장명</Label>
          <Input
            id="reg-store-name"
            name="storeName"
            placeholder="매장명"
            required
            value={form.storeName}
            onChange={(e) => setForm((c) => ({ ...c, storeName: e.target.value }))}
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="reg-phone">연락처</Label>
          <Input
            id="reg-phone"
            name="storePhone"
            placeholder="01012345678"
            required
            value={form.storePhone}
            onChange={(e) => setForm((c) => ({ ...c, storePhone: e.target.value }))}
          />
        </div>
      </div>

      {/* Address */}
      <div className={fieldClass}>
        <Label htmlFor="reg-store-address">매장주소</Label>
        <div className="flex gap-2">
          <Input
            id="reg-store-address"
            className="flex-1"
            name="roadAddress"
            readOnly
            value={form.roadAddress}
            onChange={(e) => setForm((c) => ({ ...c, roadAddress: e.target.value }))}
          />
          <Button onClick={handleAddressSearch} size="sm" type="button" variant="outline">
            주소 검색
          </Button>
        </div>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="reg-address-detail">상세주소</Label>
        <Input
          id="reg-address-detail"
          name="addressDetail"
          value={form.addressDetail}
          onChange={(e) => setForm((c) => ({ ...c, addressDetail: e.target.value }))}
        />
      </div>

      {addressHint ? (
        <p className="text-sm text-muted-foreground" role="status">{addressHint}</p>
      ) : null}

      <Button className="w-full mt-1" disabled={submitting} type="submit">
        {submitting ? "신청 중…" : "가입 신청"}
      </Button>
    </form>
  );
}
