import { createAuthHeaders, request } from "@/lib/api";

import type {
  CreateStaffRequest,
  RegenerateStaffPinResponse,
  Staff,
  StaffListResponse,
  StaffWithTemporaryPin,
  UpdateStaffActiveRequest,
  UpdateStaffRequest,
} from "../types";

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
