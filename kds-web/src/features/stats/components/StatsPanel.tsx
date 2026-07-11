import type { Order } from "@/lib/types";

type StatsPanelProps = {
  orders: Order[];
};

export function StatsPanel({ orders }: StatsPanelProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayOrders = orders.filter((order) => {
    const timestamp = order.ordered_at ?? order.created_at;
    return timestamp.startsWith(todayStr);
  });

  const doneToday = todayOrders.filter((order) => order.status === "DONE");
  const totalRevenue = todayOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + (item.total_price ?? 0), 0),
    0,
  );
  const completionRate =
    todayOrders.length > 0
      ? Math.round((doneToday.length / todayOrders.length) * 100)
      : 0;

  const menuMap = new Map<string, number>();
  todayOrders.forEach((order) => {
    order.items.forEach((item) => {
      menuMap.set(item.name, (menuMap.get(item.name) ?? 0) + item.quantity);
    });
  });
  const sortedMenus = Array.from(menuMap.entries()).sort(
    (left, right) => right[1] - left[1],
  );
  const maxCount = sortedMenus[0]?.[1] ?? 1;

  return (
    <section
      className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-label="통계"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-700 leading-snug text-[var(--color-text)]">
            오늘 통계
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{todayStr}</p>
        </div>
      </div>

      {/* Metric strip */}
      <div className="flex flex-wrap border-b border-[var(--color-border)] md:flex-nowrap">
        <MetricCell label="총 주문" value={String(todayOrders.length)} />
        <div className="hidden w-px shrink-0 bg-[var(--color-border)] my-3.5 md:block" />
        <MetricCell label="완료" value={String(doneToday.length)} accent />
        <div className="hidden w-px shrink-0 bg-[var(--color-border)] my-3.5 md:block" />
        <MetricCell label="완료율" value={`${completionRate}%`} />
        <div className="hidden w-px shrink-0 bg-[var(--color-border)] my-3.5 md:block" />
        <MetricCell
          label="매출"
          value={totalRevenue > 0 ? `${totalRevenue.toLocaleString()}원` : "-"}
        />
      </div>

      {/* Section divider */}
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="text-[11px] font-600 uppercase tracking-wider text-[var(--color-text-muted)]">
          메뉴별 주문 수
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Menu bar chart */}
      {sortedMenus.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-[var(--color-text-muted)]">
          오늘 주문된 메뉴가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-[9px] px-5 pb-5">
          {sortedMenus.map(([name, count]) => (
            <div
              key={name}
              className="grid items-center gap-2.5"
              style={{ gridTemplateColumns: "140px 1fr 28px" }}
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-500 text-[var(--color-text)]">
                {name}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                <div
                  className="h-full min-w-[3px] rounded-full bg-[var(--color-accent)] transition-[width] duration-300 ease-in-out"
                  style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="text-right text-[12px] font-600 text-[var(--color-text-muted)]">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricCell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-1 basis-1/2 flex-col gap-[3px] px-3 py-3.5 md:basis-auto">
      <span
        className={
          "text-[28px] font-800 leading-none tracking-[-0.5px] " +
          (accent ? "text-[var(--color-accent)]" : "text-[var(--color-text)]")
        }
      >
        {value}
      </span>
      <span className="text-[11px] font-500 text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
