import { useState } from "react";

import { useAssignedMenus } from "@/features/tasks/hooks/useAssignedMenus";
import { useKdsClock } from "@/lib/date/use-clock";
import { useKdsOrders } from "@/features/orders/hooks/useKdsOrders";
import { useKdsSettings } from "@/features/settings/hooks/useKdsSettings";
import { useOrderOverlays } from "@/features/orders/hooks/useOrderOverlays";
import { useStoreContext } from "@/features/store-status/hooks/useStoreContext";
import { notify } from "@/lib/notify";
import type { AuthSession } from "@/lib/types";
import type { BoardTab } from "@/lib/kds-types";

type UseKdsWorkspaceOptions = {
  session: AuthSession;
  onUnauthorized: () => Promise<string | null>;
};

export function useKdsWorkspace({ session, onUnauthorized }: UseKdsWorkspaceOptions) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<BoardTab>("RECEIVED");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clearDoneConfirm, setClearDoneConfirm] = useState(false);
  const [pwModal, setPwModal] = useState(false);

  const now = useKdsClock();

  const orders = useKdsOrders({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast: notify,
  });

  const assignedMenusState = useAssignedMenus({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast: notify,
  });

  const settingsState = useKdsSettings({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast: notify,
  });

  const storeState = useStoreContext({
    accessToken: session.accessToken,
    onUnauthorized,
    showToast: notify,
  });

  const overlays = useOrderOverlays({
    activeTab,
    doneOrders: orders.doneOrders,
    hideOrder: orders.hideOrder,
    orders: orders.orders,
    receivedOrders: orders.receivedOrders,
  });

  const isManager = session.user.accountType !== "EMPLOYEE";
  const settingsDisabled = settingsState.loading || settingsState.saving;

  async function handleLogout(onLogout: () => Promise<void>) {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleRefreshAll() {
    await orders.runManualRefresh(() =>
      Promise.all([
        orders.refreshOrders(),
        storeState.refreshStoreContext(),
        settingsState.refreshSettings(),
        assignedMenusState.refreshAssignedMenus(),
      ]).then(() => undefined),
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
    void orders.archiveCompletedOrders().then((success) => {
      if (success) {
        setClearDoneConfirm(false);
      }
    });
  }

  return {
    // UI state
    activeTab,
    clearDoneConfirm,
    isManager,
    loggingOut,
    now,
    pwModal,
    settingsDisabled,
    sidebarOpen,
    // orders
    orders,
    // panels
    assignedMenusState,
    settingsState,
    storeState,
    overlays,
    // handlers
    handleConfirmClearCompleted,
    handleLogout,
    handleRefreshAll,
    handleTopbarTabChange,
    openChangePasswordModal: () => setPwModal(true),
    setClearDoneConfirm,
    setSidebarOpen,
    setOrderSortDirection: orders.setOrderSortDirection,
    setPwModal,
  };
}
