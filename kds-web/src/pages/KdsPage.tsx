import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TimePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import {
  AlarmClock,
  BarChart2,
  Check,
  ClipboardList,
  ClockArrowDown,
  ClockArrowUp,
  Info,
  LogOut,
  Menu,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";

import {
  ApiError,
  apiArchiveCompletedOrders,
  apiChangePassword,
  apiCreateAssignedMenu,
  apiCreateStaff,
  apiDeleteAssignedMenu,
  apiGetAssignedMenus,
  apiGetKdsOrders,
  apiGetKdsSettings,
  apiGetStaff,
  apiGetStoreContext,
  apiHideOrder,
  apiUpdateKdsSettings,
  apiUpdateAssignedMenu,
  apiUpdateOrderItemProgress,
  apiUpdateOrderStatus,
  apiUpdateStaff,
  apiUpdateStaffActive,
  apiUpdateStoreStatus,
  apiRegenerateStaffPin,
} from "../lib/api";
import type {
  AnalysisAction,
  AssignedMenu,
  AuthSession,
  KdsStoreContext,
  Order,
  OrderAIAnalysis,
  OrderStatus,
  Staff,
  StoreSettings,
} from "../types";

const POLLING_INTERVAL_MS = 3000;
const ORDER_CARD_STACK_GAP_PX = 10;
const ORDER_CARD_SHORT_RATIO = 0.58;
type BoardTab = "RECEIVED" | "DONE" | "MY_TASKS" | "STATS" | "SETTINGS" | "STAFF";

type StoreStatus = "OPEN" | "PAUSED" | "CLOSED";

type OrderLayoutColumn = {
  orders: Order[];
  width: "base" | "wide" | "xwide";
};

type SoundOption = "none" | "bell" | "chime" | "beep";

type BreaktimeConfig = {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
};

type SettingsState = {
  notificationsEnabled: boolean;
  sound: SoundOption;
  breaktime: BreaktimeConfig;
  autoAccept: boolean;
};

type KdsPageProps = {
  session: AuthSession;
  onLogout: () => Promise<void>;
  onUnauthorized: () => Promise<string | null>;
};

export function KdsPage({ session, onLogout, onUnauthorized }: KdsPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "info" } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<BoardTab>("RECEIVED");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>("OPEN");
  const [storeStatusPopup, setStoreStatusPopup] = useState(false);
  const [pauseMinutes, setPauseMinutes] = useState(10);
  const [storeContext, setStoreContext] = useState<KdsStoreContext | null>(null);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(true);
  const [savingStoreStatus, setSavingStoreStatus] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [assignedMenus, setAssignedMenus] = useState<AssignedMenu[]>([]);
  const [assignedMenusLoading, setAssignedMenusLoading] = useState(true);
  const [assignedMenusSaving, setAssignedMenusSaving] = useState(false);
  const [orderSortDirection, setOrderSortDirection] = useState<"newest-first" | "oldest-first">("newest-first");
  const [contextMenu, setContextMenu] = useState<{ orderId: number; x: number; y: number } | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [removeOrderId, setRemoveOrderId] = useState<number | null>(null);
  const [clearDoneConfirm, setClearDoneConfirm] = useState(false);
  const [hidingOrderId, setHidingOrderId] = useState<number | null>(null);
  const [archivingCompleted, setArchivingCompleted] = useState(false);
  const [updatingOrderItemId, setUpdatingOrderItemId] = useState<number | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    notificationsEnabled: true,
    sound: "bell",
    breaktime: { enabled: false, startHour: 15, startMinute: 0, durationMinutes: 60 },
    autoAccept: false,
  });
  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const [laneHeight, setLaneHeight] = useState(0);
  const [orderCardHeights, setOrderCardHeights] = useState<Record<number, number>>({});

  function showToast(message: string, type: "error" | "info" = "error") {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  }

  const fetchOrders = useCallback(async () => {
    try {
      const data = await requestWithReauth(session.accessToken, onUnauthorized, apiGetKdsOrders);
      setOrders(data.orders);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        showToast("로그인이 만료되었습니다.");
        return;
      }
      showToast(error instanceof Error ? error.message : "주문 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, session.accessToken]);

  const fetchStoreContext = useCallback(async () => {
    const data = await requestWithReauth(session.accessToken, onUnauthorized, apiGetStoreContext);
    setStoreContext(data);
    setStoreStatus(data.operatingStatus);
  }, [onUnauthorized, session.accessToken]);

  const fetchStoreSettings = useCallback(async () => {
    const data = await requestWithReauth(session.accessToken, onUnauthorized, apiGetKdsSettings);
    setSettings(mapApiSettingsToUi(data));
  }, [onUnauthorized, session.accessToken]);

  const fetchAssignedMenus = useCallback(async () => {
    const data = await requestWithReauth(session.accessToken, onUnauthorized, apiGetAssignedMenus);
    setAssignedMenus(data.menus);
  }, [onUnauthorized, session.accessToken]);

  useEffect(() => {
    void Promise.all([
      fetchOrders(),
      fetchStoreContext().catch((error) => {
        showToast(error instanceof Error ? error.message : "매장 상태를 불러오지 못했습니다.");
      }),
      fetchStoreSettings().catch((error) => {
        showToast(error instanceof Error ? error.message : "설정을 불러오지 못했습니다.");
      }),
      fetchAssignedMenus().catch((error) => {
        showToast(error instanceof Error ? error.message : "내 업무 메뉴를 불러오지 못했습니다.");
      }),
    ]).finally(() => {
      setStoreSettingsLoading(false);
      setAssignedMenusLoading(false);
    });
    const pollingTimer = window.setInterval(fetchOrders, POLLING_INTERVAL_MS);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearInterval(pollingTimer);
      window.clearInterval(clockTimer);
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [fetchAssignedMenus, fetchOrders, fetchStoreContext, fetchStoreSettings]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
      const target = event.target as Element;
      if (!target.closest(".kds-context-menu")) {
        setContextMenu(null);
      }
      if (!target.closest(".kds-store-status") && !target.closest(".kds-store-status-popup")) {
        setStoreStatusPopup(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const laneEl = laneRef.current;
    if (!laneEl) return;
    const updateLaneHeight = () => setLaneHeight(laneEl.clientHeight);
    updateLaneHeight();
    const observer = new ResizeObserver(() => updateLaneHeight());
    observer.observe(laneEl);
    return () => observer.disconnect();
  }, [activeTab, orders]);

  async function handleManualRefresh() {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchStoreContext(), fetchStoreSettings(), fetchAssignedMenus()]);
    window.setTimeout(() => setRefreshing(false), 600);
  }

  const boardOrders = useMemo(
    () => orders.filter((order) => !order.hidden && !order.archived),
    [orders],
  );

  function compareOrders(
    leftTimestamp: string | null,
    rightTimestamp: string | null,
    leftId: number,
    rightId: number,
    direction: "newest-first" | "oldest-first",
  ): number {
    const lt = leftTimestamp ? parseApiTimestamp(leftTimestamp).getTime() : 0;
    const rt = rightTimestamp ? parseApiTimestamp(rightTimestamp).getTime() : 0;
    const timeDiff = rt - lt;
    if (timeDiff !== 0) return direction === "newest-first" ? timeDiff : -timeDiff;
    return direction === "newest-first" ? rightId - leftId : leftId - rightId;
  }

  const receivedOrders = useMemo(
    () =>
      boardOrders
        .filter((order) => order.status === "NEW" || order.status === "COOKING")
        .sort((left, right) =>
          compareOrders(
            left.ordered_at ?? left.created_at,
            right.ordered_at ?? right.created_at,
            left.id,
            right.id,
            orderSortDirection,
          ),
        ),
    [boardOrders, orderSortDirection],
  );

  const doneOrders = useMemo(
    () =>
      boardOrders
        .filter((order) => order.status === "DONE")
        .sort((left, right) =>
          compareOrders(left.updated_at, right.updated_at, left.id, right.id, orderSortDirection),
        ),
    [boardOrders, orderSortDirection],
  );

  const counts = useMemo(
    () => ({
      NEW: receivedOrders.filter((order) => order.status === "NEW").length,
      COOKING: receivedOrders.filter((order) => order.status === "COOKING").length,
      DONE: doneOrders.length,
      CANCELLED: boardOrders.filter((order) => order.status === "CANCELLED").length,
    }),
    [boardOrders, doneOrders, receivedOrders],
  );

  async function updateOrderStatus(orderId: number, status: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateOrderStatus(accessToken, orderId, status),
      );
      await fetchOrders();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "주문 상태를 변경하지 못했습니다.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleToggleItemDone(itemId: number, nextDone: boolean) {
    setUpdatingOrderItemId(itemId);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateOrderItemProgress(accessToken, itemId, { done: nextDone }),
      );
      await fetchOrders();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "메뉴 완료 상태를 저장하지 못했습니다.");
    } finally {
      setUpdatingOrderItemId(null);
    }
  }

  async function handleHideOrder(orderId: number) {
    setHidingOrderId(orderId);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiHideOrder(accessToken, orderId),
      );
      setRemoveOrderId(null);
      setContextMenu(null);
      await fetchOrders();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "주문을 숨기지 못했습니다.");
    } finally {
      setHidingOrderId(null);
    }
  }

  async function handleArchiveCompletedOrders() {
    setArchivingCompleted(true);
    try {
      const result = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiArchiveCompletedOrders(accessToken),
      );
      setClearDoneConfirm(false);
      await fetchOrders();
      showToast(
        result.archivedCount > 0 ? `완료 주문 ${result.archivedCount}건을 정리했습니다.` : "정리할 완료 주문이 없습니다.",
        "info",
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "완료 주문을 정리하지 못했습니다.");
    } finally {
      setArchivingCompleted(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setAccountOpen(false);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  async function persistSettings(nextSettings: SettingsState) {
    setSavingSettings(true);
    try {
      const saved = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateKdsSettings(accessToken, mapUiSettingsToApi(nextSettings)),
      );
      setSettings(mapApiSettingsToUi(saved));
    } catch (error) {
      await fetchStoreSettings();
      showToast(error instanceof Error ? error.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSavingSettings(false);
    }
  }

  function updateSettings(partial: Partial<SettingsState>) {
    setSettings((prev) => {
      const next = {
        ...prev,
        ...partial,
      };
      void persistSettings(next);
      return next;
    });
  }

  async function handleChangePassword() {
    const trimmedCurrent = pwCurrent.trim();
    const trimmedNew = pwNew.trim();
    const trimmedConfirm = pwConfirm.trim();

    if (!trimmedCurrent) {
      setPwError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (trimmedNew.length < 8) {
      setPwError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setPwError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setPwSubmitting(true);
    setPwError(null);
    try {
      const result = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiChangePassword(accessToken, {
          currentPassword: trimmedCurrent,
          newPassword: trimmedNew,
        }),
      );
      setPwModal(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      showToast(result.message, "info");
      await onLogout();
    } catch (error) {
      setPwError(error instanceof Error ? error.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setPwSubmitting(false);
    }
  }

  async function handleStoreStatusChange(nextStatus: StoreStatus) {
    setStoreStatus(nextStatus);
    if (nextStatus === "PAUSED") {
      return;
    }
    setSavingStoreStatus(true);
    try {
      const next = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateStoreStatus(accessToken, { operatingStatus: nextStatus }),
      );
      setStoreContext(next);
      setStoreStatus(next.operatingStatus);
      setStoreStatusPopup(false);
    } catch (error) {
      if (storeContext) {
        setStoreStatus(storeContext.operatingStatus);
      }
      showToast(error instanceof Error ? error.message : "매장 상태를 저장하지 못했습니다.");
    } finally {
      setSavingStoreStatus(false);
    }
  }

  async function confirmStoreStatusChange() {
    setSavingStoreStatus(true);
    try {
      const payload = storeStatus === "PAUSED" ? { operatingStatus: storeStatus, pauseMinutes } : { operatingStatus: storeStatus };
      const next = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateStoreStatus(accessToken, payload),
      );
      setStoreContext(next);
      setStoreStatus(next.operatingStatus);
      setStoreStatusPopup(false);
    } catch (error) {
      if (storeContext) {
        setStoreStatus(storeContext.operatingStatus);
      }
      showToast(error instanceof Error ? error.message : "매장 상태를 저장하지 못했습니다.");
    } finally {
      setSavingStoreStatus(false);
    }
  }

  async function createAssignedMenu(menuName: string) {
    setAssignedMenusSaving(true);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiCreateAssignedMenu(accessToken, { menuName }),
      );
      await fetchAssignedMenus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "담당 메뉴를 추가하지 못했습니다.");
      throw error;
    } finally {
      setAssignedMenusSaving(false);
    }
  }

  async function editAssignedMenu(menuId: number, menuName: string) {
    setAssignedMenusSaving(true);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateAssignedMenu(accessToken, menuId, { menuName }),
      );
      await fetchAssignedMenus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "담당 메뉴를 수정하지 못했습니다.");
      throw error;
    } finally {
      setAssignedMenusSaving(false);
    }
  }

  async function removeAssignedMenu(menuId: number) {
    setAssignedMenusSaving(true);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiDeleteAssignedMenu(accessToken, menuId),
      );
      await fetchAssignedMenus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "담당 메뉴를 삭제하지 못했습니다.");
      throw error;
    } finally {
      setAssignedMenusSaving(false);
    }
  }

  const isManager = session.user.accountType !== "EMPLOYEE";
  const activeOrders = activeTab === "RECEIVED" ? receivedOrders : doneOrders;
  const orderLayoutColumns = useMemo(
    () => buildOrderLayoutColumns(activeOrders, orderCardHeights, laneHeight),
    [activeOrders, laneHeight, orderCardHeights],
  );
  const initials = (session.user.name ?? session.store.storeName ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="kds-shell">
      {/* ── Sidebar ── */}
      <nav className={`kds-sidebar${sidebarOpen ? " open" : ""}`} aria-label="메인 내비게이션">
        <button
          aria-label={sidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
          className="kds-sidebar-toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          type="button"
        >
          {sidebarOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          {sidebarOpen && <span className="kds-sidebar-toggle-label">닫기</span>}
        </button>

        <div className="kds-sidebar-nav">
          <button
            className={`kds-sidebar-item${(activeTab === "RECEIVED" || activeTab === "DONE" || activeTab === "MY_TASKS") ? " active" : ""}`}
            onClick={() => { setActiveTab("RECEIVED"); setSidebarOpen(false); }}
            type="button"
            title="업무"
          >
            <ClipboardList size={16} aria-hidden="true" />
            {sidebarOpen && (
              <span>
                업무
                {counts.NEW + counts.COOKING > 0 ? (
                  <em className="kds-sidebar-badge">{counts.NEW + counts.COOKING}</em>
                ) : null}
              </span>
            )}
            {!sidebarOpen && counts.NEW + counts.COOKING > 0 ? (
              <em className="kds-sidebar-dot" aria-hidden="true" />
            ) : null}
          </button>

          {isManager ? (
            <button
              className={`kds-sidebar-item${activeTab === "STAFF" ? " active" : ""}`}
              onClick={() => {
                setActiveTab("STAFF");
                setSidebarOpen(false);
              }}
              type="button"
              title="직원"
            >
              <Users size={16} aria-hidden="true" />
              {sidebarOpen && <span>직원</span>}
            </button>
          ) : null}

          {isManager ? (
            <button
              className={`kds-sidebar-item${activeTab === "STATS" ? " active" : ""}`}
              onClick={() => { setActiveTab("STATS"); setSidebarOpen(false); }}
              type="button"
              title="통계"
            >
              <BarChart2 size={16} aria-hidden="true" />
              {sidebarOpen && <span>통계</span>}
            </button>
          ) : null}

          {isManager ? (
            <button
              className={`kds-sidebar-item${activeTab === "SETTINGS" ? " active" : ""}`}
              onClick={() => { setActiveTab("SETTINGS"); setSidebarOpen(false); }}
              type="button"
              title="설정"
            >
              <Settings size={16} aria-hidden="true" />
              {sidebarOpen && <span>설정</span>}
            </button>
          ) : null}
        </div>

        <div className="kds-sidebar-account" ref={accountRef}>
          {accountOpen ? (
            <div className="kds-account-popover">
              <div className="kds-account-popover-info">
                <div className="kds-account-avatar large">{initials}</div>
                <div>
                  <p className="kds-account-name">{session.user.name ?? session.store.storeName}</p>
                  <p className="kds-account-login-id">{session.user.loginId}</p>
                </div>
              </div>
              <div className="kds-account-popover-divider" />
              <button
                className="kds-account-popover-item signout"
                disabled={loggingOut}
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={14} aria-hidden="true" />
                {loggingOut ? "로그아웃 중…" : "로그아웃"}
              </button>
            </div>
          ) : null}

          <button
            className={`kds-account-trigger${accountOpen ? " active" : ""}`}
            onClick={() => setAccountOpen((v) => !v)}
            type="button"
            title={session.store.storeName}
            aria-expanded={accountOpen}
          >
            <div className="kds-account-avatar">{initials}</div>
            {sidebarOpen ? <span className="kds-account-trigger-name">{session.store.storeName}</span> : null}
          </button>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="kds-main">
        <header className="kds-topbar">
          {/* Left: store status */}
          <div className="kds-topbar-left">
            <div style={{ position: "relative" }}>
              <button
                className={`kds-store-status kds-store-status--${storeStatus.toLowerCase()}`}
                onClick={() => setStoreStatusPopup((v) => !v)}
                type="button"
                aria-label="매장 상태 변경"
              >
                <StoreStatusDot status={storeStatus} />
                {storeStatus === "OPEN" ? "영업중" : storeStatus === "PAUSED" ? "일시중지" : "영업종료"}
              </button>

              {storeStatusPopup ? (
                <div className="kds-store-status-popup" role="dialog" aria-modal="true" aria-label="매장 상태 변경">
                  <p className="kds-store-status-popup-title">매장 상태</p>
                  {(["OPEN", "PAUSED", "CLOSED"] as StoreStatus[]).map((s) => (
                    <button
                      key={s}
                      className={`kds-store-status-popup-btn${storeStatus === s ? " active" : ""}`}
                      onClick={() => void handleStoreStatusChange(s)}
                      type="button"
                    >
                      <StoreStatusDot status={s} />
                      {s === "OPEN" ? "영업중" : s === "PAUSED" ? "일시중지" : "영업종료"}
                    </button>
                  ))}
                  {storeStatus === "PAUSED" ? (
                    <div className="kds-pause-duration">
                      <span className="kds-pause-duration-label">일시중지 시간</span>
                      <div className="kds-pause-duration-control">
                        <button
                          className="kds-pause-stepper"
                          onClick={() => setPauseMinutes((m) => Math.max(10, m - 10))}
                          type="button"
                          aria-label="10분 감소"
                        >
                          <Minus size={16} aria-hidden="true" />
                        </button>
                        <span className="kds-pause-duration-value">{pauseMinutes}분</span>
                        <button
                          className="kds-pause-stepper"
                          onClick={() => setPauseMinutes((m) => m + 10)}
                          type="button"
                          aria-label="10분 증가"
                        >
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <button
                        className="kds-pause-confirm"
                        disabled={savingStoreStatus}
                        onClick={() => void confirmStoreStatusChange()}
                        type="button"
                      >{savingStoreStatus ? "저장 중…" : "확인"}</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Center: tabs or page title */}
          {(activeTab === "RECEIVED" || activeTab === "DONE" || activeTab === "MY_TASKS") ? (
            <div className="kds-topbar-tabs" role="tablist">
              <button
                aria-selected={activeTab === "RECEIVED"}
                className={`kds-tab${activeTab === "RECEIVED" ? " active" : ""}`}
                onClick={() => setActiveTab("RECEIVED")}
                role="tab"
                type="button"
              >
                접수
                {receivedOrders.length > 0 && (
                  <span className="kds-tab-count">{receivedOrders.length}</span>
                )}
              </button>
              <button
                aria-selected={activeTab === "DONE"}
                className={`kds-tab${activeTab === "DONE" ? " active" : ""}`}
                onClick={() => setActiveTab("DONE")}
                role="tab"
                type="button"
              >
                완료
                {doneOrders.length > 0 && (
                  <span className="kds-tab-count">{doneOrders.length}</span>
                )}
              </button>
              <button
                aria-selected={activeTab === "MY_TASKS"}
                className={`kds-tab${activeTab === "MY_TASKS" ? " active" : ""}`}
                onClick={() => { setActiveTab("MY_TASKS"); setSidebarOpen(false); }}
                role="tab"
                type="button"
              >
                내 업무
              </button>
            </div>
          ) : (
            <div className="kds-topbar-page-title">
              {activeTab === "STAFF" ? "직원 관리" : activeTab === "STATS" ? "통계" : "설정"}
            </div>
          )}

          {/* Right: actions */}
          <div className="kds-topbar-right">
            {activeTab === "DONE" && doneOrders.length > 0 ? (
              <button
                aria-label="완료 주문 내역 정리"
                className="kds-icon-btn"
                disabled={archivingCompleted}
                onClick={() => setClearDoneConfirm(true)}
                title="완료 주문 정리"
                type="button"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            ) : null}
            <button
              aria-label={
                orderSortDirection === "newest-first"
                  ? "현재 최신 주문 우선, 클릭하여 과거 주문 우선으로 변경"
                  : "현재 과거 주문 우선, 클릭하여 최신 주문 우선으로 변경"
              }
              className="kds-icon-btn"
              onClick={() =>
                setOrderSortDirection(
                  orderSortDirection === "newest-first" ? "oldest-first" : "newest-first",
                )
              }
              title={orderSortDirection === "newest-first" ? "최신 주문 우선" : "과거 주문 우선"}
              type="button"
            >
              {orderSortDirection === "newest-first" ? (
                <ClockArrowDown size={15} aria-hidden="true" />
              ) : (
                <ClockArrowUp size={15} aria-hidden="true" />
              )}
            </button>
            <button
              aria-label="주문 새로고침"
              className={`kds-icon-btn${loading || refreshing ? " spinning" : ""}`}
              disabled={loading || refreshing}
              onClick={() => void handleManualRefresh()}
              type="button"
            >
              <RefreshCw size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        {counts.CANCELLED > 0 ? (
          <div className="kds-notice-bar">취소 주문 {counts.CANCELLED}건은 보드에서 제외되어 집계로만 관리됩니다.</div>
        ) : null}

        {activeTab === "MY_TASKS" ? (
          <div className="kds-panel-shell">
            <MyTasksPanel
              assignedMenus={assignedMenus}
              loading={assignedMenusLoading}
              now={now}
              onCreateAssignedMenu={createAssignedMenu}
              onDeleteAssignedMenu={removeAssignedMenu}
              onUpdateAssignedMenu={editAssignedMenu}
              orders={boardOrders}
              saving={assignedMenusSaving}
            />
          </div>
        ) : activeTab === "STAFF" && isManager ? (
          <div className="kds-panel-shell">
            <StaffPanel onUnauthorized={onUnauthorized} session={session} />
          </div>
        ) : activeTab === "STATS" ? (
          <StatsPanel orders={orders} />
        ) : activeTab === "SETTINGS" ? (
          <div className="kds-panel-shell">
            <SettingsPanel
              settings={settings}
              onUpdate={updateSettings}
              onChangePasswordClick={() => { setPwModal(true); setPwError(null); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}
              disabled={storeSettingsLoading || savingSettings}
            />
          </div>
        ) : (
          <section className="kds-board" aria-label="주문 보드">
            {activeOrders.length === 0 ? (
              <div className="kds-empty">
                {loading ? "주문을 불러오는 중…" : activeTab === "RECEIVED" ? "접수된 주문이 없습니다" : "완료된 주문이 없습니다"}
              </div>
            ) : (
              <div className="kds-lane" ref={laneRef}>
                {orderLayoutColumns.map((column) => (
                  <div
                    className={`kds-lane-column kds-lane-column--${column.width}${column.orders.length > 1 ? " stacked" : ""}`}
                    key={`${column.width}-${column.orders.map((order) => order.id).join("-")}`}
                  >
                    {column.orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        now={now}
                        onContextMenu={(orderId, x, y) => setContextMenu({ orderId, x, y })}
                        onHeightChange={(height) => {
                          setOrderCardHeights((prev) => (prev[order.id] === height ? prev : { ...prev, [order.id]: height }));
                        }}
                        onToggleItemDone={handleToggleItemDone}
                        onUpdateStatus={updateOrderStatus}
                        order={order}
                        updatingItemId={updatingOrderItemId}
                        updating={updatingOrderId === order.id}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── Context menu ── */}
      {contextMenu ? (
        <div
          className="kds-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button
            className="kds-context-menu-item"
            onClick={() => { setDetailOrderId(contextMenu.orderId); setContextMenu(null); }}
            role="menuitem"
            type="button"
          >
            <Info size={13} aria-hidden="true" />
            상세정보
          </button>
          <button
            className="kds-context-menu-item danger"
            onClick={() => { setRemoveOrderId(contextMenu.orderId); setContextMenu(null); }}
            role="menuitem"
            type="button"
          >
            <Trash2 size={13} aria-hidden="true" />
            제거
          </button>
        </div>
      ) : null}

      {/* ── Detail modal ── */}
      {detailOrderId !== null ? (() => {
        const order = orders.find((o) => o.id === detailOrderId);
        if (!order) return null;
        const totalAmount = order.items.reduce((sum, item) => sum + (item.total_price ?? 0), 0);
        const orderedTime = order.ordered_at ? formatDetailTime(order.ordered_at) : formatDetailTime(order.created_at);
        const platformLabel = getOrderTypeLabel(order.platform);
        const store = session.store;
        const deliveryAddress = `${store.roadAddress ?? store.jibunAddress ?? "-"}${store.addressDetail ? ` ${store.addressDetail}` : ""}`;
        return (
          <div className="kds-modal-backdrop" onClick={() => setDetailOrderId(null)}>
            <div className="kds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="주문 상세정보">
              <div className="kds-modal-head">
                <h2 className="kds-modal-title">주문 #{order.order_number ?? order.id}</h2>
                <button className="kds-modal-close" onClick={() => setDetailOrderId(null)} type="button" aria-label="닫기">
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
              <div className="kds-modal-body">
                <div className="kds-detail-summary" aria-label="주문 요약">
                  <span>{orderedTime}</span>
                  <span aria-hidden="true">·</span>
                  <span>{platformLabel}</span>
                  {totalAmount > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <strong>{totalAmount.toLocaleString()}원</strong>
                    </>
                  ) : null}
                </div>
                <section className="kds-detail-section" aria-labelledby="kds-detail-menu-title">
                  <div className="kds-detail-section-head">
                    <div className="kds-detail-section-label" id="kds-detail-menu-title">주문 메뉴</div>
                    <div className="kds-detail-section-meta">{order.items.length}개</div>
                  </div>
                  <div className="kds-detail-items">
                    {order.items.map((item) => (
                      <div className="kds-detail-item" key={item.id}>
                        <span className="kds-detail-item-qty">{item.quantity}</span>
                        <div className="kds-detail-item-main">
                          <div className="kds-detail-item-name">{item.name}</div>
                          {item.options.length > 0 ? (
                            <ul className="kds-detail-item-options">
                              {item.options.map((opt, i) => <li key={i}>{opt}</li>)}
                            </ul>
                          ) : null}
                        </div>
                        {item.total_price ? (
                          <span className="kds-detail-item-price">{item.total_price.toLocaleString()}원</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="kds-detail-section" aria-labelledby="kds-detail-request-title">
                  <div className="kds-detail-section-head">
                    <div className="kds-detail-section-label" id="kds-detail-request-title">요청사항</div>
                  </div>
                  <p className={`kds-detail-text${order.customer_request ? "" : " empty"}`}>
                    {order.customer_request?.trim() || "없음"}
                  </p>
                </section>
                {order.delivery_request ? (
                  <section className="kds-detail-section" aria-labelledby="kds-detail-delivery-request-title">
                    <div className="kds-detail-section-head">
                      <div className="kds-detail-section-label" id="kds-detail-delivery-request-title">배달 요청</div>
                    </div>
                    <p className="kds-detail-text">{order.delivery_request}</p>
                  </section>
                ) : null}
                <section className="kds-detail-section" aria-labelledby="kds-detail-delivery-title">
                  <div className="kds-detail-section-head">
                    <div className="kds-detail-section-label" id="kds-detail-delivery-title">배송 정보</div>
                  </div>
                  <div className="kds-detail-rows">
                    <div className="kds-detail-row">
                      <span>주소</span>
                      <strong>{deliveryAddress}</strong>
                    </div>
                    <div className="kds-detail-row">
                      <span>연락처</span>
                      <strong>{store.phone ?? "-"}</strong>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        );
      })() : null}

      {/* ── Remove confirm modal ── */}
      {removeOrderId !== null ? (
        <div className="kds-modal-backdrop" onClick={() => setRemoveOrderId(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">주문 제거</h2>
            </div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc">주문을 제거하시겠습니까?</p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setRemoveOrderId(null)} type="button">아니오</button>
              <button
                className="kds-modal-btn danger"
                disabled={hidingOrderId === removeOrderId}
                onClick={() => void handleHideOrder(removeOrderId)}
                type="button"
              >{hidingOrderId === removeOrderId ? "처리중…" : "예"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Clear done confirm modal ── */}
      {clearDoneConfirm ? (
        <div className="kds-modal-backdrop" onClick={() => setClearDoneConfirm(false)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">완료 내역 정리</h2>
            </div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc">주문완료 내역을 삭제할까요?</p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setClearDoneConfirm(false)} type="button">아니오</button>
              <button
                className="kds-modal-btn danger"
                disabled={archivingCompleted}
                onClick={() => void handleArchiveCompletedOrders()}
                type="button"
              >{archivingCompleted ? "처리중…" : "예"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Change password modal ── */}
      {pwModal ? (
        <div className="kds-modal-backdrop" onClick={() => setPwModal(false)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="비밀번호 변경">
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">비밀번호 변경</h2>
              <button className="kds-modal-close" onClick={() => setPwModal(false)} type="button" aria-label="닫기">
                <X size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="kds-modal-body">
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="pw-current">현재 비밀번호</label>
                <input id="pw-current" type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="현재 비밀번호" autoComplete="current-password" />
              </div>
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="pw-new">새 비밀번호</label>
                <input id="pw-new" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="8자 이상" autoComplete="new-password" />
              </div>
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="pw-confirm">새 비밀번호 확인</label>
                <input id="pw-confirm" type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="비밀번호 재입력" autoComplete="new-password" />
              </div>
              {pwError ? <p className="kds-settings-error">{pwError}</p> : null}
              <p className="kds-settings-hint">변경 성공 시 현재 세션이 로그아웃됩니다.</p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setPwModal(false)} type="button">취소</button>
              <button className="kds-modal-btn primary" disabled={pwSubmitting} onClick={() => void handleChangePassword()} type="button">
                {pwSubmitting ? "변경중…" : "변경"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Toast ── */}
      {toast ? (
        <div
          className={`kds-toast${toast.type === "error" ? " error" : ""}`}
          role="alert"
          aria-live="assertive"
        >
          <Info size={13} aria-hidden="true" />
          <span>{toast.message}</span>
          <button className="kds-toast-close" onClick={() => setToast(null)} type="button" aria-label="닫기">
            <X size={11} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
async function requestWithReauth<T>(
  accessToken: string,
  onUnauthorized: () => Promise<string | null>,
  request: (token: string) => Promise<T>,
) {
  try {
    return await request(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const nextAccessToken = await onUnauthorized();
    if (!nextAccessToken) {
      throw error;
    }
    return request(nextAccessToken);
  }
}

function mapApiSettingsToUi(settings: StoreSettings): SettingsState {
  return {
    notificationsEnabled: settings.notificationsEnabled,
    sound: asSoundOption(settings.notificationSound),
    breaktime: {
      enabled: settings.breaktimeEnabled,
      startHour: settings.breaktimeStartHour,
      startMinute: settings.breaktimeStartMinute,
      durationMinutes: settings.breaktimeDurationMinutes,
    },
    autoAccept: settings.autoAccept,
  };
}

function mapUiSettingsToApi(settings: SettingsState): StoreSettings {
  return {
    notificationsEnabled: settings.notificationsEnabled,
    notificationSound: settings.sound,
    breaktimeEnabled: settings.breaktime.enabled,
    breaktimeStartHour: settings.breaktime.startHour,
    breaktimeStartMinute: settings.breaktime.startMinute,
    breaktimeDurationMinutes: settings.breaktime.durationMinutes,
    autoAccept: settings.autoAccept,
  };
}

function asSoundOption(value: string): SoundOption {
  if (value === "none" || value === "bell" || value === "chime" || value === "beep") {
    return value;
  }
  return "bell";
}

function getOrderColumnWidth(height: number | undefined, laneHeight: number): OrderLayoutColumn["width"] {
  if (!height || laneHeight <= 0) return "base";
  if (height > laneHeight * 1.35) return "xwide";
  if (height > laneHeight) return "wide";
  return "base";
}

function buildOrderLayoutColumns(orders: Order[], orderCardHeights: Record<number, number>, laneHeight: number): OrderLayoutColumn[] {
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

// ─────────��───────────────────────────────────
// Order Card
// ─────────────────────────────────────────────
function OrderCard({
  now,
  onContextMenu,
  onHeightChange,
  onToggleItemDone,
  onUpdateStatus,
  order,
  updatingItemId,
  updating,
}: {
  now: number;
  onContextMenu: (orderId: number, x: number, y: number) => void;
  onHeightChange?: (height: number) => void;
  onToggleItemDone: (itemId: number, nextDone: boolean) => void;
  onUpdateStatus: (orderId: number, status: OrderStatus) => Promise<void>;
  order: Order;
  updatingItemId: number | null;
  updating: boolean;
}) {
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

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
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

  function handleContextMenu(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault();
    onContextMenu(order.id, e.clientX, e.clientY);
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
      className={`kds-card${order.status === "DONE" ? " done" : ""}`}
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {/* Card header */}
      <div className="kds-card-head">
        <div className="kds-card-head-left">
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

      {/* Items — continuous flat list */}
      <div className="kds-items">
        {order.items.map((item, idx) => {
          const isDone = item.done;
          const isLast = idx === order.items.length - 1;
          const hasAllergy = allergyRiskItemIds.has(item.id);
          const isUpdatingItem = updatingItemId === item.id;
          return (
            <div
              key={item.id}
              className={`kds-item${hasAllergy ? " allergy" : ""}${isDone ? " done" : ""}${isLast ? " last" : ""}`}
              onClick={() => !isUpdatingItem && onToggleItemDone(item.id, !isDone)}
              role="button"
              tabIndex={0}
              aria-pressed={isDone}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isUpdatingItem) {
                  onToggleItemDone(item.id, !isDone);
                }
              }}
            >
              {/* Quantity */}
              <span className="kds-item-qty">{item.quantity}</span>

              {/* Name + options */}
              <div className="kds-item-content">
                <span className="kds-item-name">{item.name}</span>
                {item.options.length > 0 ? (
                  <ul className="kds-item-opts" aria-label="옵션">
                    {item.options.map((opt, i) => (
                      <li key={`${item.id}-${i}`}>{opt}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {/* Allergy / done indicator */}
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
          );
        })}
      </div>

      {/* Request / AI panel */}
      <RequestPanel analysis={order.aiAnalysis} customerRequest={order.customer_request} />

      {/* Action button */}
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

function StoreStatusDot({ status }: { status: StoreStatus }) {
  const tone = status.toLowerCase();
  return (
    <span className={`kds-store-status-dot kds-store-status-dot--${tone}`} aria-hidden="true">
      <span className="kds-store-status-dot-core" />
      {status === "OPEN" ? <span className="kds-store-status-dot-pulse" /> : null}
    </span>
  );
}

// ─────────────────────────────────────────────
// Request Panel
// ─────────────────────────────────────────────
function RequestPanel({
  analysis,
  customerRequest,
}: {
  analysis: OrderAIAnalysis | null;
  customerRequest: string | null;
}) {
  const rawText = customerRequest?.trim() ?? "";
  if (!analysis && !rawText) return null;

  if (!analysis) {
    return (
      <div className="kds-request-panel">
        <span className="kds-request-label">요청사항</span>
        <p className="kds-request-text">{rawText}</p>
      </div>
    );
  }

  const actions = analysis.kitchenActions ?? [];
  const hasActions = actions.length > 0;
  const hasRaw = rawText.length > 0;
  if (!hasActions && !hasRaw) return null;

  return (
    <div className={`kds-request-panel${analysis.needsHumanCheck ? " needs-check" : ""}`}>
      {analysis.needsHumanCheck ? (
        <span className="kds-request-label urgent">AI 주의 요청</span>
      ) : (
        <span className="kds-request-label">요청사항</span>
      )}
      {hasActions ? (
        <div className="kds-action-chips">
          {actions.map((action, index) => (
            <span className={`kds-chip ${getActionTone(action)}`} key={`${action.displayText}-${index}`}>
              {action.displayText}
            </span>
          ))}
        </div>
      ) : null}
      {hasRaw ? <p className="kds-request-text">{rawText}</p> : null}
    </div>
  );
}

// ─────────────────────────────────────────────
// Staff Panel
// ─────────────────────────────────────────────
type StaffModalMode =
  | { type: "add" }
  | { type: "edit"; member: Staff }
  | { type: "pin"; member: Staff }
  | { type: "deactivate"; member: Staff };

function StaffPanel({
  session,
  onUnauthorized,
}: {
  session: AuthSession;
  onUnauthorized: () => Promise<string | null>;
}) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<StaffModalMode | null>(null);
  const [form, setForm] = useState({ name: "", loginId: "", role: "직원" });
  const [formError, setFormError] = useState<string | null>(null);
  const [pinVisible, setPinVisible] = useState<number | null>(null);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);

  function normalizeStaffIdentifier(value: string) {
    return value.trim().toLowerCase();
  }

  function isValidStaffIdentifier(value: string) {
    return /^[a-z0-9][a-z0-9._-]{3,31}$/.test(value);
  }

  const fetchStaff = useCallback(async () => {
    const data = await requestWithReauth(session.accessToken, onUnauthorized, apiGetStaff);
    setStaffList(data.staff);
  }, [onUnauthorized, session.accessToken]);

  useEffect(() => {
    void fetchStaff()
      .catch((error) => {
        // StaffPanel is owner-only UI, surface fetch errors locally.
        setFormError(error instanceof Error ? error.message : "직원 목록을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [fetchStaff]);

  function openAdd() {
    setForm({ name: "", loginId: "", role: "직원" });
    setFormError(null);
    setModal({ type: "add" });
  }

  function openEdit(member: Staff) {
    setForm({ name: member.name, loginId: member.loginId, role: member.positionLabel ?? "직원" });
    setFormError(null);
    setModal({ type: "edit", member });
  }

  async function saveStaff() {
    if (!form.name.trim()) { setFormError("이름을 입력하세요."); return; }
    if (!isValidStaffIdentifier(form.loginId)) {
      setFormError("아이디는 영문 소문자, 숫자, ., _, - 만 사용해 4~32자로 입력해주세요.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const loginId = normalizeStaffIdentifier(form.loginId);
      if (modal?.type === "add") {
        const created = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
          apiCreateStaff(accessToken, {
            name: form.name.trim(),
            loginId,
            positionLabel: form.role,
          }),
        );
        setPinVisible(created.id);
        setRevealedPin(created.temporaryPin);
      } else if (modal?.type === "edit") {
        await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
          apiUpdateStaff(accessToken, modal.member.id, {
            name: form.name.trim(),
            loginId,
            positionLabel: form.role,
          }),
        );
      }
      setModal(null);
      await fetchStaff();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "직원 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function reissuePin(member: Staff) {
    setSaving(true);
    try {
      const result = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiRegenerateStaffPin(accessToken, member.id),
      );
      setPinVisible(member.id);
      setRevealedPin(result.temporaryPin);
      setModal(null);
      await fetchStaff();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "PIN을 재발급하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: Staff) {
    setSaving(true);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateStaffActive(accessToken, member.id, { active: !member.active }),
      );
      setModal(null);
      await fetchStaff();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "직원 상태를 변경하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = staffList.filter((m) => m.active).length;

  return (
    <section className="kds-panel" aria-label="직원 관리">
      {/* Header */}
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">직원 관리</h2>
          <p className="kds-panel-subtitle">총 {staffList.length}명 · 활성 {activeCount}명</p>
        </div>
        <button className="kds-btn-primary kds-btn-sm" disabled={saving} onClick={openAdd} type="button">
          <Plus size={12} aria-hidden="true" />
          직원 추가
        </button>
      </div>

      {formError && !modal ? <div className="banner error" role="alert">{formError}</div> : null}

      {loading ? (
        <div className="kds-empty">직원 목록을 불러오는 중…</div>
      ) : null}

      {/* Staff table */}
      {!loading ? (
      <div className="kds-table-wrap">
        <table className="kds-table">
          <thead className="align-middle">
            <tr>
              <th>이름</th>
              <th>아이디</th>
              <th style={{ textAlign: "center" }}>역할</th>
              <th style={{ textAlign: "center" }}>상태</th>
              <th>PIN</th>
              <th style={{ textAlign: "right" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((member) => (
              <tr key={member.id} className={!member.active ? "row-inactive" : ""}>
                <td>
                  <div className="kds-table-cell-name">
                    <div className="kds-staff-avatar-sm" aria-hidden="true">{member.name.slice(0, 1)}</div>
                    <span>{member.name}</span>
                  </div>
                </td>
                <td className="kds-table-cell-muted">{member.loginId}</td>
                <td style={{ textAlign: "center" }}>
                  <span className={`kds-badge${member.positionLabel === "매니저" ? " accent" : ""}`}>
                    {member.positionLabel ?? "직원"}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span className={`kds-badge${member.active ? " green" : " dim"}`}>
                    {member.active ? "활성" : "비활성"}
                  </span>
                </td>
                <td>
                  {pinVisible === member.id && revealedPin ? (
                    <div className="kds-pin-reveal">
                      <span className="kds-pin-value">{revealedPin}</span>
                    </div>
                  ) : (
                    <span className="kds-pin-hidden">••••</span>
                  )}
                </td>
                <td>
                  <div className="kds-table-actions">
                    <button className="kds-btn-ghost kds-btn-xs" disabled={saving} onClick={() => setModal({ type: "pin", member })} type="button">PIN 재발급</button>
                    <button className="kds-btn-ghost kds-btn-xs" disabled={saving} onClick={() => openEdit(member)} type="button">수정</button>
                    <button
                      disabled={saving}
                      className={`kds-btn-ghost kds-btn-xs${member.active ? " danger" : " green"}`}
                      onClick={() => setModal({ type: "deactivate", member })}
                      type="button"
                    >
                      {member.active ? "비활성화" : "활성화"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}

      {/* Add / Edit modal */}
      {(modal?.type === "add" || modal?.type === "edit") ? (
        <div className="kds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={modal.type === "add" ? "직원 추가" : "직원 정보 수정"}>
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">{modal.type === "add" ? "직원 추가" : "직원 정보 수정"}</h2>
              <button className="kds-modal-close" onClick={() => setModal(null)} type="button" aria-label="닫기">
                <X size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="kds-modal-body">
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="staff-name">이름</label>
                <input id="staff-name" type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="직원 이름" autoFocus />
              </div>
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="staff-login-id">아이디</label>
                <input id="staff-login-id" type="text" value={form.loginId} onChange={(e) => setForm((f) => ({ ...f, loginId: e.target.value }))} placeholder="example123" />
              </div>
              <div className="kds-settings-field">
                <label className="kds-settings-label">역할</label>
                <div className="kds-segmented">
                  {(["직원", "매니저"] as const).map((label) => (
                    <button key={label} className={`kds-segmented-btn${form.role === label ? " active" : ""}`} onClick={() => setForm((f) => ({ ...f, role: label }))} type="button">{label}</button>
                  ))}
                </div>
              </div>
              {modal.type === "add" ? <p className="kds-settings-hint">추가 후 4자리 PIN이 자동 발급됩니다.</p> : null}
              {formError ? <p className="kds-settings-error">{formError}</p> : null}
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setModal(null)} type="button">취소</button>
              <button className="kds-modal-btn primary" disabled={saving} onClick={() => void saveStaff()} type="button">{saving ? "저장중…" : "저장"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {modal?.type === "pin" ? (
        <div className="kds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kds-modal-head"><h2 className="kds-modal-title">PIN 재발급</h2></div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc"><strong>{modal.member.name}</strong>의 PIN을 새로 발급하시겠습니까?<br />기존 PIN은 즉시 사용 불가 처리됩니다.</p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setModal(null)} type="button">취소</button>
              <button className="kds-modal-btn primary" disabled={saving} onClick={() => void reissuePin(modal.member)} type="button">{saving ? "발급중…" : "발급"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {modal?.type === "deactivate" ? (
        <div className="kds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kds-modal-head"><h2 className="kds-modal-title">{modal.member.active ? "직원 비활성화" : "직원 활성화"}</h2></div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc">
                <strong>{modal.member.name}</strong>을(를) {modal.member.active ? "비활성화" : "활성화"}하시겠습니까?
                {modal.member.active ? " 비활성화된 직원은 로그인할 수 없습니다." : ""}
              </p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setModal(null)} type="button">취소</button>
              <button className={`kds-modal-btn${modal.member.active ? " danger" : " primary"}`} disabled={saving} onClick={() => void toggleActive(modal.member)} type="button">
                {saving ? "처리중…" : modal.member.active ? "비활성화" : "활성화"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────
// My Tasks Panel
// ─────────────────────────────────────────────
type MenuModalMode = { type: "add" } | { type: "edit"; menu: AssignedMenu };

function MyTasksPanel({
  assignedMenus,
  loading,
  now,
  onCreateAssignedMenu,
  onDeleteAssignedMenu,
  onUpdateAssignedMenu,
  orders,
  saving,
}: {
  assignedMenus: AssignedMenu[];
  loading: boolean;
  now: number;
  onCreateAssignedMenu: (menuName: string) => Promise<void>;
  onDeleteAssignedMenu: (menuId: number) => Promise<void>;
  onUpdateAssignedMenu: (menuId: number, menuName: string) => Promise<void>;
  orders: Order[];
  saving: boolean;
}) {
  const DELAY_THRESHOLD_MINUTES = 10;

  const [menuModal, setMenuModal] = useState<MenuModalMode | null>(null);
  const [menuInput, setMenuInput] = useState("");
  const [menuError, setMenuError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignedMenu | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopoverId(null);
      }
    }
    if (openPopoverId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openPopoverId]);

  const assignedNames = useMemo(() => new Set(assignedMenus.map((m) => m.menuName.trim())), [assignedMenus]);

  const remainingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    assignedMenus.forEach((m) => counts.set(m.menuName, 0));
    orders
      .filter((o) => o.status === "NEW" || o.status === "COOKING")
      .forEach((order) => {
        order.items.forEach((item) => {
          const key = item.name.trim();
          if (assignedNames.has(key) && !item.done) {
            counts.set(key, (counts.get(key) ?? 0) + item.quantity);
          }
        });
      });
    return counts;
  }, [assignedMenus, assignedNames, orders]);

  // Per-menu: does any active order containing this menu have elapsed > threshold?
  const delayedMenuNames = useMemo(() => {
    const delayed = new Set<string>();
    orders
      .filter((o) => o.status === "NEW" || o.status === "COOKING")
      .forEach((order) => {
        const elapsed = getElapsedMinutes(now, order.ordered_at ?? order.created_at);
        if (elapsed >= DELAY_THRESHOLD_MINUTES) {
          order.items.forEach((item) => {
            if (assignedNames.has(item.name.trim()) && !item.done) {
              delayed.add(item.name.trim());
            }
          });
        }
      });
    return delayed;
  }, [assignedNames, now, orders]);

  type HistoryRow = {
    orderNumber: string;
    menuName: string;
    quantity: number;
    timestamp: string;
    status: "진행중" | "완료";
    itemId: number;
    delayed: boolean;
    orderId: number;
  };

  const allHistoryRows = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [];
    orders
      .filter((o) => o.status === "NEW" || o.status === "COOKING" || o.status === "DONE")
      .forEach((order) => {
        const elapsedMin = getElapsedMinutes(now, order.ordered_at ?? order.created_at);
        const inProgress = order.status === "NEW" || order.status === "COOKING";
        order.items.forEach((item) => {
          if (!assignedNames.has(item.name.trim())) return;
          const done = order.status === "DONE" || item.done;
          rows.push({
            orderNumber: order.order_number ?? String(order.id),
            menuName: item.name,
            quantity: item.quantity,
            timestamp: order.ordered_at ?? order.created_at,
            status: done ? "완료" : "진행중",
            itemId: item.id,
            delayed: inProgress && !done && elapsedMin >= DELAY_THRESHOLD_MINUTES,
            orderId: order.id,
          });
        });
      });
    rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return rows;
  }, [assignedNames, now, orders]);

  const selectedMenuName = selectedMenuId
    ? (assignedMenus.find((m) => String(m.id) === selectedMenuId)?.menuName ?? null)
    : null;

  const historyRows = useMemo(() => {
    if (!selectedMenuName) return allHistoryRows;
    return allHistoryRows.filter((r) => r.menuName.trim() === selectedMenuName.trim());
  }, [allHistoryRows, selectedMenuName]);

  function openAdd() {
    setMenuInput("");
    setMenuError(null);
    setMenuModal({ type: "add" });
  }
  function openEdit(menu: AssignedMenu) {
    setMenuInput(menu.menuName);
    setMenuError(null);
    setMenuModal({ type: "edit", menu });
    setOpenPopoverId(null);
  }

  async function saveMenu() {
    const name = menuInput.trim();
    if (!name) return;
    const normalizedName = normalizeAssignedMenuName(name);
    const duplicateMenu = assignedMenus.find((menu) => {
      if (menuModal?.type === "edit" && menu.id === menuModal.menu.id) {
        return false;
      }
      return normalizeAssignedMenuName(menu.menuName) === normalizedName;
    });
    if (duplicateMenu) {
      setMenuError("이미 등록된 담당 메뉴입니다.");
      return;
    }
    try {
      if (menuModal?.type === "add") {
        await onCreateAssignedMenu(name);
      } else if (menuModal?.type === "edit") {
        await onUpdateAssignedMenu(menuModal.menu.id, name);
      }
      setMenuError(null);
      setMenuModal(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "담당 메뉴를 저장하지 못했습니다.";
      if (message.includes("이미 등록된 담당 메뉴")) {
        setMenuError("이미 등록된 담당 메뉴입니다.");
        return;
      }
      throw error;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (selectedMenuId === String(deleteTarget.id)) setSelectedMenuId(null);
    await onDeleteAssignedMenu(deleteTarget.id);
    setDeleteTarget(null);
  }

  function formatHistoryTime(timestamp: string) {
    const d = parseApiTimestamp(timestamp);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function handleTileClick(menuId: string) {
    setSelectedMenuId((prev) => (prev === menuId ? null : menuId));
  }

  const sortedMenus = useMemo(
    () => [...assignedMenus].sort((a, b) => {
      const ca = remainingCounts.get(a.menuName) ?? 0;
      const cb = remainingCounts.get(b.menuName) ?? 0;
      return cb - ca;
    }),
    [assignedMenus, remainingCounts],
  );

  const totalActive = useMemo(
    () => Array.from(remainingCounts.values()).reduce((s, v) => s + v, 0),
    [remainingCounts],
  );

  return (
    <section className="kds-panel" aria-label="내 업무">
      {/* ── Header ── */}
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">내 업무</h2>
          <p className="kds-panel-subtitle">
            {assignedMenus.length > 0
              ? `담당 ${assignedMenus.length}개 메뉴 · 진행중 ${totalActive}건`
              : "담당 메뉴가 없습니다"}
          </p>
        </div>
        <button className="kds-btn-primary kds-btn-sm" onClick={openAdd} type="button">
          <Plus size={11} aria-hidden="true" />
          메뉴 추가
        </button>
      </div>

      {/* ── Menu tiles grid ── */}
      {loading ? (
        <p className="kds-panel-empty">담당 메뉴를 불러오는 중…</p>
      ) : assignedMenus.length === 0 ? (
        <p className="kds-panel-empty">메뉴 추가를 눌러 담당 메뉴를 등록하세요.</p>
      ) : (
        <div className="kds-mytasks-grid">
          {sortedMenus.map((menu) => {
            const count = remainingCounts.get(menu.menuName) ?? 0;
            const isIdle = count === 0;
            const isDelayed = delayedMenuNames.has(menu.menuName.trim());
            const isSelected = selectedMenuId === String(menu.id);
            const isPopoverOpen = openPopoverId === String(menu.id);
            return (
              <div
                key={menu.id}
                className={`kds-menu-tile${isIdle ? " idle" : ""}${isDelayed ? " delayed" : ""}${isSelected ? " selected" : ""}`}
                onClick={() => handleTileClick(String(menu.id))}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleTileClick(String(menu.id)); } }}
              >
                {isDelayed && (
                  <span className="kds-tile-delay-dot" aria-label="지연" title="지연 주문 있음" />
                )}
                <div className="kds-menu-tile-count" aria-label={`진행중 ${count}건`}>{count}</div>
                <div className="kds-menu-tile-name">{menu.menuName}</div>
                {/* ⋯ popover trigger — stop propagation to avoid triggering tile click */}
                <div className="kds-tile-options-wrap" ref={isPopoverOpen ? popoverRef : null}>
                  <button
                    className="kds-tile-options-btn"
                    aria-label={`${menu.menuName} 메뉴 옵션`}
                    title="옵션"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenPopoverId(isPopoverOpen ? null : String(menu.id)); }}
                  >
                    <MoreVertical size={14} aria-hidden="true" />
                  </button>
                  {isPopoverOpen && (
                    <div className="kds-tile-popover" role="menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="kds-tile-popover-item"
                        role="menuitem"
                        type="button"
                        onClick={() => openEdit(menu)}
                      >
                        <Pencil size={12} aria-hidden="true" />
                        수정
                      </button>
                      <button
                        className="kds-tile-popover-item danger"
                        role="menuitem"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(menu); setOpenPopoverId(null); }}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Order history ── */}
      <div className="kds-section-divider">
        <span className="kds-section-label">
          {selectedMenuName ? `주문 내역 — ${selectedMenuName}` : "주문 내역"}
        </span>
      </div>

      {historyRows.length === 0 ? (
        <p className="kds-panel-empty">
          {selectedMenuName ? `'${selectedMenuName}' 관련 주문 내역이 없습니다.` : "관련 주문 내역이 없습니다."}
        </p>
      ) : (
        <div className="kds-table-wrap">
          <table className="kds-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>메뉴</th>
                <th style={{ textAlign: "center" }}>수량</th>
                <th>주문시각</th>
                <th style={{ textAlign: "center" }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row, idx) => (
                <tr
                  key={`${row.orderNumber}-${row.itemId}-${idx}`}
                  className={row.status === "완료" ? "row-done" : row.delayed ? "row-delayed" : ""}
                >
                  <td className="kds-table-cell-muted">{row.orderNumber}</td>
                  <td>{row.menuName}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{row.quantity}</td>
                  <td className="kds-table-cell-muted">{formatHistoryTime(row.timestamp)}</td>
                  <td style={{ textAlign: "center" }}>
                    {row.delayed ? (
                      <span className="kds-badge red">지연</span>
                    ) : (
                      <span className={`kds-badge${row.status === "완료" ? " dim" : " accent"}`}>{row.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {menuModal ? (
        <div className="kds-modal-backdrop" onClick={() => { setMenuModal(null); setMenuError(null); }}>
          <div
            className="kds-modal kds-modal--sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={menuModal.type === "add" ? "담당 메뉴 추가" : "담당 메뉴 수정"}
          >
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">{menuModal.type === "add" ? "담당 메뉴 추가" : "담당 메뉴 수정"}</h2>
              <button
                className="kds-modal-close"
                onClick={() => {
                  setMenuModal(null);
                  setMenuError(null);
                }}
                type="button"
                aria-label="닫기"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="kds-modal-body">
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="menu-name-input">메뉴명</label>
                <input
                  id="menu-name-input"
                  type="text"
                  value={menuInput}
                  onChange={(e) => {
                    setMenuInput(e.target.value);
                    if (menuError) {
                      setMenuError(null);
                    }
                  }}
                  placeholder="예: 짜장면"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") void saveMenu(); }}
                />
                {menuError ? <p className="kds-settings-error">{menuError}</p> : null}
              </div>
            </div>
            <div className="kds-modal-foot">
              <button
                className="kds-modal-btn secondary"
                onClick={() => {
                  setMenuModal(null);
                  setMenuError(null);
                }}
                type="button"
              >
                취소
              </button>
              <button className="kds-modal-btn primary" disabled={saving || !menuInput.trim()} onClick={() => void saveMenu()} type="button">{saving ? "저장 중…" : "저장"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Delete confirm modal ── */}
      {deleteTarget ? (
        <div className="kds-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">담당 메뉴 삭제</h2>
            </div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc">
                이 담당 메뉴를 삭제하시겠습니까?<br />
                <strong>{deleteTarget.menuName}</strong>
              </p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setDeleteTarget(null)} type="button">아니오</button>
              <button className="kds-modal-btn danger" disabled={saving} onClick={() => void confirmDelete()} type="button">{saving ? "삭제 중…" : "예"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ───────────────────────��─────────────────────
// Stats Panel
// ─────────────────────────────────────────────
function StatsPanel({ orders }: { orders: Order[] }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayOrders = orders.filter((o) => {
    const ts = o.ordered_at ?? o.created_at;
    return ts.startsWith(todayStr);
  });

  const doneToday = todayOrders.filter((o) => o.status === "DONE");
  const totalRevenue = todayOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.total_price ?? 0), 0), 0);
  const completionRate = todayOrders.length > 0 ? Math.round((doneToday.length / todayOrders.length) * 100) : 0;

  const menuMap = new Map<string, number>();
  todayOrders.forEach((o) => {
    o.items.forEach((item) => {
      menuMap.set(item.name, (menuMap.get(item.name) ?? 0) + item.quantity);
    });
  });
  const sortedMenus = Array.from(menuMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedMenus[0]?.[1] ?? 1;

  return (
    <section className="kds-panel" aria-label="통계">
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">오늘 통계</h2>
          <p className="kds-panel-subtitle">{todayStr}</p>
        </div>
      </div>

      {/* Inline metric strip */}
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

      {/* Menu breakdown */}
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

// ─────────────────────────────────────────────
// Settings Panel
// ─────────────────────────────────────────────
const SOUND_OPTIONS: { value: SoundOption; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "bell", label: "벨" },
  { value: "chime", label: "차임" },
  { value: "beep", label: "비프" },
];

function SettingsPanel({
  settings,
  onUpdate,
  onChangePasswordClick,
  disabled = false,
}: {
  settings: SettingsState;
  onUpdate: (partial: Partial<SettingsState>) => void;
  onChangePasswordClick: () => void;
  disabled?: boolean;
}) {
  const breaktimeRangeValue = useMemo(() => {
    const start = dayjs().hour(settings.breaktime.startHour).minute(settings.breaktime.startMinute).second(0);
    const end = start.add(settings.breaktime.durationMinutes, "minute");
    return [start, end] as [Dayjs, Dayjs];
  }, [
    settings.breaktime.durationMinutes,
    settings.breaktime.startHour,
    settings.breaktime.startMinute,
  ]);

  return (
    <section className="kds-panel" aria-label="설정">
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">설정</h2>
          <p className="kds-panel-subtitle">운영 환경 및 알림 설정</p>
        </div>
      </div>

      {/* Section: 알림 */}
      <div className="kds-section-divider">
        <span className="kds-section-label">알림</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">알림 활성화</span>
            <span className="kds-settings-row-desc">주문 도착 시 알림을 받습니다</span>
          </div>
          <button
            className={`kds-toggle${settings.notificationsEnabled ? " on" : ""}`}
            disabled={disabled}
            onClick={() => onUpdate({ notificationsEnabled: !settings.notificationsEnabled })}
            type="button"
            role="switch"
            aria-checked={settings.notificationsEnabled}
          >
            <span className="kds-toggle-knob" />
          </button>
        </div>

        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">알림 사운드</span>
            <span className="kds-settings-row-desc">주문 도착 시 재생할 사운드</span>
          </div>
          <div className="kds-segmented">
            {SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`kds-segmented-btn${settings.sound === opt.value ? " active" : ""}`}
                disabled={disabled || !settings.notificationsEnabled}
                onClick={() => onUpdate({ sound: opt.value })}
                type="button"
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Section: 브레이크타임 */}
      <div className="kds-section-divider">
        <span className="kds-section-label">브레이크타임</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">브레이크타임 사용</span>
            <span className="kds-settings-row-desc">설정한 시간 동안 주문 접수를 일시 중지합니다</span>
          </div>
          <button
            className={`kds-toggle${settings.breaktime.enabled ? " on" : ""}`}
            disabled={disabled}
            onClick={() => onUpdate({ breaktime: { ...settings.breaktime, enabled: !settings.breaktime.enabled } })}
            type="button"
            role="switch"
            aria-checked={settings.breaktime.enabled}
            aria-label="브레이크타임 사용"
          >
            <span className="kds-toggle-knob" />
          </button>
        </div>

        <div className={`kds-settings-row${!settings.breaktime.enabled ? " kds-settings-row--disabled" : ""}`}>
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">브레이크타임 시간</span>
            <span className="kds-settings-row-desc">주문 접수를 중지할 시간 설정</span>
          </div>
          <div className="kds-settings-inline-picker">
            <TimePicker.RangePicker
              id="bt-range"
              allowClear={false}
              className="kds-time-range-picker"
              disabled={disabled || !settings.breaktime.enabled}
              format="HH:mm"
              inputReadOnly
              minuteStep={5}
              needConfirm
              placeholder={["Start time", "End time"]}
              value={breaktimeRangeValue}
              onChange={(value) => {
                if (!value || !value[0] || !value[1]) {
                  return;
                }
                const nextStartHour = value[0].hour();
                const nextStartMinute = value[0].minute();
                const nextDuration = diffMinutesWithinDay(value[0], value[1]);
                onUpdate({
                  breaktime: {
                    ...settings.breaktime,
                    startHour: nextStartHour,
                    startMinute: nextStartMinute,
                    durationMinutes: Math.max(5, nextDuration),
                  },
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Section: 주문 처리 */}
      <div className="kds-section-divider">
        <span className="kds-section-label">주문 처리</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">주문 자동수락</span>
            <span className="kds-settings-row-desc">
              {settings.autoAccept ? "주문 수신 즉시 진행중 표시" : "수락 버튼을 눌러야 진행중 표시"}
            </span>
          </div>
          <button
            className={`kds-toggle${settings.autoAccept ? " on" : ""}`}
            disabled={disabled}
            onClick={() => onUpdate({ autoAccept: !settings.autoAccept })}
            type="button"
            role="switch"
            aria-checked={settings.autoAccept}
          >
            <span className="kds-toggle-knob" />
          </button>
        </div>
      </div>

      {/* Section: 계정 */}
      <div className="kds-section-divider">
        <span className="kds-section-label">계정</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">비밀번호 변경</span>
            <span className="kds-settings-row-desc">변경 후 자동 로그아웃됩니다</span>
          </div>
          <button className="kds-btn-ghost kds-btn-sm" disabled={disabled} onClick={onChangePasswordClick} type="button">변경</button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Pure utility functions
// ─────────────────────────────────────────────
function getOrderTypeLabel(platform: string) {
  const n = platform?.toLowerCase() ?? "";
  if (n.includes("delivery") || n.includes("배달")) return "배달";
  if (n.includes("takeout") || n.includes("포장") || n.includes("take")) return "포장";
  return "매장";
}

function getActionTone(action: AnalysisAction) {
  if (action.type === "ALLERGY" || action.type === "SAFETY_CHECK" || action.severity === "HIGH") return "danger";
  if (action.type === "COOKING_REQUEST" || action.type === "TASTE_ADJUSTMENT") return "cook";
  if (action.type === "EXCLUDE_INGREDIENT") return "exclude";
  return "neutral";
}

function getAllergyRiskItemIds(analysis: OrderAIAnalysis | null) {
  const ids = new Set<number>();
  analysis?.kitchenActions
    ?.filter((action) => action.type === "ALLERGY")
    .forEach((action) => action.matchedMenuItemIds?.forEach((id) => ids.add(id)));
  return ids;
}

function getElapsedMinutes(now: number, timestamp: string) {
  const start = parseApiTimestamp(timestamp).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.floor((now - start) / 60000);
}

function formatElapsedLabel(now: number, timestamp: string) {
  const start = parseApiTimestamp(timestamp).getTime();
  if (Number.isNaN(start)) return "-";
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  if (seconds < 60) return `${seconds}초 경과`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 경과`;
  return "1시간 +";
}

function parseApiTimestamp(timestamp: string) {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(timestamp)) {
    return new Date(timestamp);
  }
  return new Date(`${timestamp}Z`);
}

function normalizeAssignedMenuName(value: string) {
  return value.trim().toLowerCase().split(/\s+/).join(" ");
}

function diffMinutesWithinDay(start: Dayjs, end: Dayjs) {
  const startMinutes = start.hour() * 60 + start.minute();
  const endMinutes = end.hour() * 60 + end.minute();
  const diff = endMinutes - startMinutes;
  return diff > 0 ? diff : diff + 24 * 60;
}

function statusWeight(status: OrderStatus) {
  if (status === "NEW") return 0;
  if (status === "COOKING") return 1;
  if (status === "DONE") return 2;
  return 3;
}

function formatDetailTime(timestamp: string) {
  const date = parseApiTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOrderCardTime(timestamp: string) {
  const date = parseApiTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
