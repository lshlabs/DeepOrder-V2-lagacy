import { useState } from "react";

import { ClearCompletedDialog } from "@/features/kds/orders/components/ClearCompletedDialog";
import { OrderBoard } from "@/features/kds/orders/components/OrderBoard";
import { OrderContextMenu } from "@/features/kds/orders/components/OrderContextMenu";
import { OrderDetailModal } from "@/features/kds/orders/components/OrderDetailModal";
import { RemoveOrderDialog } from "@/features/kds/orders/components/RemoveOrderDialog";
import { ChangePasswordModal } from "@/features/settings/components/ChangePasswordModal";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { StaffPanel } from "@/features/kds/staff/components/StaffPanel";
import { StatsPanel } from "@/features/kds/stats/components/StatsPanel";
import { MyTasksPanel } from "@/features/kds/tasks/components/MyTasksPanel";
import { ChatbotFab } from "@/features/kds/support/components/ChatbotFab";
import { SupportPanel } from "@/features/kds/support/components/SupportPanel";
import { useAssignedMenus } from "@/features/kds/tasks/hooks/useAssignedMenus";
import { useKdsClock } from "@/lib/date/use-clock";
import { useKdsOrders } from "@/features/kds/orders/hooks/useKdsOrders";
import { useOrderOverlays } from "@/features/kds/orders/hooks/useOrderOverlays";
import { useKdsSettings } from "@/features/settings/hooks/useKdsSettings";
import { useStoreContext } from "@/features/store-status/hooks/useStoreContext";

import { notify } from "@/lib/notify";
import { KdsShell } from "@/components/layout/KdsShell";
import type { AuthSession } from "@/types";
import type { BoardTab } from "@/features/kds/types";

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
    showToast: notify,
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
    showToast: notify,
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
    showToast: notify,
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
    showToast: notify,
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
    if (
      tab === "MY_TASKS" ||
      tab === "STAFF" ||
      tab === "STATS" ||
      tab === "SETTINGS" ||
      tab === "RECEIVED" ||
      tab === "SUPPORT"
    ) {
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

  const notice =
    counts.CANCELLED > 0 ? (
      <div className="kds-notice-bar">
        취소 주문 {counts.CANCELLED}건은 보드에서 제외되어 집계로만 관리됩니다.
      </div>
    ) : null;

  return (
    <>
      <KdsShell
        activeOrderCount={counts.NEW + counts.COOKING}
        activeTab={activeTab}
        archivingCompleted={archivingCompleted}
        doneCount={doneOrders.length}
        isManager={isManager}
        loading={loading}
        loggingOut={loggingOut}
        notice={notice}
        orderSortDirection={orderSortDirection}
        pauseMinutes={pauseMinutes}
        receivedCount={receivedOrders.length}
        refreshing={refreshing}
        savingStoreStatus={savingStoreStatus}
        session={session}
        sidebarOpen={sidebarOpen}
        storeStatus={storeStatus}
        onArchiveClick={() => setClearDoneConfirm(true)}
        onCancelPendingPaused={revertPendingPausedStatus}
        onConfirmPaused={confirmStoreStatusChange}
        onLogout={handleLogout}
        onPauseMinutesChange={(updater) => setPauseMinutes(updater)}
        onRefresh={handleRefreshAll}
        onSidebarOpenChange={setSidebarOpen}
        onSortToggle={() =>
          setOrderSortDirection(
            orderSortDirection === "newest-first" ? "oldest-first" : "newest-first",
          )
        }
        onStatusChange={changeStoreStatus}
        onTabChange={handleTopbarTabChange}
      >
        {activeTab === "MY_TASKS" ? (
          <div className="kds-panel-shell">
            <MyTasksPanel
              assignedMenus={assignedMenus}
              loading={assignedMenusLoading}
              now={now}
              onCreateAssignedMenu={createAssignedMenu}
              onDeleteAssignedMenu={deleteAssignedMenu}
              onUpdateAssignedMenu={updateAssignedMenu}
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
              onChangePasswordClick={openChangePasswordModal}
              disabled={settingsDisabled}
            />
          </div>
        ) : activeTab === "SUPPORT" ? (
          <div className="kds-panel-shell">
            <SupportPanel />
            <ChatbotFab />
          </div>
        ) : (
          <OrderBoard
            orders={activeOrders}
            pinnedOrderIds={pinnedOrderIds}
            loading={loading}
            newOrderSignal={newOrderSignal}
            now={now}
            refreshing={refreshing}
            updatingOrderId={updatingOrderId}
            updatingItemId={updatingOrderItemId}
            emptyMessage={activeTab === "RECEIVED" ? "접수된 주문이 없습니다" : "완료된 주문이 없습니다"}
            onRefresh={handleRefreshAll}
            onUpdateStatus={updateOrderStatus}
            onCycleItem={cycleOrderItem}
            onCycleItemOption={cycleOrderItemOption}
            onOpenContextMenu={openContextMenu}
          />
        )}
      </KdsShell>

      <OrderContextMenu
        canPin={contextOrder?.status === "NEW" || contextOrder?.status === "COOKING"}
        contextMenu={contextMenu}
        isPinned={contextMenu ? pinnedOrderIds.includes(contextMenu.orderId) : false}
        onClose={closeContextMenu}
        onOpenDetail={openOrderDetail}
        onOpenRemove={openRemoveOrder}
        onTogglePinned={togglePinnedOrder}
      />

      <OrderDetailModal order={selectedOrder} onClose={closeOrderDetail} />

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
        showToast={notify}
      />
    </>
  );
}
