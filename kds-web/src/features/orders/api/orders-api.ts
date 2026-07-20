import { createAuthHeaders, request } from "@/lib/api";

import type {
  ArchiveCompletedOrdersResponse,
  HideOrderResponse,
  KdsOrdersResponse,
  OrderItemProgressResponse,
  OrderStatus,
  UpdateOrderItemProgressRequest,
} from "../types";

export async function apiGetKdsOrders(accessToken: string) {
  return request<KdsOrdersResponse>("/api/kds/orders", {
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

export async function apiUpdateOrderItemOptionProgress(
  accessToken: string,
  orderItemId: number,
  optionIndex: number,
  payload: UpdateOrderItemProgressRequest,
) {
  return request<OrderItemProgressResponse>(`/api/kds/order-items/${orderItemId}/options/${optionIndex}/progress`, {
    method: "PATCH",
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
