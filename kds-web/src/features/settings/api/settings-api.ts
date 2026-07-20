import { createAuthHeaders, request } from "@/lib/api";

import type { StoreSettings, UpdateStoreSettingsRequest } from "../types";

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
