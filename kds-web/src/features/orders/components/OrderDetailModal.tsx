import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  formatDeliveryAddress,
  formatDetailTime,
  getOrderTypeLabel,
} from "../lib/orderFormatters";
import type { Order } from "@/lib/types";

type OrderDetailModalProps = {
  order: Order | null;
  onClose: () => void;
};

export function OrderDetailModal({
  order,
  onClose,
}: OrderDetailModalProps) {
  if (!order) return null;

  const totalAmount = order.items.reduce((sum, item) => sum + (item.total_price ?? 0), 0);
  const orderedTime = order.ordered_at
    ? formatDetailTime(order.ordered_at)
    : formatDetailTime(order.created_at);
  const platformLabel = getOrderTypeLabel(order.platform);
  const deliveryAddress = formatDeliveryAddress(order);

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--color-border)] px-[18px] py-[14px]">
          <DialogTitle className="text-[15px] font-bold tracking-[-0.2px] text-[var(--color-text)]">
            주문 #{order.order_number ?? order.id}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* Summary row */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] pb-3.5 text-[13px] text-[var(--color-text-muted)]">
            <span>{orderedTime}</span>
            <span aria-hidden="true">·</span>
            <span>{platformLabel}</span>
            {totalAmount > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <strong className="text-[14px] font-bold text-[var(--color-text)]">
                  {totalAmount.toLocaleString()}원
                </strong>
              </>
            ) : null}
          </div>

          {/* Menu items */}
          <section aria-labelledby="detail-menu-title" className="pt-0">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span id="detail-menu-title" className="text-[13px] font-bold tracking-[-0.02em] text-[var(--color-text)]">
                주문 메뉴
              </span>
              <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">
                {order.items.length}개
              </span>
            </div>
            <div className="flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-col">
                  <div className="flex items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4 last:border-b-0">
                    <span className="min-w-[18px] shrink-0 pt-0.5 text-base font-bold leading-snug text-[var(--color-text)]">
                      {item.quantity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold leading-[1.35] text-[var(--color-text)]">
                        {item.name}
                      </div>
                    </div>
                    {item.total_price ? (
                      <span className="ml-auto whitespace-nowrap text-[14px] font-semibold text-[var(--color-text-subtle)]">
                        {item.total_price.toLocaleString()}원
                      </span>
                    ) : null}
                  </div>
                  {item.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-start gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-[34px] pr-4 last:border-b-0"
                    >
                      <span className="min-w-[18px] shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[var(--color-text-subtle)] before:mr-1.5 before:text-[10px] before:opacity-55 before:text-[var(--color-text-muted)] before:content-['└']">
                          {option.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Customer request */}
          <section aria-labelledby="detail-request-title">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span id="detail-request-title" className="text-[13px] font-bold tracking-[-0.02em] text-[var(--color-text)]">
                요청사항
              </span>
            </div>
            <p className={[
              "rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3.5",
              "text-[13px] leading-relaxed",
              order.customer_request
                ? "text-[var(--color-text)]"
                : "text-[var(--color-text-muted)]",
            ].join(" ")}>
              {order.customer_request?.trim() || "없음"}
            </p>
          </section>

          {/* Delivery request */}
          {order.delivery_request ? (
            <section aria-labelledby="detail-delivery-request-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span id="detail-delivery-request-title" className="text-[13px] font-bold tracking-[-0.02em] text-[var(--color-text)]">
                  배달 요청
                </span>
              </div>
              <p className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--color-text)]">
                {order.delivery_request}
              </p>
            </section>
          ) : null}

          {/* Delivery info */}
          <section aria-labelledby="detail-delivery-title">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span id="detail-delivery-title" className="text-[13px] font-bold tracking-[-0.02em] text-[var(--color-text)]">
                배송 정보
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2.5 border-b border-[var(--color-border)] py-3">
                <span className="w-[72px] shrink-0 text-[12px] font-semibold text-[var(--color-text-muted)]">주소</span>
                <strong className="break-words text-right text-[13px] font-semibold text-[var(--color-text)]">
                  {deliveryAddress}
                </strong>
              </div>
              <div className="flex items-baseline justify-between gap-2.5 py-3">
                <span className="w-[72px] shrink-0 text-[12px] font-semibold text-[var(--color-text-muted)]">연락처</span>
                <strong className="break-words text-right text-[13px] font-semibold text-[var(--color-text)]">
                  {order.deliveryPhone ?? "-"}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
