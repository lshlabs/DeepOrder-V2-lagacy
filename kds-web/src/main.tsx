import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type OrderStatus = "NEW" | "COOKING" | "DONE" | "CANCELLED";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  options: string[];
  unit_price: number | null;
  total_price: number | null;
};

type Order = {
  id: number;
  platform: string;
  store_id: string;
  external_order_id: string;
  order_number: string;
  status: OrderStatus;
  customer_request: string | null;
  delivery_request: string | null;
  ordered_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};

type KdsOrdersResponse = {
  orders: Order[];
};

const API_URL = import.meta.env.VITE_DEEPORDER_API_URL ?? "http://127.0.0.1:8000";
const STORE_ID = import.meta.env.VITE_STORE_ID ?? "STORE_001";
const POLLING_INTERVAL_MS = 3000;
const columns: Array<{ status: OrderStatus; title: string }> = [
  { status: "NEW", title: "신규" },
  { status: "COOKING", title: "조리중" },
  { status: "DONE", title: "완료" },
];

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/kds/orders?storeId=${encodeURIComponent(STORE_ID)}`,
      );
      if (!response.ok) {
        throw new Error(`주문 목록 요청 실패: ${response.status}`);
      }
      const data = (await response.json()) as KdsOrdersResponse;
      setOrders(data.orders);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "주문 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const pollingTimer = window.setInterval(fetchOrders, POLLING_INTERVAL_MS);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearInterval(pollingTimer);
      window.clearInterval(clockTimer);
    };
  }, [fetchOrders]);

  const counts = useMemo(
    () => ({
      NEW: orders.filter((order) => order.status === "NEW").length,
      COOKING: orders.filter((order) => order.status === "COOKING").length,
      DONE: orders.filter((order) => order.status === "DONE").length,
    }),
    [orders],
  );

  async function updateOrderStatus(orderId: number, status: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error(`상태 변경 실패: ${response.status}`);
      }
      await fetchOrders();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "주문 상태를 변경하지 못했습니다.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <main className="kds-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">STORE {STORE_ID}</p>
          <h1>DeepOrder KDS</h1>
        </div>
        <div className="status-strip" aria-label="주문 현황">
          <StatusStat label="신규" value={counts.NEW} tone="new" />
          <StatusStat label="조리중" value={counts.COOKING} tone="cooking" />
          <StatusStat label="완료" value={counts.DONE} tone="done" />
        </div>
      </header>

      {errorMessage ? <div className="banner error">{errorMessage}</div> : null}
      {loading ? <div className="banner">주문 목록을 불러오는 중입니다.</div> : null}

      <section className="board" aria-label="KDS 주문 보드">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);
          return (
            <section className="order-column" key={column.status}>
              <div className={`column-header ${column.status.toLowerCase()}`}>
                <h2>{column.title}</h2>
                <span>{columnOrders.length}</span>
              </div>
              <div className="cards">
                {columnOrders.length === 0 ? (
                  <div className="empty-state">대기 주문 없음</div>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      now={now}
                      order={order}
                      updating={updatingOrderId === order.id}
                      onUpdateStatus={updateOrderStatus}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}

function StatusStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "new" | "cooking" | "done";
}) {
  return (
    <div className={`status-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OrderCard({
  now,
  order,
  updating,
  onUpdateStatus,
}: {
  now: number;
  order: Order;
  updating: boolean;
  onUpdateStatus: (orderId: number, status: OrderStatus) => Promise<void>;
}) {
  const elapsed = formatElapsed(now, order.ordered_at ?? order.created_at);
  const total = order.items.reduce((sum, item) => sum + (item.total_price ?? 0), 0);

  return (
    <article className={`order-card ${order.status.toLowerCase()}`}>
      <div className="card-head">
        <div>
          <p className="platform">{order.platform}</p>
          <h3>{order.order_number}</h3>
        </div>
        <span className="elapsed">{elapsed}</span>
      </div>

      <div className="items">
        {order.items.map((item) => (
          <div className="item-row" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              {item.options.length > 0 ? <p>{item.options.join(" / ")}</p> : null}
            </div>
            <span>{item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="request-grid">
        <RequestBlock title="고객 요청" value={order.customer_request} />
        <RequestBlock title="배달 요청" value={order.delivery_request} />
      </div>

      <div className="ai-placeholder">
        <span>AI 분석</span>
        <p>분석 결과 영역</p>
      </div>

      <div className="card-foot">
        <span>{total > 0 ? `${total.toLocaleString("ko-KR")}원` : "금액 정보 없음"}</span>
        {order.status === "NEW" ? (
          <button disabled={updating} onClick={() => onUpdateStatus(order.id, "COOKING")}>
            {updating ? "변경중" : "조리 시작"}
          </button>
        ) : null}
        {order.status === "COOKING" ? (
          <button disabled={updating} onClick={() => onUpdateStatus(order.id, "DONE")}>
            {updating ? "변경중" : "완료"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function RequestBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="request-block">
      <span>{title}</span>
      <p>{value?.trim() || "없음"}</p>
    </div>
  );
}

function formatElapsed(now: number, timestamp: string) {
  const start = parseApiTimestamp(timestamp).getTime();
  if (Number.isNaN(start)) {
    return "-";
  }

  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  if (seconds < 60) {
    return `${seconds}초`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}시간`;
}

function parseApiTimestamp(timestamp: string) {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(timestamp)) {
    return new Date(timestamp);
  }
  return new Date(`${timestamp}Z`);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
