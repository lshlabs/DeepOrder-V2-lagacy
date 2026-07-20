import { createAuthHeaders, request } from "@/lib/api";

import type {
  AuthResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  CurrentUserResponse,
  IdentifierAvailabilityResponse,
  LoginRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types";

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
