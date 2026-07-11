import { KdsSectionRenderer } from "@/app/kds/KdsSectionRenderer";
import { useKdsWorkspace } from "@/app/kds/model/use-kds-workspace";
import { ClearCompletedDialog } from "@/features/orders/components/ClearCompletedDialog";
import { OrderContextMenu } from "@/features/orders/components/OrderContextMenu";
import { OrderDetailModal } from "@/features/orders/components/OrderDetailModal";
import { RemoveOrderDialog } from "@/features/orders/components/RemoveOrderDialog";
import { ChangePasswordModal } from "@/features/settings/components/ChangePasswordModal";
import { KdsShell } from "@/components/layout/KdsShell";
import { notify } from "@/lib/notify";
import type { AuthSession } from "@/lib/types";

type KdsPageProps = {
  session: AuthSession;
  onLogout: () => Promise<void>;
  onUnauthorized: () => Promise<string | null>;
};

export function KdsPage({ session, onLogout, onUnauthorized }: KdsPageProps) {
  const ws = useKdsWorkspace({ session, onUnauthorized });

  const notice =
    ws.orders.counts.CANCELLED > 0 ? (
      <div className="flex items-center justify-center bg-amber-500/10 px-4 py-2 text-[12px] font-semibold text-[var(--color-amber)]">
        취소 주문 {ws.orders.counts.CANCELLED}건은 보드에서 제외되어 집계로만 관리됩니다.
      </div>
    ) : null;

  return (
    <>
      <KdsShell
        activeOrderCount={ws.orders.counts.NEW + ws.orders.counts.COOKING}
        activeTab={ws.activeTab}
        archivingCompleted={ws.orders.archivingCompleted}
        doneCount={ws.orders.doneOrders.length}
        isManager={ws.isManager}
        loading={ws.orders.loading}
        loggingOut={ws.loggingOut}
        notice={notice}
        orderSortDirection={ws.orders.orderSortDirection}
        pauseMinutes={ws.storeState.pauseMinutes}
        receivedCount={ws.orders.receivedOrders.length}
        refreshing={ws.orders.refreshing}
        savingStoreStatus={ws.storeState.savingStoreStatus}
        session={session}
        sidebarOpen={ws.sidebarOpen}
        storeStatus={ws.storeState.storeStatus}
        onArchiveClick={() => ws.setClearDoneConfirm(true)}
        onCancelPendingPaused={ws.storeState.revertPendingPausedStatus}
        onConfirmPaused={ws.storeState.confirmStoreStatusChange}
        onLogout={() => ws.handleLogout(onLogout)}
        onPauseMinutesChange={ws.storeState.setPauseMinutes}
        onRefresh={ws.handleRefreshAll}
        onSidebarOpenChange={ws.setSidebarOpen}
        onSortToggle={() =>
          ws.setOrderSortDirection(
            ws.orders.orderSortDirection === "newest-first" ? "oldest-first" : "newest-first",
          )
        }
        onStatusChange={ws.storeState.changeStoreStatus}
        onTabChange={ws.handleTopbarTabChange}
      >
        <KdsSectionRenderer
          activeTab={ws.activeTab}
          assignedMenusState={ws.assignedMenusState}
          handleRefreshAll={ws.handleRefreshAll}
          isManager={ws.isManager}
          now={ws.now}
          openChangePasswordModal={ws.openChangePasswordModal}
          orders={ws.orders}
          overlays={ws.overlays}
          session={session}
          onUnauthorized={onUnauthorized}
          settingsDisabled={ws.settingsDisabled}
          settingsState={ws.settingsState}
        />
      </KdsShell>

      <OrderContextMenu
        canPin={
          ws.overlays.contextOrder?.status === "NEW" ||
          ws.overlays.contextOrder?.status === "COOKING"
        }
        contextMenu={ws.overlays.contextMenu}
        isPinned={
          ws.overlays.contextMenu
            ? ws.overlays.pinnedOrderIds.includes(ws.overlays.contextMenu.orderId)
            : false
        }
        onClose={ws.overlays.closeContextMenu}
        onOpenDetail={ws.overlays.openOrderDetail}
        onOpenRemove={ws.overlays.openRemoveOrder}
        onTogglePinned={ws.overlays.togglePinnedOrder}
      />

      <OrderDetailModal order={ws.overlays.selectedOrder} onClose={ws.overlays.closeOrderDetail} />

      <RemoveOrderDialog
        open={ws.overlays.removeOrderId !== null}
        submitting={
          ws.overlays.removeOrderId !== null &&
          ws.orders.hidingOrderId === ws.overlays.removeOrderId
        }
        onCancel={ws.overlays.cancelRemoveOrder}
        onConfirm={ws.overlays.confirmRemoveOrder}
      />

      <ClearCompletedDialog
        open={ws.clearDoneConfirm}
        submitting={ws.orders.archivingCompleted}
        onCancel={() => ws.setClearDoneConfirm(false)}
        onConfirm={ws.handleConfirmClearCompleted}
      />

      <ChangePasswordModal
        accessToken={session.accessToken}
        open={ws.pwModal}
        onClose={() => ws.setPwModal(false)}
        onLogout={onLogout}
        onUnauthorized={onUnauthorized}
        showToast={notify}
      />
    </>
  );
}
