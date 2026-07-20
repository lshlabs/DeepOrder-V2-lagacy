import { useCallback, useEffect, useRef, useState } from "react";

export type ToastState = {
  message: string;
  type: "error" | "info";
};

export type ShowToast = (message: string, type?: ToastState["type"]) => void;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  function hideToast() {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }

  const showToast = useCallback<ShowToast>((message, type = "error") => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return {
    hideToast,
    showToast,
    toast,
  };
}
