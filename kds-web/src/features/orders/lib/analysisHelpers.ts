import type { AnalysisAction, OrderAIAnalysis } from "@/lib/types";

export function getActionTone(action: AnalysisAction) {
  if (action.type === "ALLERGY" || action.type === "SAFETY_CHECK" || action.severity === "HIGH") return "danger";
  if (action.type === "COOKING_REQUEST" || action.type === "TASTE_ADJUSTMENT") return "cook";
  if (action.type === "EXCLUDE_INGREDIENT") return "exclude";
  return "neutral";
}

export function getAllergyRiskItemIds(analysis: OrderAIAnalysis | null) {
  const ids = new Set<number>();
  analysis?.kitchenActions
    ?.filter((action) => action.type === "ALLERGY")
    .forEach((action) => action.matchedMenuItemIds?.forEach((id) => ids.add(id)));
  return ids;
}
