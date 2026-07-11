import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { ArrowDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { buildOrderLayoutColumns } from "../lib/orderLayout";
import type { Order, OrderStatus } from "@/lib/types";
import { OrderCard } from "./OrderCard";

type OrderBoardProps = {
  orders: Order[];
  pinnedOrderIds: number[];
  loading: boolean;
  newOrderSignal: number;
  now: number;
  refreshing: boolean;
  updatingOrderId: number | null;
  updatingItemId: string | null;
  emptyMessage: string;
  onRefresh: () => Promise<void>;
  onUpdateStatus: (orderId: number, status: OrderStatus) => Promise<void>;
  onCycleItem: (itemId: number, completedQuantity: number, targetQuantity: number) => Promise<void>;
  onCycleItemOption: (
    itemId: number,
    optionIndex: number,
    completedQuantity: number,
    targetQuantity: number,
  ) => Promise<void>;
  onOpenContextMenu: (orderId: number, x: number, y: number) => void;
};

const PULL_TO_REFRESH_THRESHOLD = 56;
const PULL_TO_REFRESH_MAX = 64;
const PULL_TO_REFRESH_REFRESHING_HEIGHT = 36;

type PullPhase = "idle" | "pulling" | "ready" | "refreshing" | "done";

export function OrderBoard({
  orders,
  pinnedOrderIds,
  loading,
  newOrderSignal,
  now,
  refreshing,
  updatingOrderId,
  updatingItemId,
  emptyMessage,
  onRefresh,
  onUpdateStatus,
  onCycleItem,
  onCycleItemOption,
  onOpenContextMenu,
}: OrderBoardProps) {
  const laneRef = useRef<HTMLDivElement>(null);
  const pullStartYRef = useRef<number | null>(null);
  const pullActiveRef = useRef(false);
  const pullDraggingRef = useRef(false);
  const [laneHeight, setLaneHeight] = useState(0);
  const [orderCardHeights, setOrderCardHeights] = useState<Record<number, number>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [pullPhase, setPullPhase] = useState<PullPhase>("idle");

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const updateIsMobile = () => setIsMobile(mobileQuery.matches);
    updateIsMobile();
    mobileQuery.addEventListener("change", updateIsMobile);
    return () => mobileQuery.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    const laneEl = laneRef.current;
    if (!laneEl) return;
    const updateLaneHeight = () => setLaneHeight(laneEl.clientHeight);
    updateLaneHeight();
    const observer = new ResizeObserver(() => updateLaneHeight());
    observer.observe(laneEl);
    return () => observer.disconnect();
  }, [orders]);

  useEffect(() => {
    const laneEl = laneRef.current;
    if (!laneEl) return;
    const blockPullScroll = (event: TouchEvent) => {
      if (pullDraggingRef.current) {
        event.preventDefault();
      }
    };
    laneEl.addEventListener("touchmove", blockPullScroll, { passive: false });
    return () => laneEl.removeEventListener("touchmove", blockPullScroll);
  }, [orders]);

  useEffect(() => {
    if (newOrderSignal === 0 || refreshing || pullActiveRef.current || pullDraggingRef.current) return;
    const laneEl = laneRef.current;
    if (!laneEl) return;
    if (isMobile) {
      laneEl.scrollTop = 0;
    } else {
      laneEl.scrollLeft = 0;
    }
  }, [isMobile, newOrderSignal, refreshing]);

  const orderLayoutColumns = useMemo(
    () => buildOrderLayoutColumns(orders, orderCardHeights, laneHeight),
    [orders, orderCardHeights, laneHeight],
  );
  const pinnedOrderIdSet = useMemo(() => new Set(pinnedOrderIds), [pinnedOrderIds]);
  const renderedColumns = isMobile ? [{ width: "base" as const, orders }] : orderLayoutColumns;
  const displayPullPhase: PullPhase = refreshing && isMobile ? "refreshing" : pullPhase;
  const isPullActive = displayPullPhase !== "idle";
  const pullIndicatorHeight =
    displayPullPhase === "refreshing" || displayPullPhase === "done"
      ? PULL_TO_REFRESH_REFRESHING_HEIGHT
      : pullOffset;
  const pullProgress = Math.min(pullOffset / PULL_TO_REFRESH_THRESHOLD, 1);

  function resetPullState() {
    pullActiveRef.current = false;
    pullDraggingRef.current = false;
    pullStartYRef.current = null;
    setPullOffset(0);
    setPullPhase("idle");
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (!isMobile || loading || refreshing) return;
    const laneEl = laneRef.current;
    if (!laneEl || laneEl.scrollTop > 0) return;
    pullActiveRef.current = true;
    pullDraggingRef.current = false;
    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    setPullPhase("idle");
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (!pullActiveRef.current || pullStartYRef.current === null || loading || refreshing) return;
    const laneEl = laneRef.current;
    if (!laneEl || laneEl.scrollTop > 0) {
      resetPullState();
      return;
    }

    const deltaY = (event.touches[0]?.clientY ?? 0) - pullStartYRef.current;
    if (deltaY <= 0) {
      pullDraggingRef.current = false;
      setPullOffset(0);
      setPullPhase("idle");
      return;
    }

    const nextOffset = Math.min(deltaY * 0.35, PULL_TO_REFRESH_MAX);
    pullDraggingRef.current = true;
    if (event.cancelable) {
      event.preventDefault();
    }
    setPullOffset(nextOffset);
    setPullPhase(nextOffset >= PULL_TO_REFRESH_THRESHOLD ? "ready" : "pulling");
  }

  function handleTouchEnd() {
    if (!pullActiveRef.current) return;
    const shouldRefresh = isMobile && pullOffset >= PULL_TO_REFRESH_THRESHOLD && !loading && !refreshing;
    if (shouldRefresh) {
      pullActiveRef.current = false;
      pullDraggingRef.current = false;
      pullStartYRef.current = null;
      setPullOffset(PULL_TO_REFRESH_REFRESHING_HEIGHT);
      setPullPhase("refreshing");
      void onRefresh().finally(() => {
        setPullPhase("done");
        window.setTimeout(resetPullState, 500);
      });
    } else {
      resetPullState();
    }
  }

  function renderPullIndicatorIcon() {
    if (displayPullPhase === "done") {
      return <Check size={14} strokeWidth={2} />;
    }
    if (displayPullPhase === "refreshing") {
      return <Loader2 className="animate-spin" size={14} strokeWidth={1.75} />;
    }
    return (
      <ArrowDown
        size={14}
        strokeWidth={1.75}
        style={{
          opacity: 0.2 + pullProgress * 0.8,
          transform: displayPullPhase === "ready" ? "rotate(180deg)" : undefined,
          transition: "opacity 0.1s ease, transform 0.15s ease",
        }}
      />
    );
  }

  return (
    <section
      aria-label="주문 보드"
      className={cn(
        "relative flex-1 overflow-hidden p-2.5 md:p-[14px_16px]",
        isPullActive && "overflow-hidden",
      )}
      onTouchCancel={handleTouchEnd}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
    >
      {/* Pull-to-refresh indicator — mobile only */}
      {isMobile ? (
        <div
          aria-hidden={!isPullActive}
          className={cn(
            "pointer-events-none absolute inset-x-2.5 top-0 z-0 flex items-center justify-center overflow-hidden",
            "text-[var(--color-text-muted)] transition-[height,opacity] duration-[250ms,200ms] ease-[cubic-bezier(0.25,1,0.5,1),ease]",
            isPullActive ? "opacity-100" : "opacity-0",
            // disable transition while user is actively pulling
            (displayPullPhase === "pulling" || displayPullPhase === "ready") && "[transition:none]",
          )}
          style={{ height: `${pullIndicatorHeight}px` }}
        >
          <span className="grid h-5 w-5 place-items-center">
            {renderPullIndicatorIcon()}
          </span>
        </div>
      ) : null}

      {orders.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center text-[13px] text-[var(--color-text-muted)] md:h-[calc(100vh-110px)]">
          {loading ? "주문을 불러오는 중…" : emptyMessage}
        </div>
      ) : (
        <div
          ref={laneRef}
          className={cn(
            // mobile: vertical scroll, with pull-distance offset applied via inline style
            "relative z-[1] flex h-full flex-col gap-2.5 overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            // desktop: horizontal scroll
            "md:static md:flex-row md:overflow-x-auto md:overflow-y-hidden md:overscroll-y-auto md:pb-2.5 md:[scroll-snap-type:x_proximity]",
            // disable lane transition while pulling
            (displayPullPhase === "pulling" || displayPullPhase === "ready") && "![transition:none]",
          )}
          style={
            isMobile && pullOffset > 0
              ? { transform: `translateY(${pullOffset}px)`, transition: "none" }
              : isMobile
                ? { transform: "translateY(0)", transition: "transform 0.3s cubic-bezier(0.25,1,0.5,1)" }
                : undefined
          }
        >
          {renderedColumns.map((column) => (
            <div
              key={`${column.width}-${column.orders.map((o) => o.id).join("-")}`}
              className={cn(
                "flex shrink-0 flex-col gap-2.5 scroll-snap-align-start w-full",
                "md:w-auto md:flex-[0_0_280px]",
                column.width === "wide" && "md:flex-[0_0_320px]",
                column.width === "xwide" && "md:flex-[0_0_384px]",
                "lg:flex-[0_0_280px]",
                column.width === "wide" && "lg:flex-[0_0_360px]",
                column.width === "xwide" && "lg:flex-[0_0_440px]",
              )}
            >
              {column.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  now={now}
                  onContextMenu={onOpenContextMenu}
                  onHeightChange={(height) => {
                    setOrderCardHeights((prev) =>
                      prev[order.id] === height ? prev : { ...prev, [order.id]: height },
                    );
                  }}
                  onCycleItem={onCycleItem}
                  onCycleItemOption={onCycleItemOption}
                  onUpdateStatus={onUpdateStatus}
                  order={order}
                  pinned={pinnedOrderIdSet.has(order.id)}
                  updatingItemId={updatingItemId}
                  updating={updatingOrderId === order.id}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
