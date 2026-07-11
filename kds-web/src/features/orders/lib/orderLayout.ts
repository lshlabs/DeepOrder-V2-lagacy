import type { Order } from "../../../types";
import type { OrderLayoutColumn } from "@/features/kds/types";

export const ORDER_CARD_STACK_GAP_PX = 10;
export const ORDER_CARD_SHORT_RATIO = 0.58;

export function getOrderColumnWidth(
  height: number | undefined,
  laneHeight: number,
): OrderLayoutColumn["width"] {
  if (!height || laneHeight <= 0) return "base";
  if (height > laneHeight * 1.35) return "xwide";
  if (height > laneHeight) return "wide";
  return "base";
}

export function buildOrderLayoutColumns(
  orders: Order[],
  orderCardHeights: Record<number, number>,
  laneHeight: number,
): OrderLayoutColumn[] {
  const columns: OrderLayoutColumn[] = [];
  const shortCardMaxHeight = laneHeight > 0 ? laneHeight * ORDER_CARD_SHORT_RATIO : 0;
  let index = 0;

  while (index < orders.length) {
    const current = orders[index];
    const currentHeight = orderCardHeights[current.id];

    if (!currentHeight || laneHeight <= 0 || currentHeight > shortCardMaxHeight) {
      columns.push({ orders: [current], width: getOrderColumnWidth(currentHeight, laneHeight) });
      index += 1;
      continue;
    }

    const column: Order[] = [current];
    let accumulatedHeight = currentHeight;
    let nextIndex = index + 1;

    while (nextIndex < orders.length) {
      const next = orders[nextIndex];
      const nextHeight = orderCardHeights[next.id];

      if (!nextHeight || nextHeight > shortCardMaxHeight) {
        break;
      }

      const nextAccumulatedHeight = accumulatedHeight + ORDER_CARD_STACK_GAP_PX + nextHeight;
      if (nextAccumulatedHeight > laneHeight) {
        break;
      }

      column.push(next);
      accumulatedHeight = nextAccumulatedHeight;
      nextIndex += 1;
    }

    columns.push({ orders: column, width: "base" });
    index = nextIndex;
  }

  return columns;
}
