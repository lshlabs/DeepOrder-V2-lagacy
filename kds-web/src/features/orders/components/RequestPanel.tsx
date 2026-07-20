import { getActionTone } from "../lib/analysisHelpers";
import type { OrderAIAnalysis } from "../types";

type RequestPanelProps = {
  analysis: OrderAIAnalysis | null;
  customerRequest: string | null;
};

export function RequestPanel({
  analysis,
  customerRequest,
}: RequestPanelProps) {
  const rawText = customerRequest?.trim() ?? "";
  if (!analysis && !rawText) return null;

  if (!analysis) {
    return (
      <div className="kds-request-panel">
        <span className="kds-request-label">요청사항</span>
        <p className="kds-request-text">{rawText}</p>
      </div>
    );
  }

  const actions = analysis.kitchenActions ?? [];
  const hasActions = actions.length > 0;
  const hasRaw = rawText.length > 0;
  if (!hasActions && !hasRaw) return null;

  return (
    <div className={`kds-request-panel${analysis.needsHumanCheck ? " needs-check" : ""}`}>
      {analysis.needsHumanCheck ? (
        <span className="kds-request-label urgent">AI 주의 요청</span>
      ) : (
        <span className="kds-request-label">요청사항</span>
      )}
      {hasActions ? (
        <div className="kds-action-chips">
          {actions.map((action, index) => (
            <span className={`kds-chip ${getActionTone(action)}`} key={`${action.displayText}-${index}`}>
              {action.displayText}
            </span>
          ))}
        </div>
      ) : null}
      {hasRaw ? <p className="kds-request-text">{rawText}</p> : null}
    </div>
  );
}
