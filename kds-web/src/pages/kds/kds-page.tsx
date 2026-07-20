import { useState } from "react";

import { KdsSidebar, KdsTopbar, type BoardTab } from "@/components/layout";
import { KdsToast } from "@/components/ui";
import type { AuthSession } from "@/features/auth";
import {
  ClearCompletedDialog,
  OrderContextMenu,
  OrderDetailModal,
  RemoveOrderDialog,
  useKdsOrders,
  useOrderOverlays,
} from "@/features/orders";
import { ChangePasswordModal, useKdsSettings } from "@/features/settings";
import { StoreStatusControl, useStoreContext } from "@/features/store-status";
import { useAssignedMenus } from "@/features/tasks";
import { useKdsClock, useToast } from "@/hooks";

import { CompletedOrdersPage } from "./completed-orders-page";
import { IncomingOrdersPage } from "./incoming-orders-page";
import { SettingsPage } from "./settings-page";
import { StaffPage } from "./staff-page";
import { StatsPage } from "./stats-page";
import { SupportPage } from "./support-page";
import { TasksPage } from "./tasks-page";

type KdsPageProps = {
  session: AuthSession;
  onLogout: () => Promise<void>;
  onUnauthorized: () => Promise<string | null>;
};

export function KdsPage({ session, onLogout, onUnauthorized }: KdsPageProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<BoardTab>("RECEIVED");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clearDoneConfirm, setClearDoneConfirm] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const { hideToast, showToast, toast } = useToast();
  const now = useKdsClock();
  const {
    archiveCompletedOrders,
    archivingCompleted,
    boardOrders,
    counts,
    cycleOrderItem,
    cycleOrderItemOption,
    doneOrders,
    hideOrder,
    hidingOrderId,
    loading,
    newOrderSignal,
    orderSortDirection,
    orders,
    receivedOrders,
    refreshOrders,
    refreshing,
    runManualRefresh,
    setOrderSortDirection,
    updateOrderStatus,
    updatingOrderId,
    updatingOrderItemId,
  } = useKdsOrders({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast,
  });
  const {
    assignedMenus,
    createAssignedMenu,
    deleteAssignedMenu,
    loading: assignedMenusLoading,
    refreshAssignedMenus,
    saving: assignedMenusSaving,
    updateAssignedMenu,
  } = useAssignedMenus({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast,
  });
  const {
    loading: storeSettingsLoading,
    refreshSettings,
    saving: savingSettings,
    settings,
    updateSettings,
  } = useKdsSettings({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast,
  });
  const {
    changeStoreStatus,
    confirmStoreStatusChange,
    pauseMinutes,
    refreshStoreContext,
    revertPendingPausedStatus,
    savingStoreStatus,
    setPauseMinutes,
    storeStatus,
  } = useStoreContext({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast,
  });
  const {
    activeOrders,
    cancelRemoveOrder,
    closeContextMenu,
    closeOrderDetail,
    confirmRemoveOrder,
    contextMenu,
    contextOrder,
    openContextMenu,
    openOrderDetail,
    openRemoveOrder,
    pinnedOrderIds,
    removeOrderId,
    selectedOrder,
    togglePinnedOrder,
  } = useOrderOverlays({
    activeTab,
    doneOrders,
    hideOrder,
    orders,
    receivedOrders,
  });

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  function openChangePasswordModal() {
    setPwModal(true);
  }

  function handleRefreshAll() {
    return runManualRefresh(() =>
      Promise.all([
        refreshOrders(),
        refreshStoreContext(),
        refreshSettings(),
        refreshAssignedMenus(),
      ]).then(() => undefined)
    );
  }

  function handleTopbarTabChange(tab: BoardTab) {
    setActiveTab(tab);
    if (tab === "MY_TASKS" || tab === "STAFF" || tab === "STATS" || tab === "SETTINGS" || tab === "RECEIVED" || tab === "SUPPORT") {
      setSidebarOpen(false);
    }
  }

  function handleConfirmClearCompleted() {
    void archiveCompletedOrders().then((success) => {
      if (success) {
        setClearDoneConfirm(false);
      }
    });
  }

  const isManager = session.user.accountType !== "EMPLOYEE";
  const settingsDisabled = storeSettingsLoading || savingSettings;

  return (
    <div className="kds-shell">
      <KdsSidebar
        activeOrderCount={counts.NEW + counts.COOKING}
        activeTab={activeTab}
        isManager={isManager}
        loginId={session.user.loginId}
        loggingOut={loggingOut}
        open={sidebarOpen}
        storeName={session.store.storeName}
        userName={session.user.name}
        onLogout={handleLogout}
        onOpenChange={setSidebarOpen}
        onTabChange={setActiveTab}
      />

      <div className="kds-main">
        <KdsTopbar
          activeTab={activeTab}
          archivingCompleted={archivingCompleted}
          doneCount={doneOrders.length}
          loading={loading}
          orderSortDirection={orderSortDirection}
          receivedCount={receivedOrders.length}
          refreshing={refreshing}
          renderStoreStatusControl={() => (
            <StoreStatusControl
              pauseMinutes={pauseMinutes}
              saving={savingStoreStatus}
              status={storeStatus}
              onCancelPendingPaused={revertPendingPausedStatus}
              onConfirmPaused={confirmStoreStatusChange}
              onPauseMinutesChange={(updater) => setPauseMinutes(updater)}
              onStatusChange={changeStoreStatus}
            />
          )}
          onArchiveClick={() => setClearDoneConfirm(true)}
          onRefresh={handleRefreshAll}
          onSortToggle={() => setOrderSortDirection(
            orderSortDirection === "newest-first" ? "oldest-first" : "newest-first",
          )}
          onTabChange={handleTopbarTabChange}
        />

        {counts.CANCELLED > 0 ? (
          <div className="kds-notice-bar">취소 주문 {counts.CANCELLED}건은 보드에서 제외되어 집계로만 관리됩니다.</div>
        ) : null}

        {activeTab === "MY_TASKS" ? (
          <TasksPage
            assignedMenus={assignedMenus}
            loading={assignedMenusLoading}
            now={now}
            onCreateAssignedMenu={createAssignedMenu}
            onDeleteAssignedMenu={deleteAssignedMenu}
            onUpdateAssignedMenu={updateAssignedMenu}
            orders={boardOrders}
            saving={assignedMenusSaving}
          />
        ) : activeTab === "STAFF" && isManager ? (
          <StaffPage onUnauthorized={onUnauthorized} session={session} />
        ) : activeTab === "STATS" ? (
          <StatsPage orders={orders} />
        ) : activeTab === "SETTINGS" ? (
          <SettingsPage
            settings={settings}
            onUpdate={updateSettings}
            onChangePasswordClick={openChangePasswordModal}
            disabled={settingsDisabled}
          />
        ) : activeTab === "SUPPORT" ? (
          <SupportPage />
        ) : activeTab === "RECEIVED" ? (
          <IncomingOrdersPage
            orders={activeOrders}
            pinnedOrderIds={pinnedOrderIds}
            loading={loading}
            newOrderSignal={newOrderSignal}
            now={now}
            refreshing={refreshing}
            updatingOrderId={updatingOrderId}
            updatingItemId={updatingOrderItemId}
            emptyMessage="접수된 주문이 없습니다"
            onRefresh={handleRefreshAll}
            onUpdateStatus={updateOrderStatus}
            onCycleItem={cycleOrderItem}
            onCycleItemOption={cycleOrderItemOption}
            onOpenContextMenu={openContextMenu}
          />
        ) : (
          <CompletedOrdersPage
            orders={activeOrders}
            pinnedOrderIds={pinnedOrderIds}
            loading={loading}
            newOrderSignal={newOrderSignal}
            now={now}
            refreshing={refreshing}
            updatingOrderId={updatingOrderId}
            updatingItemId={updatingOrderItemId}
            emptyMessage="완료된 주문이 없습니다"
            onRefresh={handleRefreshAll}
            onUpdateStatus={updateOrderStatus}
            onCycleItem={cycleOrderItem}
            onCycleItemOption={cycleOrderItemOption}
            onOpenContextMenu={openContextMenu}
          />
        )}
      </div>

      <OrderContextMenu
        canPin={contextOrder?.status === "NEW" || contextOrder?.status === "COOKING"}
        contextMenu={contextMenu}
        isPinned={contextMenu ? pinnedOrderIds.includes(contextMenu.orderId) : false}
        onClose={closeContextMenu}
        onOpenDetail={openOrderDetail}
        onOpenRemove={openRemoveOrder}
        onTogglePinned={togglePinnedOrder}
      />

      <OrderDetailModal
        order={selectedOrder}
        onClose={closeOrderDetail}
      />

      <RemoveOrderDialog
        open={removeOrderId !== null}
        submitting={removeOrderId !== null && hidingOrderId === removeOrderId}
        onCancel={cancelRemoveOrder}
        onConfirm={confirmRemoveOrder}
      />

      <ClearCompletedDialog
        open={clearDoneConfirm}
        submitting={archivingCompleted}
        onCancel={() => setClearDoneConfirm(false)}
        onConfirm={handleConfirmClearCompleted}
      />

      <ChangePasswordModal
        accessToken={session.accessToken}
        open={pwModal}
        onClose={() => setPwModal(false)}
        onLogout={onLogout}
        onUnauthorized={onUnauthorized}
        showToast={showToast}
      />

      <KdsToast toast={toast} onClose={hideToast} />
    </div>
  );
}
