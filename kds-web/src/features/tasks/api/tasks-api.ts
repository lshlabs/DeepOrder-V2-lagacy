import { createAuthHeaders, request } from "@/lib/api";

import type {
  AssignedMenuListResponse,
  CreateAssignedMenuRequest,
  UpdateAssignedMenuRequest,
} from "../types";

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
