import type { ReactNode } from "react";

import type { AuthSession } from "@/types";
import type { BoardTab, OrderSortDirection, StoreStatus } from "@/features/kds/types";
import { KdsSidebar } from "./KdsSidebar";
import { KdsTopbar } from "./KdsTopbar";

export interface KdsShellProps {
  /** Sidebar */
  activeOrderCount: number;
  activeTab: BoardTab;
  isManager: boolean;
  loggingOut: boolean;
  session: AuthSession;
  sidebarOpen: boolean;
  onLogout: () => Promise<void>;
  onSidebarOpenChange: (open: boolean) => void;
  onTabChange: (tab: BoardTab) => void;

  /** Topbar */
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

  /** Content slot */
  children: ReactNode;
  /** Optional notice bar content */
  notice?: ReactNode;
}

/**
 * KdsShell — owns the full-viewport layout scaffold.
 *
 * Responsibilities:
 *   - sidebar + mobile overlay positioning
 *   - topbar positioning
 *   - main content slot
 *   - semantic landmark markup
 *
 * Forbidden responsibilities:
 *   - order polling / business state
 *   - settings save
 *   - stats queries
 *   - support session logic
 */
export function KdsShell({
  activeOrderCount,
  activeTab,
  archivingCompleted,
  children,
  doneCount,
  isManager,
  loading,
  loggingOut,
  notice,
  onArchiveClick,
  onCancelPendingPaused,
  onConfirmPaused,
  onLogout,
  onPauseMinutesChange,
  onRefresh,
  onSidebarOpenChange,
  onSortToggle,
  onStatusChange,
  onTabChange,
  orderSortDirection,
  pauseMinutes,
  receivedCount,
  refreshing,
  savingStoreStatus,
  session,
  sidebarOpen,
  storeStatus,
}: KdsShellProps) {
  return (
    <div className="kds-shell">
      <KdsSidebar
        activeOrderCount={activeOrderCount}
        activeTab={activeTab}
        isManager={isManager}
        loggingOut={loggingOut}
        open={sidebarOpen}
        session={session}
        onLogout={onLogout}
        onOpenChange={onSidebarOpenChange}
        onTabChange={onTabChange}
      />

      <div className="kds-main">
        <KdsTopbar
          activeTab={activeTab}
          archivingCompleted={archivingCompleted}
          doneCount={doneCount}
          loading={loading}
          orderSortDirection={orderSortDirection}
          pauseMinutes={pauseMinutes}
          receivedCount={receivedCount}
          refreshing={refreshing}
          savingStoreStatus={savingStoreStatus}
          storeStatus={storeStatus}
          onArchiveClick={onArchiveClick}
          onCancelPendingPaused={onCancelPendingPaused}
          onConfirmPaused={onConfirmPaused}
          onPauseMinutesChange={onPauseMinutesChange}
          onRefresh={onRefresh}
          onSortToggle={onSortToggle}
          onStatusChange={onStatusChange}
          onTabChange={onTabChange}
        />

        {notice}

        <main>{children}</main>
      </div>
    </div>
  );
}
