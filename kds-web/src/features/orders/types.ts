export type OrderStatus = "NEW" | "COOKING" | "DONE" | "CANCELLED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AnalysisStatus = "PENDING" | "COMPLETED" | "FALLBACK" | "FAILED";

export type OrderItemOption = {
  id: string;
  parentItemId: number;
  label: string;
  groupName: string | null;
  optionName: string;
  sortOrder: number;
  targetQuantity: number;
  completedQuantity: number;
  done: boolean;
  doneAt: string | null;
  doneByUserId: number | null;
};

export type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  targetQuantity: number;
  completedQuantity: number;
  options: OrderItemOption[];
  unit_price: number | null;
  total_price: number | null;
  done: boolean;
  doneAt: string | null;
  doneByUserId: number | null;
};

export type AnalysisAction = {
  type: "ALLERGY" | "EXCLUDE_INGREDIENT" | "TASTE_ADJUSTMENT" | "COOKING_REQUEST" | "SAFETY_CHECK" | string;
  label: string;
  target: string;
  displayText: string;
  severity: RiskLevel;
  requiresHumanCheck: boolean;
  source: string;
  sourceText: string;
  matchedMenuItemIds: number[];
};

export type OrderAIAnalysis = {
  summary: string;
  tags: string[];
  cookingNotes: string[];
  packingNotes: string[];
  deliveryNotes: string[];
  kitchenActions: AnalysisAction[];
  packingActions: AnalysisAction[];
  ignoredRequests: Array<{ type: string; text: string }>;
  riskLevel: RiskLevel;
  warnings: string[];
  needsHumanCheck: boolean;
  analysisStatus: AnalysisStatus;
};

export type Order = {
  id: number;
  platform: string;
  store_id: string;
  external_order_id: string;
  order_number: string;
  status: OrderStatus;
  customer_request: string | null;
  delivery_request: string | null;
  deliveryPhone: string | null;
  deliveryZipNo: string | null;
  deliveryRoadAddress: string | null;
  deliveryJibunAddress: string | null;
  deliveryAddressDetail: string | null;
  ordered_at: string | null;
  created_at: string;
  updated_at: string;
  hidden: boolean;
  hiddenAt: string | null;
  archived: boolean;
  archivedAt: string | null;
  items: OrderItem[];
  aiAnalysis: OrderAIAnalysis | null;
};

export type KdsOrdersResponse = {
  orders: Order[];
};

export type HideOrderResponse = {
  orderId: number;
  hidden: boolean;
};

export type ArchiveCompletedOrdersResponse = {
  archivedCount: number;
};

export type UpdateOrderItemProgressRequest = {
  done?: boolean;
  delta?: number;
  completedQuantity?: number;
};

export type OrderItemProgressResponse = {
  orderItemId: number;
  optionIndex: number | null;
  targetQuantity: number;
  completedQuantity: number;
  done: boolean;
  doneAt: string | null;
  doneByUserId: number | null;
};

export type OrderSortDirection = "newest-first" | "oldest-first";

export type OrderLayoutColumn = {
  orders: Order[];
  width: "base" | "wide" | "xwide";
};
