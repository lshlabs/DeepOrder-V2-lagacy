import type {
  ArchiveCompletedOrdersResponse,
  AssignedMenuListResponse,
  AuthResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  CreateStaffRequest,
  CreateAssignedMenuRequest,
  CreateSupportConversationRequest,
  CurrentUserResponse,
  HideOrderResponse,
  IdentifierAvailabilityResponse,
  KdsOrdersResponse,
  KdsStoreContext,
  LoginRequest,
  OrderItemProgressResponse,
  OrderStatus,
  RefreshResponse,
  RegenerateStaffPinResponse,
  RegisterRequest,
  RegisterResponse,
  Staff,
  StaffListResponse,
  StaffWithTemporaryPin,
  StoreSettings,
  CreateSupportEventRequest,
  MarkSupportReadRequest,
  SendSupportMessageRequest,
  SupportConversationListResponse,
  SupportConversationResponse,
  SupportEventListResponse,
  SupportMessageListResponse,
  UpdateStaffActiveRequest,
  UpdateStaffRequest,
  UpdateOrderItemProgressRequest,
  UpdateAssignedMenuRequest,
  UpdateStoreSettingsRequest,
  UpdateStoreStatusRequest,
} from "../types";

// [목업] 백엔드 미연결시 mock 데이터 사용. 제거시 이 import와 모든 mock fallback 코드 삭제.
import {
  mockArchiveCompletedOrders,
  mockChangePassword,
  mockCheckIdentifier,
  mockCreateAssignedMenu,
  mockCreateStaff,
  mockDeleteAssignedMenu,
  mockGetAssignedMenus,
  mockGetCurrentUser,
  mockGetKdsOrders,
  mockGetKdsSettings,
  mockGetStaff,
  mockGetStoreContext,
  mockHideOrder,
  mockLogin,
  mockLogout,
  mockRefresh,
  mockRegenerateStaffPin,
  mockRegister,
  mockUpdateAssignedMenu,
  mockUpdateKdsSettings,
  mockUpdateOrderItemOptionProgress,
  mockUpdateOrderItemProgress,
  mockUpdateOrderStatus as mockUpdateOrderStatus_,
  mockUpdateStaff,
  mockUpdateStaffActive,
  mockUpdateStoreStatus,
} from "./mock";

const API_URL = import.meta.env.VITE_DEEPORDER_API_URL ?? "http://127.0.0.1:8000";
export const API_ORIGIN = new URL(API_URL).origin;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiLogin(payload: LoginRequest) {
  return withMockFallback(
    () => request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    mockLogin,
  );
}

export async function apiRegister(payload: RegisterRequest) {
  return withMockFallback(
    () => request<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    mockRegister,
  );
}

export async function apiCheckIdentifier(loginId: string) {
  return withMockFallback(
    () => request<IdentifierAvailabilityResponse>(
      `/api/auth/check-identifier?loginId=${encodeURIComponent(loginId)}`,
    ),
    mockCheckIdentifier,
  );
}

export async function apiRefresh(refreshToken: string) {
  return withMockFallback(
    () => request<RefreshResponse>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
    mockRefresh,
  );
}

export async function apiLogout(refreshToken: string) {
  await withMockFallback(
    () => request<void>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
    mockLogout,
  );
}

export async function apiGetCurrentUser(accessToken: string) {
  return withMockFallback(
    () => request<CurrentUserResponse>("/api/auth/me", {
      headers: createAuthHeaders(accessToken),
    }),
    mockGetCurrentUser,
  );
}

export async function apiChangePassword(accessToken: string, payload: ChangePasswordRequest) {
  return withMockFallback(
    () => request<ChangePasswordResponse>("/api/auth/change-password", {
      method: "POST",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    mockChangePassword,
  );
}

export async function apiGetKdsOrders(accessToken: string) {
  return withMockFallback(
    () => request<KdsOrdersResponse>("/api/kds/orders", {
      headers: createAuthHeaders(accessToken),
    }),
    mockGetKdsOrders,
  );
}

export async function apiGetStoreContext(accessToken: string) {
  return withMockFallback(
    () => request<KdsStoreContext>("/api/kds/store-context", {
      headers: createAuthHeaders(accessToken),
    }),
    mockGetStoreContext,
  );
}

export async function apiUpdateStoreStatus(accessToken: string, payload: UpdateStoreStatusRequest) {
  return withMockFallback(
    () => request<KdsStoreContext>("/api/kds/store-context/status", {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockUpdateStoreStatus(payload),
  );
}

export async function apiGetKdsSettings(accessToken: string) {
  return withMockFallback(
    () => request<StoreSettings>("/api/kds/settings", {
      headers: createAuthHeaders(accessToken),
    }),
    mockGetKdsSettings,
  );
}

export async function apiUpdateKdsSettings(accessToken: string, payload: UpdateStoreSettingsRequest) {
  return withMockFallback(
    () => request<StoreSettings>("/api/kds/settings", {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockUpdateKdsSettings(payload),
  );
}

export async function apiGetAssignedMenus(accessToken: string) {
  return withMockFallback(
    () => request<AssignedMenuListResponse>("/api/kds/my-tasks/menus", {
      headers: createAuthHeaders(accessToken),
    }),
    mockGetAssignedMenus,
  );
}

export async function apiCreateAssignedMenu(accessToken: string, payload: CreateAssignedMenuRequest) {
  return withMockFallback(
    () => request<void>("/api/kds/my-tasks/menus", {
      method: "POST",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockCreateAssignedMenu(payload.menuName),
  );
}

export async function apiUpdateAssignedMenu(accessToken: string, menuId: number, payload: UpdateAssignedMenuRequest) {
  return withMockFallback(
    () => request<void>(`/api/kds/my-tasks/menus/${menuId}`, {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockUpdateAssignedMenu(menuId, payload.menuName),
  );
}

export async function apiDeleteAssignedMenu(accessToken: string, menuId: number) {
  return withMockFallback(
    () => request<void>(`/api/kds/my-tasks/menus/${menuId}`, {
      method: "DELETE",
      headers: createAuthHeaders(accessToken),
    }),
    () => mockDeleteAssignedMenu(menuId),
  );
}

export async function apiGetStaff(accessToken: string) {
  return withMockFallback(
    () => request<StaffListResponse>("/api/kds/staff", {
      headers: createAuthHeaders(accessToken),
    }),
    mockGetStaff,
  );
}

export async function apiCreateStaff(accessToken: string, payload: CreateStaffRequest) {
  return withMockFallback(
    () => request<StaffWithTemporaryPin>("/api/kds/staff", {
      method: "POST",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockCreateStaff(payload),
  );
}

export async function apiUpdateStaff(accessToken: string, staffId: number, payload: UpdateStaffRequest) {
  return withMockFallback(
    () => request<Staff>(`/api/kds/staff/${staffId}`, {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockUpdateStaff(staffId, payload),
  );
}

export async function apiUpdateStaffActive(accessToken: string, staffId: number, payload: UpdateStaffActiveRequest) {
  return withMockFallback(
    () => request<Staff>(`/api/kds/staff/${staffId}/active`, {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockUpdateStaffActive(staffId, payload),
  );
}

export async function apiRegenerateStaffPin(accessToken: string, staffId: number) {
  return withMockFallback(
    () => request<RegenerateStaffPinResponse>(`/api/kds/staff/${staffId}/regenerate-pin`, {
      method: "POST",
      headers: createAuthHeaders(accessToken),
    }),
    () => mockRegenerateStaffPin(staffId),
  );
}

export async function apiUpdateOrderStatus(accessToken: string, orderId: number, status: OrderStatus) {
  return withMockFallback(
    () => request<{ id: number; status: OrderStatus }>(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify({ status }),
    }),
    () => mockUpdateOrderStatus_(orderId, status),
  );
}

export async function apiHideOrder(accessToken: string, orderId: number) {
  return withMockFallback(
    () => request<HideOrderResponse>(`/api/kds/orders/${orderId}/hide`, {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
    }),
    () => mockHideOrder(orderId),
  );
}

export async function apiArchiveCompletedOrders(accessToken: string) {
  return withMockFallback(
    () => request<ArchiveCompletedOrdersResponse>("/api/kds/orders/archive-completed", {
      method: "POST",
      headers: createAuthHeaders(accessToken),
    }),
    mockArchiveCompletedOrders,
  );
}

export async function apiUpdateOrderItemProgress(
  accessToken: string,
  orderItemId: number,
  payload: UpdateOrderItemProgressRequest,
) {
  return withMockFallback(
    () => request<OrderItemProgressResponse>(`/api/kds/order-items/${orderItemId}/progress`, {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockUpdateOrderItemProgress(orderItemId, payload),
  );
}

export async function apiUpdateOrderItemOptionProgress(
  accessToken: string,
  orderItemId: number,
  optionIndex: number,
  payload: UpdateOrderItemProgressRequest,
) {
  return withMockFallback(
    () => request<OrderItemProgressResponse>(`/api/kds/order-items/${orderItemId}/options/${optionIndex}/progress`, {
      method: "PATCH",
      headers: createAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    () => mockUpdateOrderItemOptionProgress(orderItemId, optionIndex, payload),
  );
}

export async function apiCreateSupportConversation(
  accessToken: string,
  payload: CreateSupportConversationRequest = {},
) {
  return request<SupportConversationResponse>("/api/kds/support/conversations", {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiGetCurrentSupportConversation(accessToken: string) {
  return request<SupportConversationResponse | null>("/api/kds/support/conversations/current", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiGetSupportConversation(accessToken: string, conversationId: string | number) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}`, {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiListSupportConversations(accessToken: string) {
  return request<SupportConversationListResponse>("/api/kds/support/conversations", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiSendSupportMessage(
  accessToken: string,
  conversationId: string | number,
  payload: SendSupportMessageRequest,
) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiListSupportMessages(
  accessToken: string,
  conversationId: string | number,
  params: { after_id?: number; before_id?: number; limit?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.after_id) query.set("after_id", String(params.after_id));
  if (params.before_id) query.set("before_id", String(params.before_id));
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<SupportMessageListResponse>(
    `/api/kds/support/conversations/${conversationId}/messages${suffix}`,
    {
      headers: createAuthHeaders(accessToken),
    }
  );
}

export async function apiCreateSupportEvent(
  accessToken: string,
  conversationId: string | number,
  payload: CreateSupportEventRequest,
) {
  return request<SupportEventListResponse>(`/api/kds/support/conversations/${conversationId}/events`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiListSupportEvents(accessToken: string, conversationId: string | number) {
  return request<SupportEventListResponse>(`/api/kds/support/conversations/${conversationId}/events`, {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiMarkSupportRead(
  accessToken: string,
  conversationId: string | number,
  payload: MarkSupportReadRequest,
) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}/read`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiRequestSupportHandoff(accessToken: string, conversationId: string | number) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}/handoff`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiCancelSupportHandoff(accessToken: string, conversationId: string | number) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}/cancel-handoff`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiAssignSupportConversation(accessToken: string, conversationId: string | number) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}/assign`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiSendSupportAgentMessage(
  accessToken: string,
  conversationId: string | number,
  payload: SendSupportMessageRequest,
) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}/agent-messages`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiCloseSupportConversation(accessToken: string, conversationId: string | number) {
  return request<SupportConversationResponse>(`/api/kds/support/conversations/${conversationId}/close`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });
}

// [목업] TypeError(fetch 실패) 발생시 mock fallback 호출. 제거시 삭제.
async function withMockFallback<T>(realCall: () => Promise<T>, mockCall: () => Promise<T>): Promise<T> {
  try {
    return await realCall();
  } catch (error) {
    if (error instanceof TypeError && error.message?.includes("fetch")) {
      console.warn("[Mock] 백엔드 연결 실패, mock 데이터 사용");
      return mockCall();
    }
    throw error;
  }
}

function createAuthHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

async function extractErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string | Array<{ msg?: string }> };
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => item.msg ?? "입력값을 확인해주세요.").join(", ");
    }
  } catch {
    return `요청 실패: ${response.status}`;
  }

  return `요청 실패: ${response.status}`;
}
