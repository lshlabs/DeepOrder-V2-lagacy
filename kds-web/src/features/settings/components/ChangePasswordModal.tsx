import { useEffect, useState } from "react";

import { X } from "lucide-react";

import { apiChangePassword } from "@/lib/api";
import { requestWithReauth } from "@/shared/lib/requestWithReauth";
import type { ShowToast } from "@/lib/notify";

type ChangePasswordModalProps = {
  accessToken: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onUnauthorized: () => Promise<string | null>;
  showToast: ShowToast;
};

export function ChangePasswordModal({
  accessToken,
  open,
  onClose,
  onLogout,
  onUnauthorized,
  showToast,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (trimmedNew.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await requestWithReauth(accessToken, onUnauthorized, (nextAccessToken) =>
        apiChangePassword(nextAccessToken, {
          currentPassword: trimmedCurrent,
          newPassword: trimmedNew,
        }),
      );
      onClose();
      showToast(result.message, "info");
      await onLogout();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="kds-modal-backdrop" onClick={onClose}>
      <div
        className="kds-modal kds-modal--sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="비밀번호 변경"
      >
        <div className="kds-modal-head">
          <h2 className="kds-modal-title">비밀번호 변경</h2>
          <button className="kds-modal-close" onClick={onClose} type="button" aria-label="닫기">
            <X size={13} aria-hidden="true" />
          </button>
        </div>
        <div className="kds-modal-body">
          <div className="kds-settings-field">
            <label className="kds-settings-label" htmlFor="pw-current">현재 비밀번호</label>
            <input
              id="pw-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호"
              autoComplete="current-password"
            />
          </div>
          <div className="kds-settings-field">
            <label className="kds-settings-label" htmlFor="pw-new">새 비밀번호</label>
            <input
              id="pw-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8자 이상"
              autoComplete="new-password"
            />
          </div>
          <div className="kds-settings-field">
            <label className="kds-settings-label" htmlFor="pw-confirm">새 비밀번호 확인</label>
            <input
              id="pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
            />
          </div>
          {error ? <p className="kds-settings-error">{error}</p> : null}
          <p className="kds-settings-hint">변경 성공 시 현재 세션이 로그아웃됩니다.</p>
        </div>
        <div className="kds-modal-foot">
          <button className="kds-modal-btn secondary" onClick={onClose} type="button">취소</button>
          <button className="kds-modal-btn primary" disabled={submitting} onClick={() => void handleSubmit()} type="button">
            {submitting ? "변경중…" : "변경"}
          </button>
        </div>
      </div>
    </div>
  );
}
