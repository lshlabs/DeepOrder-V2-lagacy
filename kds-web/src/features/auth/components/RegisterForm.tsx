import { Eye, EyeOff } from "lucide-react";
import type { FormEventHandler } from "react";

import type { RegisterRequest } from "../types";

export type IdentifierHint = { type: "success" | "error"; message: string };

export type RegisterFormProps = {
  addressHint: string | null;
  checkingIdentifier: boolean;
  form: RegisterRequest;
  identifierHint: IdentifierHint | null;
  showPassword: boolean;
  submitting: boolean;
  onAddressSearch: () => void;
  onCheckIdentifier: () => void;
  onFieldChange: (field: keyof RegisterRequest, value: string) => void;
  onLoginIdChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onTogglePassword: () => void;
};

export function RegisterForm({
  addressHint,
  checkingIdentifier,
  form,
  identifierHint,
  showPassword,
  submitting,
  onAddressSearch,
  onCheckIdentifier,
  onFieldChange,
  onLoginIdChange,
  onSubmit,
  onTogglePassword,
}: RegisterFormProps) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="reg-name">이름</label>
        <input
          id="reg-name"
          name="name"
          onChange={(event) => onFieldChange("name", event.target.value)}
          required
          placeholder="이름"
          value={form.name}
        />
      </div>

      <div className="field">
        <label htmlFor="reg-login-id">아이디</label>
        <div className="field-inline">
          <input
            id="reg-login-id"
            autoComplete="username"
            name="loginId"
            onChange={(event) => onLoginIdChange(event.target.value)}
            required
            type="text"
            placeholder="아이디"
            value={form.loginId}
          />
          <button className="btn-outline" onClick={onCheckIdentifier} type="button" disabled={checkingIdentifier}>
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
            onChange={(event) => onFieldChange("password", event.target.value)}
            placeholder="영문+숫자 8자 이상"
            required
            type={showPassword ? "text" : "password"}
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

      <div className="field-row">
        <div className="field">
          <label htmlFor="reg-store-name">매장명</label>
          <input
            id="reg-store-name"
            name="storeName"
            onChange={(event) => onFieldChange("storeName", event.target.value)}
            placeholder="매장명"
            required
            value={form.storeName}
          />
        </div>
        <div className="field">
          <label htmlFor="reg-phone">연락처</label>
          <input
            id="reg-phone"
            name="storePhone"
            onChange={(event) => onFieldChange("storePhone", event.target.value)}
            placeholder="01012345678"
            required
            value={form.storePhone}
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
            value={form.roadAddress}
            onChange={(event) => onFieldChange("roadAddress", event.target.value)}
          />
          <button className="btn-outline" onClick={onAddressSearch} type="button">
            주소 검색
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="reg-address-detail">상세주소</label>
        <input
          id="reg-address-detail"
          name="addressDetail"
          onChange={(event) => onFieldChange("addressDetail", event.target.value)}
          value={form.addressDetail}
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
  );
}
