export type OrderStatus = "NEW" | "COOKING" | "DONE" | "CANCELLED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AnalysisStatus = "PENDING" | "COMPLETED" | "FALLBACK" | "FAILED";
export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type UserRole = "STORE_OWNER" | "ADMIN";
export type AccountType = "OWNER" | "EMPLOYEE";
export type StoreOperatingStatus = "OPEN" | "PAUSED" | "CLOSED";
export type StoreStatusSource = "MANUAL" | "BREAKTIME";

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

export type AuthUser = {
  id: number;
  loginId: string;
  name: string;
  role: UserRole;
  accountType?: AccountType | null;
  approvalStatus: ApprovalStatus;
};

export type AuthStore = {
  id: number;
  storeId: string;
  storeName: string;
  phone: string | null;
  zipNo: string | null;
  roadAddress: string | null;
  jibunAddress: string | null;
  addressDetail: string | null;
  approvalStatus: ApprovalStatus;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  autoLogin: boolean;
  user: AuthUser;
  store: AuthStore;
};

export type CurrentUserResponse = {
  user: AuthUser;
  store: AuthStore;
};

export type RegisterResponse = {
  user: AuthUser;
  store: AuthStore;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export type RefreshResponse = {
  accessToken: string;
};

export type IdentifierAvailabilityResponse = {
  available: boolean;
  message: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  autoLogin: boolean;
  user: AuthUser;
  store: AuthStore;
};

export type LoginRequest = {
  loginId: string;
  password: string;
  autoLogin: boolean;
};

export type RegisterRequest = {
  name: string;
  loginId: string;
  password: string;
  storeName: string;
  storePhone: string;
  zipNo: string;
  roadAddress: string;
  jibunAddress: string;
  addressDetail: string;
};

export type KdsStoreContext = {
  storeId: string;
  storeName: string;
  operatingStatus: StoreOperatingStatus;
  pausedUntil: string | null;
  statusSource: StoreStatusSource;
};

export type StoreSettings = {
  notificationsEnabled: boolean;
  notificationSound: string;
  breaktimeEnabled: boolean;
  breaktimeStartHour: number;
  breaktimeStartMinute: number;
  breaktimeDurationMinutes: number;
  autoAccept: boolean;
};

export type UpdateStoreStatusRequest = {
  operatingStatus: StoreOperatingStatus;
  pauseMinutes?: number;
};

export type UpdateStoreSettingsRequest = StoreSettings;

export type AssignedMenu = {
  id: number;
  menuName: string;
  normalizedMenuName: string;
  sortOrder: number;
};

export type AssignedMenuListResponse = {
  menus: AssignedMenu[];
};

export type CreateAssignedMenuRequest = {
  menuName: string;
  sortOrder?: number;
};

export type UpdateAssignedMenuRequest = {
  menuName: string;
  sortOrder?: number;
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

export type Staff = {
  id: number;
  loginId: string;
  name: string;
  accountType: AccountType;
  positionLabel: string | null;
  active: boolean;
};

export type StaffListResponse = {
  staff: Staff[];
};

export type CreateStaffRequest = {
  name: string;
  loginId: string;
  positionLabel?: string | null;
};

export type UpdateStaffRequest = {
  name: string;
  loginId: string;
  positionLabel?: string | null;
};

export type UpdateStaffActiveRequest = {
  active: boolean;
};

export type StaffWithTemporaryPin = Staff & {
  temporaryPin: string;
};

export type SupportConversationStatus = "BOT" | "AI" | "WAITING_AGENT" | "AGENT" | "CLOSED" | "EXPIRED";
export type SupportConversationMode = "BOT" | "AI" | "AGENT";
export type SupportMessageSenderType = "USER" | "BOT" | "AI" | "AGENT" | "SYSTEM";

export type SupportMessageResponse = {
  id: number;
  conversation_id: number;
  sender_type: SupportMessageSenderType;
  sender_id: number | null;
  content: string;
  metadata_json: Record<string, unknown>;
  client_message_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type SupportConversationResponse = {
  id: number;
  store_id: string;
  user_id: number;
  status: SupportConversationStatus;
  mode: SupportConversationMode;
  assigned_agent_id: number | null;
  source: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  expires_at: string | null;
  messages: SupportMessageResponse[];
};

export type SupportConversationListResponse = {
  conversations: SupportConversationResponse[];
};

export type CreateSupportConversationRequest = {
  source?: string;
};

export type SendSupportMessageRequest = {
  content: string;
  client_message_id?: string | null;
};

export type SupportMessageListResponse = {
  messages: SupportMessageResponse[];
};

export type CreateSupportEventRequest = {
  event_type: string;
  payload?: Record<string, unknown>;
};

export type SupportEventResponse = {
  id: number;
  conversation_id: number;
  event_type: string;
  payload_json: Record<string, unknown>;
  actor_type: "USER" | "AGENT" | "SYSTEM";
  actor_id: number | null;
  created_at: string;
};

export type SupportEventListResponse = {
  events: SupportEventResponse[];
};

export type MarkSupportReadRequest = {
  last_read_message_id: number;
};

export type SupportAgentQueueItemResponse = {
  conversation_id: number;
  store_id: string;
  user_id: number;
  status: SupportConversationStatus;
  mode: SupportConversationMode;
  latest_message: SupportMessageResponse | null;
  latest_message_preview: string | null;
  latest_message_sender_type: SupportMessageSenderType | null;
  waiting_duration_seconds: number;
  assigned_agent_id: number | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  summary: string | null;
};

export type SupportAgentQueueResponse = {
  conversations: SupportAgentQueueItemResponse[];
};

export type RegenerateStaffPinResponse = {
  id: number;
  temporaryPin: string;
};
