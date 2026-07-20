import { useRef, useState } from "react";
import { LogOut } from "lucide-react";

import { PopoverPanel } from "@/components/ui";

type KdsAccountMenuProps = {
  loggingOut: boolean;
  loginId: string;
  sidebarOpen: boolean;
  storeName: string;
  userName: string | null;
  onLogout: () => Promise<void>;
};

export function KdsAccountMenu({
  loggingOut,
  loginId,
  sidebarOpen,
  storeName,
  userName,
  onLogout,
}: KdsAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initials = (userName ?? storeName ?? "?").slice(0, 2).toUpperCase();

  async function handleLogout() {
    setOpen(false);
    await onLogout();
  }

  return (
    <div className="kds-sidebar-account">
      <PopoverPanel
        ariaLabel="계정 정보"
        className="kds-account-popover"
        onClose={() => setOpen(false)}
        open={open}
        positioning={open ? { align: "end", anchorEl, side: "top" } : null}
        role="dialog"
      >
        <div className="kds-account-popover-surface">
          <div className="kds-account-popover-info">
            <div className="kds-account-avatar large">{initials}</div>
            <div>
              <p className="kds-account-name">{userName ?? storeName}</p>
              <p className="kds-account-login-id">{loginId}</p>
            </div>
          </div>
          <div className="kds-account-popover-divider" />
          <button
            className="kds-account-popover-item signout"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            type="button"
          >
            <LogOut size={18} aria-hidden="true" />
            {loggingOut ? "로그아웃 중…" : "로그아웃"}
          </button>
        </div>
      </PopoverPanel>

      <button
        className={`kds-account-trigger${open ? " active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        onPointerDown={(event) => setAnchorEl(event.currentTarget)}
        ref={triggerRef}
        type="button"
        title={storeName}
        aria-expanded={open}
      >
        <div className="kds-account-avatar">{initials}</div>
        {sidebarOpen ? <span className="kds-account-trigger-name">{storeName}</span> : null}
      </button>
    </div>
  );
}
