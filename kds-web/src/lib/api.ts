import type {
  ArchiveCompletedOrdersResponse,
  AssignedMenuListResponse,
  AuthResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  CreateStaffRequest,
  CreateAssignedMenuRequest,
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
  UpdateStaffActiveRequest,
  UpdateStaffRequest,
  UpdateOrderItemProgressRequest,
  UpdateAssignedMenuRequest,
  UpdateStoreSettingsRequest,
  UpdateStoreStatusRequest,
} from "../types";

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
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiRegister(payload: RegisterRequest) {
  return request<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiCheckIdentifier(loginId: string) {
  return request<IdentifierAvailabilityResponse>(
    `/api/auth/check-identifier?loginId=${encodeURIComponent(loginId)}`,
  );
}

export async function apiRefresh(refreshToken: string) {
  return request<RefreshResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function apiLogout(refreshToken: string) {
  await request<void>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function apiGetCurrentUser(accessToken: string) {
  return request<CurrentUserResponse>("/api/auth/me", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiChangePassword(accessToken: string, payload: ChangePasswordRequest) {
  return request<ChangePasswordResponse>("/api/auth/change-password", {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiGetKdsOrders(accessToken: string) {
  return request<KdsOrdersResponse>("/api/kds/orders", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiGetStoreContext(accessToken: string) {
  return request<KdsStoreContext>("/api/kds/store-context", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiUpdateStoreStatus(accessToken: string, payload: UpdateStoreStatusRequest) {
  return request<KdsStoreContext>("/api/kds/store-context/status", {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiGetKdsSettings(accessToken: string) {
  return request<StoreSettings>("/api/kds/settings", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiUpdateKdsSettings(accessToken: string, payload: UpdateStoreSettingsRequest) {
  return request<StoreSettings>("/api/kds/settings", {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiGetAssignedMenus(accessToken: string) {
  return request<AssignedMenuListResponse>("/api/kds/my-tasks/menus", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiCreateAssignedMenu(accessToken: string, payload: CreateAssignedMenuRequest) {
  return request<void>("/api/kds/my-tasks/menus", {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateAssignedMenu(accessToken: string, menuId: number, payload: UpdateAssignedMenuRequest) {
  return request<void>(`/api/kds/my-tasks/menus/${menuId}`, {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteAssignedMenu(accessToken: string, menuId: number) {
  return request<void>(`/api/kds/my-tasks/menus/${menuId}`, {
    method: "DELETE",
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiGetStaff(accessToken: string) {
  return request<StaffListResponse>("/api/kds/staff", {
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiCreateStaff(accessToken: string, payload: CreateStaffRequest) {
  return request<StaffWithTemporaryPin>("/api/kds/staff", {
    method: "POST",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateStaff(accessToken: string, staffId: number, payload: UpdateStaffRequest) {
  return request<Staff>(`/api/kds/staff/${staffId}`, {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateStaffActive(accessToken: string, staffId: number, payload: UpdateStaffActiveRequest) {
  return request<Staff>(`/api/kds/staff/${staffId}/active`, {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function apiRegenerateStaffPin(accessToken: string, staffId: number) {
  return request<RegenerateStaffPinResponse>(`/api/kds/staff/${staffId}/regenerate-pin`, {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiUpdateOrderStatus(accessToken: string, orderId: number, status: OrderStatus) {
  return request<{ id: number; status: OrderStatus }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify({ status }),
  });
}

export async function apiHideOrder(accessToken: string, orderId: number) {
  return request<HideOrderResponse>(`/api/kds/orders/${orderId}/hide`, {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiArchiveCompletedOrders(accessToken: string) {
  return request<ArchiveCompletedOrdersResponse>("/api/kds/orders/archive-completed", {
    method: "POST",
    headers: createAuthHeaders(accessToken),
  });
}

export async function apiUpdateOrderItemProgress(
  accessToken: string,
  orderItemId: number,
  payload: UpdateOrderItemProgressRequest,
) {
  return request<OrderItemProgressResponse>(`/api/kds/order-items/${orderItemId}/progress`, {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
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
