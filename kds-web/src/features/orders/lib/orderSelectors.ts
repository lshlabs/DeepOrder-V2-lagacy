import type { Order } from "@/lib/types";
import type { OrderSortDirection } from "@/lib/kds-types";
import { parseApiTimestamp } from "./orderFormatters";

export function getVisibleOrders(orders: Order[]): Order[] {
  return orders.filter((order) => !order.hidden && !order.archived);
}

export function compareOrders(
  leftTimestamp: string | null,
  rightTimestamp: string | null,
  leftId: number,
  rightId: number,
  direction: OrderSortDirection,
): number {
  const leftTime = leftTimestamp ? parseApiTimestamp(leftTimestamp).getTime() : 0;
  const rightTime = rightTimestamp ? parseApiTimestamp(rightTimestamp).getTime() : 0;
  const timeDiff = rightTime - leftTime;
  if (timeDiff !== 0) {
    return direction === "newest-first" ? timeDiff : -timeDiff;
  }
  return direction === "newest-first" ? rightId - leftId : leftId - rightId;
}

export function getReceivedOrders(
  orders: Order[],
  direction: OrderSortDirection,
): Order[] {
  return orders
    .filter((order) => order.status === "NEW" || order.status === "COOKING")
    .sort((left, right) =>
      compareOrders(
        left.ordered_at ?? left.created_at,
        right.ordered_at ?? right.created_at,
        left.id,
        right.id,
        direction,
      ),
    );
}

export function getDoneOrders(
  orders: Order[],
  direction: OrderSortDirection,
): Order[] {
  return orders
    .filter((order) => order.status === "DONE")
    .sort((left, right) =>
      compareOrders(left.updated_at, right.updated_at, left.id, right.id, direction),
    );
}

export function getOrderCounts(orders: Order[]) {
  const receivedOrders = orders.filter((order) => order.status === "NEW" || order.status === "COOKING");
  const doneOrders = orders.filter((order) => order.status === "DONE");

  return {
    NEW: receivedOrders.filter((order) => order.status === "NEW").length,
    COOKING: receivedOrders.filter((order) => order.status === "COOKING").length,
    DONE: doneOrders.length,
    CANCELLED: orders.filter((order) => order.status === "CANCELLED").length,
  };
}
