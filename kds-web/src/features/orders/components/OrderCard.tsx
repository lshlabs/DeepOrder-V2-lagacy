import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { AlarmClock, Check, Pin, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

import { getAllergyRiskItemIds } from "../lib/analysisHelpers";
import {
  formatElapsedLabel,
  formatOrderCardTime,
  getElapsedMinutes,
  getOrderTypeLabel,
} from "../lib/orderFormatters";
import type { Order, OrderStatus } from "../../../types";
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

// Platform badge styles
const platformBadgeStyles: Record<string, string> = {
  delivery: "bg-orange-500/10 text-[var(--color-accent)]",
  takeout:  "bg-indigo-400/10 text-indigo-400",
  dine:     "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
};

function getPlatformKey(platform: string) {
  const n = platform?.toLowerCase() ?? "";
  if (n.includes("delivery") || n.includes("배달")) return "delivery";
  if (n.includes("takeout") || n.includes("포장") || n.includes("take")) return "takeout";
  return "dine";
}

function getProgressRatio(completedQuantity: number, targetQuantity: number) {
  if (targetQuantity <= 0) return 0;
  return Math.max(0, Math.min(completedQuantity / targetQuantity, 1));
}

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
  const platformKey = getPlatformKey(order.platform);

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
      ref={cardRef}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border transition-colors duration-150",
        order.status === "DONE" ? "opacity-60" : "",
        pinned
          ? "border-[var(--color-accent-border)]"
          : "border-[var(--color-border)]",
        "bg-[var(--color-surface)]",
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {/* Card header */}
      <div className={cn(
        "flex items-center justify-between border-b px-3 py-2.5",
        pinned
          ? "border-[var(--color-accent-border)] bg-[var(--color-accent-subtle)]"
          : "border-[var(--color-border)]",
      )}>
        <div className="flex items-center gap-2">
          {pinned ? (
            <span
              aria-label="고정된 주문"
              title="고정된 주문"
              className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-accent-border)] bg-[var(--color-surface)] text-[var(--color-accent)]"
            >
              <Pin size={13} aria-hidden="true" />
            </span>
          ) : null}
          <span className="text-[20px] font-extrabold leading-none tracking-[-0.5px] text-[var(--color-text)]">
            #{order.order_number ?? order.id}
          </span>
          <span className={cn(
            "inline-flex items-center gap-[3px] text-[11px] font-semibold",
            isUrgent
              ? "text-[var(--color-red)]"
              : isWarning
                ? "text-[var(--color-amber)]"
                : "text-[var(--color-text-muted)]",
          )}>
            <AlarmClock size={11} aria-hidden="true" />
            {elapsedLabel ? `${orderedTime} · ${elapsedLabel}` : orderedTime}
          </span>
        </div>
        <span className={cn(
          "rounded-[var(--radius-sm)] px-[7px] py-0.5 text-[11px] font-bold",
          platformBadgeStyles[platformKey],
        )}>
          {orderTypeLabel}
        </span>
      </div>

      {/* Item rows */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {order.items.map((item, idx) => {
          const isDone = item.done;
          const isLast = idx === order.items.length - 1;
          const hasAllergy = allergyRiskItemIds.has(item.id);
          const isUpdatingItem = updatingItemId === `item:${item.id}`;
          const progressRatio = getProgressRatio(item.completedQuantity, item.targetQuantity);

          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col",
                !isLast || item.options.length > 0 ? "border-b border-[var(--color-border)]" : "",
              )}
            >
              {/* Item row */}
              <div
                className={cn(
                  "relative flex cursor-pointer select-none items-start px-3 py-[9px] transition-[background] duration-100",
                  hasAllergy && !isDone ? "bg-red-600/6" : isDone ? "bg-green-500/5" : "bg-[var(--color-surface)]",
                  !isDone && "hover:bg-[var(--color-surface-2)]",
                  isDone && "hover:bg-green-500/8",
                )}
                style={{
                  background: `linear-gradient(to right, rgba(34,197,94,0.12) ${progressRatio * 100}%, transparent ${progressRatio * 100}%)${hasAllergy && !isDone ? ", rgba(220,38,38,0.06)" : isDone ? ", rgba(34,197,94,0.05)" : ", var(--color-surface)"}`,
                } as CSSProperties}
                onClick={() => !isUpdatingItem && onCycleItem(item.id, item.completedQuantity, item.targetQuantity)}
                role="button"
                tabIndex={0}
                aria-pressed={isDone}
                onKeyDown={(e) => handleItemKeyDown(e, isUpdatingItem, () =>
                  onCycleItem(item.id, item.completedQuantity, item.targetQuantity),
                )}
              >
                <span className={cn(
                  "min-w-[24px] shrink-0 pt-px text-[13px] font-bold",
                  isDone ? "text-green-600 opacity-80" : "text-[var(--color-text-muted)]",
                )}>
                  {item.quantity}
                </span>
                <div className="flex flex-1 flex-col gap-0.5 pl-1">
                  <span className={cn(
                    "text-[14px] font-semibold leading-[1.3]",
                    isDone
                      ? "text-green-600 opacity-80 line-through"
                      : "text-[var(--color-text)]",
                  )}>
                    {item.name}
                  </span>
                </div>
                {hasAllergy && !isDone ? (
                  <span
                    aria-label="알레르기 주의"
                    title="알레르기 주의"
                    className="ml-1 flex shrink-0 items-center justify-center pt-0.5 text-red-500"
                  >
                    <TriangleAlert size={12} aria-hidden="true" />
                  </span>
                ) : isDone ? (
                  <span aria-label="완료" className="ml-1 flex shrink-0 items-center justify-center pt-0.5 text-green-600">
                    <Check size={12} aria-hidden="true" />
                  </span>
                ) : null}
              </div>

              {/* Option rows */}
              {item.options.map((option, optionIndex) => {
                const isOptionDone = option.done;
                const isUpdatingOption = updatingItemId === `option:${item.id}:${optionIndex}`;
                const optProgressRatio = getProgressRatio(option.completedQuantity, option.targetQuantity);
                const isLastOption = optionIndex === item.options.length - 1;

                return (
                  <div
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer select-none items-start py-[9px] pl-6 pr-3 transition-[background] duration-100",
                      !isLast || !isLastOption ? "border-b border-[var(--color-border)]" : "",
                      isOptionDone ? "bg-green-500/5 hover:bg-green-500/8" : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]",
                    )}
                    style={{
                      background: `linear-gradient(to right, rgba(34,197,94,0.12) ${optProgressRatio * 100}%, transparent ${optProgressRatio * 100}%)${isOptionDone ? ", rgba(34,197,94,0.05)" : ", var(--color-surface)"}`,
                    } as CSSProperties}
                    onClick={() => !isUpdatingOption && onCycleItemOption(
                      item.id, optionIndex, option.completedQuantity, option.targetQuantity,
                    )}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isOptionDone}
                    onKeyDown={(e) => handleItemKeyDown(e, isUpdatingOption, () =>
                      onCycleItemOption(item.id, optionIndex, option.completedQuantity, option.targetQuantity),
                    )}
                  >
                    <span className="min-w-[24px] shrink-0" aria-hidden="true" />
                    <div className="flex flex-1 flex-col pl-1">
                      <span className={cn(
                        "text-[13px] font-medium",
                        isOptionDone
                          ? "text-green-600 opacity-80 line-through"
                          : "text-[var(--color-text-subtle)]",
                        "before:mr-1.5 before:text-[10px] before:opacity-55 before:text-[var(--color-text-muted)] before:content-['└']",
                      )}>
                        {option.label}
                      </span>
                    </div>
                    {isOptionDone ? (
                      <span aria-label="완료" className="ml-1 flex shrink-0 items-center justify-center pt-0.5 text-green-600">
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

      {/* Request panel */}
      <RequestPanel analysis={order.aiAnalysis} customerRequest={order.customer_request} />

      {/* Action button */}
      {order.status === "NEW" ? (
        <button
          type="button"
          disabled={updating}
          onClick={() => void onUpdateStatus(order.id, "COOKING")}
          className="mt-auto h-[44px] w-full border-t-0 bg-green-600 text-[13px] font-bold tracking-[-0.1px] text-white hover:bg-green-700 disabled:opacity-60"
        >
          {updating ? "변경중…" : "조리 시작"}
        </button>
      ) : order.status === "COOKING" ? (
        <button
          type="button"
          disabled={updating}
          onClick={() => void onUpdateStatus(order.id, "DONE")}
          className="mt-auto h-[44px] w-full border-t-0 bg-[var(--color-accent)] text-[13px] font-bold tracking-[-0.1px] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {updating ? "변경중…" : "완료"}
        </button>
      ) : null}
    </article>
  );
}
