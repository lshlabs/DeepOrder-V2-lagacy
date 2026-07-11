import { useEffect, useState } from "react";
import { ClockArrowDown, ClockArrowUp, Menu, RefreshCw, Trash2, X } from "lucide-react";

import type { BoardTab, OrderSortDirection, StoreStatus } from "@/features/kds/types";
import { StoreStatusControl } from "@/features/store-status/components/StoreStatusControl";

type KdsTopbarProps = {
  activeTab: BoardTab;
  archivingCompleted: boolean;
  doneCount: number;
  loading: boolean;
  orderSortDirection: OrderSortDirection;
  pauseMinutes: number;
  receivedCount: number;
  refreshing: boolean;
  savingStoreStatus: boolean;
  storeStatus: StoreStatus;
  onArchiveClick: () => void;
  onCancelPendingPaused: () => void;
  onConfirmPaused: () => Promise<void>;
  onPauseMinutesChange: (updater: (minutes: number) => number) => void;
  onRefresh: () => Promise<void>;
  onSortToggle: () => void;
  onStatusChange: (status: StoreStatus) => Promise<void>;
  onTabChange: (tab: BoardTab) => void;
};

export function KdsTopbar({
  activeTab,
  archivingCompleted,
  doneCount,
  loading,
  orderSortDirection,
  pauseMinutes,
  receivedCount,
  refreshing,
  savingStoreStatus,
  storeStatus,
  onArchiveClick,
  onCancelPendingPaused,
  onConfirmPaused,
  onPauseMinutesChange,
  onRefresh,
  onSortToggle,
  onStatusChange,
  onTabChange,
}: KdsTopbarProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const isWorkTab = activeTab === "RECEIVED" || activeTab === "DONE" || activeTab === "MY_TASKS";
  const showOrderControls = activeTab === "RECEIVED" || activeTab === "DONE";
  const showArchiveAction = isWorkTab && activeTab === "DONE" && doneCount > 0;

  useEffect(() => {
    setFabOpen(false);
  }, [activeTab]);

  return (
    <>
      <header className={`kds-topbar kds-topbar--${activeTab.toLowerCase()}`}>
        <div className="kds-topbar-left">
          {isWorkTab ? (
            <div className="kds-topbar-status-slot">
              <StoreStatusControl
                pauseMinutes={pauseMinutes}
                saving={savingStoreStatus}
                status={storeStatus}
                onCancelPendingPaused={onCancelPendingPaused}
                onConfirmPaused={onConfirmPaused}
                onPauseMinutesChange={onPauseMinutesChange}
                onStatusChange={onStatusChange}
              />
            </div>
          ) : null}
        </div>

        {isWorkTab ? (
          <div className="kds-topbar-tabs" role="tablist">
            <button
              aria-selected={activeTab === "RECEIVED"}
              className={`kds-tab${activeTab === "RECEIVED" ? " active" : ""}`}
              onClick={() => onTabChange("RECEIVED")}
              role="tab"
              type="button"
            >
              접수
              {receivedCount > 0 ? <span className="kds-tab-count">{receivedCount}</span> : null}
            </button>
            <button
              aria-selected={activeTab === "DONE"}
              className={`kds-tab${activeTab === "DONE" ? " active" : ""}`}
              onClick={() => onTabChange("DONE")}
              role="tab"
              type="button"
            >
              완료
              {doneCount > 0 ? <span className="kds-tab-count">{doneCount}</span> : null}
            </button>
            <button
              aria-selected={activeTab === "MY_TASKS"}
              className={`kds-tab${activeTab === "MY_TASKS" ? " active" : ""}`}
              onClick={() => onTabChange("MY_TASKS")}
              role="tab"
              type="button"
            >
              내 업무
            </button>
          </div>
        ) : (
          <div className="kds-topbar-page-title">
            {activeTab === "STAFF"
              ? "직원 관리"
              : activeTab === "STATS"
              ? "통계"
              : activeTab === "SUPPORT"
              ? "고객지원"
              : "설정"}
          </div>
        )}

        <div className="kds-topbar-right">
          {showArchiveAction ? (
            <button
              aria-label="완료 주문 내역 정리"
              className="kds-icon-btn kds-topbar-action-btn"
              disabled={archivingCompleted}
              onClick={onArchiveClick}
              title="완료 주문 정리"
              type="button"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          ) : null}
          {showOrderControls ? (
            <>
              <button
                aria-label={
                  orderSortDirection === "newest-first"
                    ? "현재 최신 주문 우선, 클릭하여 과거 주문 우선으로 변경"
                    : "현재 과거 주문 우선, 클릭하여 최신 주문 우선으로 변경"
                }
                className="kds-icon-btn kds-topbar-action-btn"
                onClick={onSortToggle}
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
                className={`kds-icon-btn kds-refresh-btn${loading || refreshing ? " spinning" : ""}`}
                disabled={loading || refreshing}
                onClick={() => void onRefresh()}
                type="button"
              >
                <RefreshCw size={15} aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </header>

      {isWorkTab ? (
        <div className={`kds-mobile-fab${fabOpen ? " open" : ""}`}>
          {fabOpen ? (
            <button
              className="kds-mobile-fab-overlay"
              aria-label="주문 작업 메뉴 닫기"
              onClick={() => setFabOpen(false)}
              type="button"
            />
          ) : null}
          {fabOpen ? (
            <div className="kds-mobile-fab-menu" aria-label="주문 작업" role="group">
              <div className="kds-mobile-fab-status">
                <StoreStatusControl
                  pauseMinutes={pauseMinutes}
                  saving={savingStoreStatus}
                  status={storeStatus}
                  onCancelPendingPaused={onCancelPendingPaused}
                  onConfirmPaused={onConfirmPaused}
                  onPauseMinutesChange={onPauseMinutesChange}
                  onStatusChange={onStatusChange}
                />
              </div>
              {showOrderControls ? (
                <button
                  className="kds-mobile-fab-action"
                  onClick={() => {
                    onSortToggle();
                    setFabOpen(false);
                  }}
                  type="button"
                >
                  {orderSortDirection === "newest-first" ? (
                    <ClockArrowDown size={17} aria-hidden="true" />
                  ) : (
                    <ClockArrowUp size={17} aria-hidden="true" />
                  )}
                  <span>{orderSortDirection === "newest-first" ? "최신 주문 우선" : "과거 주문 우선"}</span>
                </button>
              ) : null}
              {showArchiveAction ? (
                <button
                  className="kds-mobile-fab-action danger"
                  disabled={archivingCompleted}
                  onClick={() => {
                    onArchiveClick();
                    setFabOpen(false);
                  }}
                  type="button"
                >
                  <Trash2 size={17} aria-hidden="true" />
                  <span>완료 주문 정리</span>
                </button>
              ) : null}
            </div>
          ) : null}
          <button
            aria-expanded={fabOpen}
            aria-label={fabOpen ? "주문 작업 메뉴 닫기" : "주문 작업 메뉴 열기"}
            className="kds-mobile-fab-button"
            onClick={() => setFabOpen((value) => !value)}
            type="button"
          >
            {fabOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      ) : null}
    </>
  );
}
