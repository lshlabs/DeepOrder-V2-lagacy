/**
 * Thin adapter over sonner for app-wide notifications.
 * Import `notify` (and `ShowNotify`) instead of `useToast` / `KdsToast`.
 */
import { toast } from "sonner";

export type ShowNotify = (message: string, type?: "error" | "info") => void;

export const notify: ShowNotify = (message, type = "error") => {
  if (type === "error") {
    toast.error(message);
  } else {
    toast(message);
  }
};

/**
 * Kept for backward-compat while feature hooks still receive `showToast` as a prop.
 * Replace each feature hook's `showToast` with `notify` in Phase 07+.
 */
export type ShowToast = ShowNotify;
