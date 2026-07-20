import { createAuthHeaders, request } from "@/lib/api";

import type { KdsStoreContext, UpdateStoreStatusRequest } from "../types";

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
