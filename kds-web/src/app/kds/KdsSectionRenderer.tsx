import { ChatbotFab } from "@/features/support/components/ChatbotFab";
import { MyTasksPanel } from "@/features/tasks/components/MyTasksPanel";
import { OrderBoard } from "@/features/orders/components/OrderBoard";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { StaffPanel } from "@/features/staff/components/StaffPanel";
import { StatsPanel } from "@/features/stats/components/StatsPanel";
import { SupportPanel } from "@/features/support/components/SupportPanel";
import type { AuthSession } from "@/lib/types";
import type { BoardTab } from "@/lib/kds-types";
import type { useKdsWorkspace } from "./model/use-kds-workspace";

type KdsSectionRendererProps = {
  activeTab: BoardTab;
  isManager: boolean;
  now: number;
  session: AuthSession;
  onUnauthorized: () => Promise<string | null>;
  openChangePasswordModal: () => void;
  orders: ReturnType<typeof useKdsWorkspace>["orders"];
  assignedMenusState: ReturnType<typeof useKdsWorkspace>["assignedMenusState"];
  settingsState: ReturnType<typeof useKdsWorkspace>["settingsState"];
  overlays: ReturnType<typeof useKdsWorkspace>["overlays"];
  settingsDisabled: boolean;
  handleRefreshAll: () => Promise<void>;
};

export function KdsSectionRenderer({
  activeTab,
  assignedMenusState,
  handleRefreshAll,
  isManager,
  now,
  openChangePasswordModal,
  orders,
  overlays,
  session,
  onUnauthorized,
  settingsDisabled,
  settingsState,
}: KdsSectionRendererProps) {
  if (activeTab === "MY_TASKS") {
    return (
      <div className="kds-panel-shell">
        <MyTasksPanel
          assignedMenus={assignedMenusState.assignedMenus}
          loading={assignedMenusState.loading}
          now={now}
          onCreateAssignedMenu={assignedMenusState.createAssignedMenu}
          onDeleteAssignedMenu={assignedMenusState.deleteAssignedMenu}
          onUpdateAssignedMenu={assignedMenusState.updateAssignedMenu}
          orders={orders.boardOrders}
          saving={assignedMenusState.saving}
        />
      </div>
    );
  }

  if (activeTab === "STAFF" && isManager) {
    return (
      <div className="kds-panel-shell">
        <StaffPanel onUnauthorized={onUnauthorized} session={session} />
      </div>
    );
  }

  if (activeTab === "STATS") {
    return <StatsPanel orders={orders.orders} />;
  }

  if (activeTab === "SETTINGS") {
    return (
      <div className="kds-panel-shell">
        <SettingsPanel
          disabled={settingsDisabled}
          settings={settingsState.settings}
          onChangePasswordClick={openChangePasswordModal}
          onUpdate={settingsState.updateSettings}
        />
      </div>
    );
  }

  if (activeTab === "SUPPORT") {
    return (
      <div className="kds-panel-shell">
        <SupportPanel />
        <ChatbotFab />
      </div>
    );
  }

  // RECEIVED | DONE
  return (
    <OrderBoard
      emptyMessage={activeTab === "RECEIVED" ? "접수된 주문이 없습니다" : "완료된 주문이 없습니다"}
      loading={orders.loading}
      newOrderSignal={orders.newOrderSignal}
      now={now}
      orders={overlays.activeOrders}
      pinnedOrderIds={overlays.pinnedOrderIds}
      refreshing={orders.refreshing}
      updatingItemId={orders.updatingOrderItemId}
      updatingOrderId={orders.updatingOrderId}
      onCycleItem={orders.cycleOrderItem}
      onCycleItemOption={orders.cycleOrderItemOption}
      onOpenContextMenu={overlays.openContextMenu}
      onRefresh={handleRefreshAll}
      onUpdateStatus={orders.updateOrderStatus}
    />
  );
}
