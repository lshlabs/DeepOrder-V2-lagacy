import { useEffect, useMemo, useState } from "react";

import type { BoardTab } from "@/components/layout";

import type { Order } from "../types";

type OrderContextMenuState = {
  orderId: number;
  x: number;
  y: number;
};

type UseOrderOverlaysParams = {
  activeTab: BoardTab;
  doneOrders: Order[];
  hideOrder: (orderId: number) => Promise<boolean>;
  orders: Order[];
  receivedOrders: Order[];
};

export function useOrderOverlays({
  activeTab,
  doneOrders,
  hideOrder,
  orders,
  receivedOrders,
}: UseOrderOverlaysParams) {
  const [contextMenu, setContextMenu] = useState<OrderContextMenuState | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [removeOrderId, setRemoveOrderId] = useState<number | null>(null);
  const [pinnedOrderIds, setPinnedOrderIds] = useState<number[]>([]);

  const receivedOrderIds = useMemo(
    () => new Set(receivedOrders.map((order) => order.id)),
    [receivedOrders],
  );

  const pinnedReceivedOrders = useMemo(() => {
    const pinnedOrderIdSet = new Set(pinnedOrderIds);
    const ordersById = new Map(receivedOrders.map((order) => [order.id, order]));
    return [
      ...pinnedOrderIds.flatMap((orderId) => {
        const order = ordersById.get(orderId);
        return order ? [order] : [];
      }),
      ...receivedOrders.filter((order) => !pinnedOrderIdSet.has(order.id)),
    ];
  }, [pinnedOrderIds, receivedOrders]);

  const activeOrders = activeTab === "RECEIVED" ? pinnedReceivedOrders : doneOrders;
  const contextOrder = contextMenu
    ? orders.find((order) => order.id === contextMenu.orderId) ?? null
    : null;
  const selectedOrder = detailOrderId !== null
    ? orders.find((order) => order.id === detailOrderId) ?? null
    : null;

  useEffect(() => {
    setPinnedOrderIds((prev) => {
      const next = prev.filter((orderId) => receivedOrderIds.has(orderId));
      return next.length === prev.length ? prev : next;
    });
  }, [receivedOrderIds]);

  function openContextMenu(orderId: number, x: number, y: number) {
    setContextMenu({ orderId, x, y });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  function openOrderDetail(orderId: number) {
    setDetailOrderId(orderId);
    setContextMenu(null);
  }

  function closeOrderDetail() {
    setDetailOrderId(null);
  }

  function openRemoveOrder(orderId: number) {
    setRemoveOrderId(orderId);
    setContextMenu(null);
  }

  function cancelRemoveOrder() {
    setRemoveOrderId(null);
  }

  function togglePinnedOrder(orderId: number) {
    setPinnedOrderIds((prev) => (
      prev.includes(orderId)
        ? prev.filter((pinnedOrderId) => pinnedOrderId !== orderId)
        : [...prev, orderId]
    ));
    setContextMenu(null);
  }

  function confirmRemoveOrder() {
    if (removeOrderId === null) {
      return;
    }
    void hideOrder(removeOrderId).then((success) => {
      if (success) {
        setRemoveOrderId(null);
        setContextMenu(null);
      }
    });
  }

  return {
    activeOrders,
    cancelRemoveOrder,
    closeContextMenu,
    closeOrderDetail,
    confirmRemoveOrder,
    contextMenu,
    contextOrder,
    openContextMenu,
    openOrderDetail,
    openRemoveOrder,
    pinnedOrderIds,
    removeOrderId,
    selectedOrder,
    togglePinnedOrder,
  };
}
