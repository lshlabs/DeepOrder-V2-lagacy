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
      className={[
        "animate-kds-floating-in",
        "bg-[var(--color-surface)] border border-[var(--color-border)]",
        "rounded-[var(--radius-md)] shadow-[var(--shadow-floating)]",
        "min-w-[152px] overflow-hidden p-[var(--kds-floating-padding-menu)]",
        "fixed z-[var(--z-floating)]",
      ].join(" ")}
      onClose={onClose}
      open
      positioning={{ mode: "point", x: contextMenu.x, y: contextMenu.y }}
    >
      <button
        className={[
          "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)]",
          "border-none bg-transparent px-3 text-left",
          "h-[var(--kds-menu-item-height)] text-[14px] font-medium",
          "text-[var(--color-text-subtle)]",
          "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
        ].join(" ")}
        onClick={() => onOpenDetail(contextMenu.orderId)}
        role="menuitem"
        type="button"
      >
        <Info size={18} aria-hidden="true" />
        상세정보
      </button>

      {canPin ? (
        <button
          className={[
            "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)]",
            "border-none bg-transparent px-3 text-left",
            "h-[var(--kds-menu-item-height)] text-[14px] font-medium",
            "text-[var(--color-text-subtle)]",
            "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
          ].join(" ")}
          onClick={() => onTogglePinned(contextMenu.orderId)}
          role="menuitem"
          type="button"
        >
          {isPinned
            ? <PinOff size={18} aria-hidden="true" />
            : <Pin size={18} aria-hidden="true" />}
          {isPinned ? "고정 해제" : "고정하기"}
        </button>
      ) : null}

      <button
        className={[
          "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)]",
          "border-none bg-transparent px-3 text-left",
          "h-[var(--kds-menu-item-height)] text-[14px] font-medium",
          "text-[var(--color-danger-text)]",
          "hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]",
        ].join(" ")}
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
