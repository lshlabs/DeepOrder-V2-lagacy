import { Info, X } from "lucide-react";

type KdsToastProps = {
  toast: { message: string; type: "error" | "info" } | null;
  onClose: () => void;
};

export function KdsToast({ toast, onClose }: KdsToastProps) {
  if (!toast) return null;

  return (
    <div
      className={`kds-toast${toast.type === "error" ? " error" : ""}`}
      role="alert"
      aria-live="assertive"
    >
      <Info size={13} aria-hidden="true" />
      <span>{toast.message}</span>
      <button className="kds-toast-close" onClick={onClose} type="button" aria-label="닫기">
        <X size={11} aria-hidden="true" />
      </button>
    </div>
  );
}
