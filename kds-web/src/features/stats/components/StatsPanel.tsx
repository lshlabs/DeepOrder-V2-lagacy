import type { Order } from "@/features/orders";

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
  const totalRevenue = todayOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (item.total_price ?? 0), 0), 0);
  const completionRate = todayOrders.length > 0 ? Math.round((doneToday.length / todayOrders.length) * 100) : 0;

  const menuMap = new Map<string, number>();
  todayOrders.forEach((order) => {
    order.items.forEach((item) => {
      menuMap.set(item.name, (menuMap.get(item.name) ?? 0) + item.quantity);
    });
  });
  const sortedMenus = Array.from(menuMap.entries()).sort((left, right) => right[1] - left[1]);
  const maxCount = sortedMenus[0]?.[1] ?? 1;

  return (
    <section className="kds-panel kds-panel--stats" aria-label="통계">
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">오늘 통계</h2>
          <p className="kds-panel-subtitle">{todayStr}</p>
        </div>
      </div>

      <div className="kds-metric-strip">
        <div className="kds-metric">
          <span className="kds-metric-value">{todayOrders.length}</span>
          <span className="kds-metric-label">총 주문</span>
        </div>
        <div className="kds-metric-divider" />
        <div className="kds-metric">
          <span className="kds-metric-value accent">{doneToday.length}</span>
          <span className="kds-metric-label">완료</span>
        </div>
        <div className="kds-metric-divider" />
        <div className="kds-metric">
          <span className="kds-metric-value">{completionRate}%</span>
          <span className="kds-metric-label">완료율</span>
        </div>
        <div className="kds-metric-divider" />
        <div className="kds-metric">
          <span className="kds-metric-value">{totalRevenue > 0 ? `${totalRevenue.toLocaleString()}원` : "-"}</span>
          <span className="kds-metric-label">매출</span>
        </div>
      </div>

      <div className="kds-section-divider">
        <span className="kds-section-label">메뉴별 주문 수</span>
      </div>

      {sortedMenus.length === 0 ? (
        <p className="kds-panel-empty">오늘 주문된 메뉴가 없습니다.</p>
      ) : (
        <div className="kds-menu-stat-list">
          {sortedMenus.map(([name, count]) => (
            <div className="kds-menu-stat-row" key={name}>
              <span className="kds-menu-stat-name">{name}</span>
              <div className="kds-menu-stat-bar-wrap">
                <div className="kds-menu-stat-bar" style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
              </div>
              <span className="kds-menu-stat-count">{count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
