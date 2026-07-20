import { createAuthHeaders, request } from "@/lib/api";

import type {
  CreateSupportConversationRequest,
  CreateSupportEventRequest,
  MarkSupportReadRequest,
  SendSupportMessageRequest,
  SupportConversationListResponse,
  SupportConversationResponse,
  SupportEventListResponse,
  SupportMessageListResponse,
} from "../types";

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
