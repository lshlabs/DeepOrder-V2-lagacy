import { cn } from "@/lib/utils";

import { getActionTone } from "../lib/analysisHelpers";
import type { OrderAIAnalysis } from "../../../types";

type RequestPanelProps = {
  analysis: OrderAIAnalysis | null;
  customerRequest: string | null;
};

const chipVariants: Record<string, string> = {
  danger:  "bg-red-500/10 text-red-500",
  cook:    "bg-green-600/10 text-green-600",
  exclude: "bg-orange-500/10 text-[var(--color-accent)]",
  neutral: "bg-[var(--color-surface-3)] text-[var(--color-text-subtle)]",
};

export function RequestPanel({
  analysis,
  customerRequest,
}: RequestPanelProps) {
  const rawText = customerRequest?.trim() ?? "";
  if (!analysis && !rawText) return null;

  const needsCheck = analysis?.needsHumanCheck ?? false;
  const actions = analysis?.kitchenActions ?? [];
  const hasActions = actions.length > 0;
  const hasRaw = rawText.length > 0;

  if (!analysis) {
    return (
      <div className="flex flex-col gap-1.5 border-t border-yellow-500/18 bg-yellow-500/5 px-3 py-2.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-[#92400e]">
          요청사항
        </span>
        <p className="text-xs font-normal leading-relaxed break-words text-[var(--color-text-subtle)]">
          {rawText}
        </p>
      </div>
    );
  }

  if (!hasActions && !hasRaw) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-t px-3 py-2.5",
        needsCheck
          ? "border-red-500/22 bg-red-500/4"
          : "border-yellow-500/18 bg-yellow-500/5",
      )}
    >
      {needsCheck ? (
        <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-red-500">
          AI 주의 요청
        </span>
      ) : (
        <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-[#92400e]">
          요청사항
        </span>
      )}

      {hasActions ? (
        <div className="flex flex-wrap gap-1">
          {actions.map((action, index) => (
            <span
              key={`${action.displayText}-${index}`}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                chipVariants[getActionTone(action)] ?? chipVariants.neutral,
              )}
            >
              {action.displayText}
            </span>
          ))}
        </div>
      ) : null}

      {hasRaw ? (
        <p className="text-xs font-normal leading-relaxed break-words text-[var(--color-text-subtle)]">
          {rawText}
        </p>
      ) : null}
    </div>
  );
}
