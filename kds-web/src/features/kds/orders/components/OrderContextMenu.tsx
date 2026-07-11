import { Info, Pin, PinOff, Trash2 } from "lucide-react";

import { ActionMenu } from "@/components/layout/ActionMenu";

type OrderContextMenuProps = {
  canPin: boolean;
  contextMenu: { orderId: number; x: number; y: number } | null;
  isPinned: boolean;
  onClose: () => void;
  onOpenDetail: (orderId: number) => void;
  onOpenRemove: (orderId: number) => void;
  onTogglePinned: (orderId: number) => void;
};

export function OrderContextMenu({
  canPin,
  contextMenu,
  isPinned,
  onClose,
  onOpenDetail,
  onOpenRemove,
  onTogglePinned,
}: OrderContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <ActionMenu
      ariaLabel="주문 작업"
      className="kds-context-menu"
      onClose={onClose}
      open
      positioning={{ mode: "point", x: contextMenu.x, y: contextMenu.y }}
    >
      <button
        className="kds-context-menu-item"
        onClick={() => onOpenDetail(contextMenu.orderId)}
        role="menuitem"
        type="button"
      >
        <Info size={18} aria-hidden="true" />
        상세정보
      </button>
      {canPin ? (
        <button
          className="kds-context-menu-item"
          onClick={() => onTogglePinned(contextMenu.orderId)}
          role="menuitem"
          type="button"
        >
          {isPinned ? <PinOff size={18} aria-hidden="true" /> : <Pin size={18} aria-hidden="true" />}
          {isPinned ? "고정 해제" : "고정하기"}
        </button>
      ) : null}
      <button
        className="kds-context-menu-item danger"
        onClick={() => onOpenRemove(contextMenu.orderId)}
        role="menuitem"
        type="button"
      >
        <Trash2 size={18} aria-hidden="true" />
        제거
      </button>
    </ActionMenu>
  );
}
