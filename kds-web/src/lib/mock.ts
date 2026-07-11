// ============================================================
// [목업] 백엔드 API 모킹
// 백엔드가 실행중이지 않을 때 사용합니다.
// 제거 방법:
//   1. 이 파일(mock.ts)을 삭제
//   2. api.ts에서 'mock' 관련 import와 fallback 코드 제거
// ============================================================

import type {
  ArchiveCompletedOrdersResponse,
  AssignedMenu,
  AssignedMenuListResponse,
  AuthResponse,
  ChangePasswordResponse,
  CreateStaffRequest,
  CurrentUserResponse,
  HideOrderResponse,
  IdentifierAvailabilityResponse,
  KdsOrdersResponse,
  KdsStoreContext,
  Order,
  OrderItem,
  OrderItemOption,
  OrderItemProgressResponse,
  OrderStatus,
  RefreshResponse,
  RegenerateStaffPinResponse,
  Staff,
  StaffListResponse,
  StaffWithTemporaryPin,
  StoreSettings,
  UpdateStaffActiveRequest,
  UpdateStaffRequest,
  UpdateOrderItemProgressRequest,
  UpdateStoreSettingsRequest,
} from "@/lib/types";

export const MOCK_ACCESS_TOKEN = "mock-access-token";
export const MOCK_REFRESH_TOKEN = "mock-refresh-token";

// ── Mock user & store ──────────────────────────────────────

const mockUser = {
  id: 1,
  loginId: "owner",
  name: "매장 관리자",
  role: "STORE_OWNER" as const,
  accountType: null,
  approvalStatus: "APPROVED" as const,
};

const mockStore = {
  id: 1,
  storeId: "store-001",
  storeName: "맛있는 치킨",
  phone: "02-1234-5678",
  zipNo: "12345",
  roadAddress: "서울시 강남구 테헤란로 123",
  jibunAddress: "서울시 강남구 역삼동 123-45",
  addressDetail: "1층",
  approvalStatus: "APPROVED" as const,
};

// ── Helpers ────────────────────────────────────────────────

function makeOrderItem(id: number, name: string, quantity: number, done = false, options: OrderItemOption[] = []): OrderItem {
  return {
    id,
    name,
    quantity,
    targetQuantity: quantity,
    completedQuantity: done ? quantity : 0,
    options,
    unit_price: 15000,
    total_price: 15000 * quantity,
    done,
    doneAt: done ? new Date().toISOString() : null,
    doneByUserId: done ? 1 : null,
  };
}

function makeTimestamp(agoMinutes: number): string {
  return new Date(Date.now() - agoMinutes * 60_000).toISOString();
}

function makeOrder(
  id: number,
  orderNumber: string,
  status: OrderStatus,
  items: OrderItem[],
  agoMinutes: number,
): Order {
  return {
    id,
    platform: "배달의민족",
    store_id: "store-001",
    external_order_id: `ext-${id}`,
    order_number: orderNumber,
    status,
    customer_request: "맵게 해주세요",
    delivery_request: "문 앞에 놓아주세요",
    deliveryPhone: "010-1234-5678",
    deliveryZipNo: "12345",
    deliveryRoadAddress: "서울시 강남구 테헤란로 123",
    deliveryJibunAddress: "서울시 강남구 역삼동 123-45",
    deliveryAddressDetail: "1층",
    ordered_at: makeTimestamp(agoMinutes),
    created_at: makeTimestamp(agoMinutes),
    updated_at: makeTimestamp(Math.max(0, agoMinutes - 5)),
    hidden: false,
    hiddenAt: null,
    archived: false,
    archivedAt: null,
    items,
    aiAnalysis: {
      summary: "고객 요청사항이 분석되었습니다.",
      tags: ["맵게"],
      cookingNotes: ["맵게 조리 필요"],
      packingNotes: [],
      deliveryNotes: ["문 앞 배송"],
      kitchenActions: [],
      packingActions: [],
      ignoredRequests: [],
      riskLevel: "LOW",
      warnings: [],
      needsHumanCheck: false,
      analysisStatus: "COMPLETED",
    },
  };
}

// ── Mock state ─────────────────────────────────────────────

let mockStaffList: Staff[] = [
  { id: 1, loginId: "kimcs", name: "김철수", accountType: "EMPLOYEE", positionLabel: "직원", active: true },
  { id: 2, loginId: "leyh", name: "이영희", accountType: "EMPLOYEE", positionLabel: "매니저", active: true },
  { id: 3, loginId: "parkms", name: "박민수", accountType: "EMPLOYEE", positionLabel: "직원", active: false },
];

let mockAssignedMenuList: AssignedMenu[] = [
  { id: 1, menuName: "후라이드 치킨", normalizedMenuName: "후라이드 치킨", sortOrder: 1 },
  { id: 2, menuName: "양념 치킨", normalizedMenuName: "양념 치킨", sortOrder: 2 },
  { id: 3, menuName: "떡볶이", normalizedMenuName: "떡볶이", sortOrder: 3 },
];

let nextStaffId = 10;
let nextMenuId = 10;

function buildMockOrders(): Order[] {
  return [
    makeOrder(1, "1001", "NEW", [
      makeOrderItem(1, "후라이드 치킨", 2),
      makeOrderItem(2, "양념 치킨", 1),
    ], 5),
    makeOrder(2, "1002", "COOKING", [
      makeOrderItem(3, "떡볶이", 1, false, [
        {
          id: "opt-1",
          parentItemId: 3,
          label: "매운맛",
          groupName: "맵기 선택",
          optionName: "매운맛",
          sortOrder: 0,
          targetQuantity: 1,
          completedQuantity: 0,
          done: false,
          doneAt: null,
          doneByUserId: null,
        },
      ]),
      makeOrderItem(4, "순살 치킨", 1, false, [
        {
          id: "opt-2",
          parentItemId: 4,
          label: "간장소스",
          groupName: "소스 선택",
          optionName: "간장소스",
          sortOrder: 0,
          targetQuantity: 1,
          completedQuantity: 1,
          done: true,
          doneAt: makeTimestamp(2),
          doneByUserId: 1,
        },
      ]),
    ], 12),
    makeOrder(3, "1003", "COOKING", [
      makeOrderItem(5, "김밥", 3),
    ], 8),
  ];
}

// ── Auth ───────────────────────────────────────────────────

export async function mockLogin(): Promise<AuthResponse> {
  return {
    accessToken: MOCK_ACCESS_TOKEN,
    refreshToken: MOCK_REFRESH_TOKEN,
    autoLogin: false,
    user: mockUser,
    store: mockStore,
  };
}

export async function mockRegister(): Promise<CurrentUserResponse> {
  return { user: mockUser, store: mockStore };
}

export async function mockCheckIdentifier(): Promise<IdentifierAvailabilityResponse> {
  return { available: true, message: "사용 가능한 아이디입니다." };
}

export async function mockRefresh(): Promise<RefreshResponse> {
  return { accessToken: MOCK_ACCESS_TOKEN };
}

export async function mockLogout(): Promise<void> {
  // no-op
}

export async function mockGetCurrentUser(): Promise<CurrentUserResponse> {
  return { user: mockUser, store: mockStore };
}

export async function mockChangePassword(): Promise<ChangePasswordResponse> {
  return { message: "비밀번호가 변경되었습니다." };
}

// ── Orders ─────────────────────────────────────────────────

export async function mockGetKdsOrders(): Promise<KdsOrdersResponse> {
  return { orders: buildMockOrders() };
}

export async function mockUpdateOrderStatus(orderId: number, status: OrderStatus): Promise<{ id: number; status: OrderStatus }> {
  return { id: orderId, status };
}

export async function mockHideOrder(orderId: number): Promise<HideOrderResponse> {
  return { orderId, hidden: true };
}

export async function mockArchiveCompletedOrders(): Promise<ArchiveCompletedOrdersResponse> {
  return { archivedCount: 0 };
}

export async function mockUpdateOrderItemProgress(
  orderItemId: number,
  payload: UpdateOrderItemProgressRequest,
): Promise<OrderItemProgressResponse> {
  return {
    orderItemId,
    optionIndex: null,
    targetQuantity: 3,
    completedQuantity: payload.completedQuantity ?? (payload.done ? 1 : 0),
    done: payload.done ?? false,
    doneAt: payload.done ? new Date().toISOString() : null,
    doneByUserId: payload.done ? 1 : null,
  };
}

export async function mockUpdateOrderItemOptionProgress(
  orderItemId: number,
  optionIndex: number,
  payload: UpdateOrderItemProgressRequest,
): Promise<OrderItemProgressResponse> {
  return {
    orderItemId,
    optionIndex,
    targetQuantity: 1,
    completedQuantity: payload.completedQuantity ?? (payload.done ? 1 : 0),
    done: payload.done ?? false,
    doneAt: payload.done ? new Date().toISOString() : null,
    doneByUserId: payload.done ? 1 : null,
  };
}

// ── Staff ──────────────────────────────────────────────────

export async function mockGetStaff(): Promise<StaffListResponse> {
  return { staff: [...mockStaffList] };
}

export async function mockCreateStaff(payload: CreateStaffRequest): Promise<StaffWithTemporaryPin> {
  const id = nextStaffId++;
  const newStaff: StaffWithTemporaryPin = {
    id,
    loginId: payload.loginId,
    name: payload.name,
    accountType: "EMPLOYEE",
    positionLabel: payload.positionLabel ?? null,
    active: true,
    temporaryPin: String(1000 + Math.floor(Math.random() * 9000)),
  };
  mockStaffList = [...mockStaffList, newStaff];
  return newStaff;
}

export async function mockUpdateStaff(staffId: number, payload: UpdateStaffRequest): Promise<Staff> {
  mockStaffList = mockStaffList.map((s) =>
    s.id === staffId ? { ...s, name: payload.name, loginId: payload.loginId, positionLabel: payload.positionLabel ?? s.positionLabel } : s,
  );
  return mockStaffList.find((s) => s.id === staffId)!;
}

export async function mockUpdateStaffActive(staffId: number, payload: UpdateStaffActiveRequest): Promise<Staff> {
  mockStaffList = mockStaffList.map((s) =>
    s.id === staffId ? { ...s, active: payload.active } : s,
  );
  return mockStaffList.find((s) => s.id === staffId)!;
}

export async function mockRegenerateStaffPin(staffId: number): Promise<RegenerateStaffPinResponse> {
  return { id: staffId, temporaryPin: String(1000 + Math.floor(Math.random() * 9000)) };
}

// ── My Tasks (Assigned Menus) ──────────────────────────────

export async function mockGetAssignedMenus(): Promise<AssignedMenuListResponse> {
  return { menus: [...mockAssignedMenuList] };
}

export async function mockCreateAssignedMenu(menuName: string): Promise<void> {
  const id = nextMenuId++;
  const normalized = menuName.trim();
  mockAssignedMenuList = [
    ...mockAssignedMenuList,
    { id, menuName: normalized, normalizedMenuName: normalized, sortOrder: mockAssignedMenuList.length + 1 },
  ];
}

export async function mockUpdateAssignedMenu(menuId: number, menuName: string): Promise<void> {
  mockAssignedMenuList = mockAssignedMenuList.map((m) =>
    m.id === menuId ? { ...m, menuName: menuName.trim(), normalizedMenuName: menuName.trim() } : m,
  );
}

export async function mockDeleteAssignedMenu(menuId: number): Promise<void> {
  mockAssignedMenuList = mockAssignedMenuList.filter((m) => m.id !== menuId);
}

// ── Store Context ──────────────────────────────────────────

const mockStoreContext: KdsStoreContext = {
  storeId: "store-001",
  storeName: "맛있는 치킨",
  operatingStatus: "OPEN",
  pausedUntil: null,
  statusSource: "MANUAL",
};

export async function mockGetStoreContext(): Promise<KdsStoreContext> {
  return { ...mockStoreContext };
}

export async function mockUpdateStoreStatus(payload: { operatingStatus: KdsStoreContext["operatingStatus"]; pauseMinutes?: number }): Promise<KdsStoreContext> {
  return {
    ...mockStoreContext,
    operatingStatus: payload.operatingStatus,
    pausedUntil: payload.operatingStatus === "PAUSED" && payload.pauseMinutes
      ? new Date(Date.now() + payload.pauseMinutes * 60_000).toISOString()
      : null,
  };
}

// ── Settings ───────────────────────────────────────────────

const mockSettings: StoreSettings = {
  notificationsEnabled: true,
  notificationSound: "default",
  breaktimeEnabled: false,
  breaktimeStartHour: 14,
  breaktimeStartMinute: 0,
  breaktimeDurationMinutes: 30,
  autoAccept: true,
};

export async function mockGetKdsSettings(): Promise<StoreSettings> {
  return { ...mockSettings };
}

export async function mockUpdateKdsSettings(payload: UpdateStoreSettingsRequest): Promise<StoreSettings> {
  Object.assign(mockSettings, payload);
  return { ...mockSettings };
}
