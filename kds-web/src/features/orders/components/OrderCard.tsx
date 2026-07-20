import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { AlarmClock, Check, Pin, TriangleAlert } from "lucide-react";

import { getAllergyRiskItemIds } from "../lib/analysisHelpers";
import {
  formatElapsedLabel,
  formatOrderCardTime,
  getElapsedMinutes,
  getOrderTypeLabel,
} from "../lib/orderFormatters";
import type { Order, OrderStatus } from "../types";
import { RequestPanel } from "./RequestPanel";

type OrderCardProps = {
  now: number;
  onContextMenu: (orderId: number, x: number, y: number) => void;
  onHeightChange?: (height: number) => void;
  onCycleItem: (itemId: number, completedQuantity: number, targetQuantity: number) => void;
  onCycleItemOption: (
    itemId: number,
    optionIndex: number,
    completedQuantity: number,
    targetQuantity: number,
  ) => void;
  onUpdateStatus: (orderId: number, status: OrderStatus) => Promise<void>;
  order: Order;
  pinned: boolean;
  updatingItemId: string | null;
  updating: boolean;
};

export function OrderCard({
  now,
  onContextMenu,
  onHeightChange,
  onCycleItem,
  onCycleItemOption,
  onUpdateStatus,
  order,
  pinned,
  updatingItemId,
  updating,
}: OrderCardProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  const orderTimestamp = order.ordered_at ?? order.created_at;
  const orderedTime = formatOrderCardTime(orderTimestamp);
  const elapsedLabel = order.status === "DONE" ? null : formatElapsedLabel(now, orderTimestamp);
  const elapsedMinutes = getElapsedMinutes(now, orderTimestamp);
  const allergyRiskItemIds = getAllergyRiskItemIds(order.aiAnalysis);
  const isUrgent = elapsedMinutes >= 15;
  const isWarning = elapsedMinutes >= 8 && elapsedMinutes < 15;
  const orderTypeLabel = getOrderTypeLabel(order.platform);

  function handlePointerDown(e: PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    longPressTimerRef.current = window.setTimeout(() => {
      onContextMenu(order.id, e.clientX, e.clientY);
    }, 600);
  }

  function handlePointerUp() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleContextMenu(e: MouseEvent<HTMLElement>) {
    e.preventDefault();
    onContextMenu(order.id, e.clientX, e.clientY);
  }

  function handleItemKeyDown(
    e: KeyboardEvent<HTMLDivElement>,
    isUpdatingItem: boolean,
    onAdvance: () => void,
  ) {
    if ((e.key === "Enter" || e.key === " ") && !isUpdatingItem) {
      onAdvance();
    }
  }

  useEffect(() => {
    const cardEl = cardRef.current;
    if (!cardEl || !onHeightChange) return;
    const updateHeight = () => onHeightChange(Math.ceil(cardEl.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(cardEl);
    return () => observer.disconnect();
  }, [onHeightChange, order.id]);

  return (
    <article
      className={`kds-card${order.status === "DONE" ? " done" : ""}${pinned ? " pinned" : ""}`}
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      <div className="kds-card-head">
        <div className="kds-card-head-left">
          {pinned ? (
            <span className="kds-card-pin" aria-label="고정된 주문" title="고정된 주문">
              <Pin size={13} aria-hidden="true" />
            </span>
          ) : null}
          <span className="kds-order-num">#{order.order_number ?? order.id}</span>
          <span className={`kds-elapsed-badge${isUrgent ? " urgent" : isWarning ? " warning" : ""}`}>
            <AlarmClock size={11} aria-hidden="true" />
            {elapsedLabel ? `${orderedTime} · ${elapsedLabel}` : orderedTime}
          </span>
        </div>
        <span className={`kds-order-type-badge kds-order-type-badge--${order.platform?.toLowerCase().includes("delivery") || order.platform?.toLowerCase().includes("배달") ? "delivery" : order.platform?.toLowerCase().includes("takeout") || order.platform?.toLowerCase().includes("포장") ? "takeout" : "dine"}`}>
          {orderTypeLabel}
        </span>
      </div>

      <div className="kds-items">
        {order.items.map((item, idx) => {
          const isDone = item.done;
          const isLast = idx === order.items.length - 1;
          const hasAllergy = allergyRiskItemIds.has(item.id);
          const isUpdatingItem = updatingItemId === `item:${item.id}`;
          const itemProgressRatio = getProgressRatio(item.completedQuantity, item.targetQuantity);
          return (
            <div className="kds-item-group" key={item.id}>
              <div
                className={`kds-item${hasAllergy ? " allergy" : ""}${isDone ? " done" : ""}${isLast && item.options.length === 0 ? " last" : ""}`}
                onClick={() => !isUpdatingItem && onCycleItem(item.id, item.completedQuantity, item.targetQuantity)}
                role="button"
                tabIndex={0}
                aria-pressed={isDone}
                style={{ "--kds-progress-ratio": itemProgressRatio } as CSSProperties}
                onKeyDown={(e) => handleItemKeyDown(e, isUpdatingItem, () => (
                  onCycleItem(item.id, item.completedQuantity, item.targetQuantity)
                ))}
              >
                <span className="kds-item-qty">{item.quantity}</span>
                <div className="kds-item-content">
                  <span className="kds-item-name">{item.name}</span>
                </div>
                {hasAllergy && !isDone ? (
                  <span className="kds-item-flag allergy" aria-label="알레르기 주의" title="알레르기 주의">
                    <TriangleAlert size={12} aria-hidden="true" />
                  </span>
                ) : isDone ? (
                  <span className="kds-item-flag done" aria-label="완료">
                    <Check size={12} aria-hidden="true" />
                  </span>
                ) : null}
              </div>
              {item.options.map((option, optionIndex) => {
                const isOptionDone = option.done;
                const isUpdatingOption = updatingItemId === `option:${item.id}:${optionIndex}`;
                const optionProgressRatio = getProgressRatio(option.completedQuantity, option.targetQuantity);
                return (
                  <div
                    key={option.id}
                    className={`kds-item kds-item--option${isOptionDone ? " done" : ""}${isLast && optionIndex === item.options.length - 1 ? " last" : ""}`}
                    onClick={() => !isUpdatingOption && (
                      onCycleItemOption(item.id, optionIndex, option.completedQuantity, option.targetQuantity)
                    )}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isOptionDone}
                    style={{ "--kds-progress-ratio": optionProgressRatio } as CSSProperties}
                    onKeyDown={(e) => handleItemKeyDown(e, isUpdatingOption, () => (
                      onCycleItemOption(item.id, optionIndex, option.completedQuantity, option.targetQuantity)
                    ))}
                  >
                    <span className="kds-item-qty" aria-hidden="true" />
                    <div className="kds-item-content">
                      <span className="kds-item-name">{option.label}</span>
                    </div>
                    {isOptionDone ? (
                      <span className="kds-item-flag done" aria-label="완료">
                        <Check size={12} aria-hidden="true" />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <RequestPanel analysis={order.aiAnalysis} customerRequest={order.customer_request} />

      {order.status === "NEW" ? (
        <button
          className="kds-action-btn start"
          disabled={updating}
          onClick={() => void onUpdateStatus(order.id, "COOKING")}
          type="button"
        >
          {updating ? "변경중…" : "조리 시작"}
        </button>
      ) : order.status === "COOKING" ? (
        <button
          className="kds-action-btn complete"
          disabled={updating}
          onClick={() => void onUpdateStatus(order.id, "DONE")}
          type="button"
        >
          {updating ? "변경중…" : "완료"}
        </button>
      ) : null}
    </article>
  );
}

function getProgressRatio(completedQuantity: number, targetQuantity: number) {
  if (targetQuantity <= 0) return 0;
  return Math.max(0, Math.min(completedQuantity / targetQuantity, 1));
}
