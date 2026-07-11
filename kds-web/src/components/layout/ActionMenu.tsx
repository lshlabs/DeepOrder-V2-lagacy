import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

type FloatingSide = "top" | "bottom" | "left" | "right";
type FloatingAlign = "start" | "center" | "end";

type AnchorPositioning = {
  align?: FloatingAlign;
  anchorEl: HTMLElement | null;
  mode: "anchor";
  side?: FloatingSide;
};

type PointPositioning = {
  mode: "point";
  x: number;
  y: number;
};

type ActionMenuProps = {
  ariaLabel?: string;
  children: ReactNode;
  className: string;
  onClose: () => void;
  open: boolean;
  positioning: AnchorPositioning | PointPositioning | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMenuItems(container: HTMLDivElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'),
  );
}

export function ActionMenu({
  ariaLabel,
  children,
  className,
  onClose,
  open,
  positioning,
}: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({
    left: 0,
    position: "fixed",
    top: 0,
    visibility: "hidden",
  });

  const offset = useMemo(() => {
    if (typeof window === "undefined") return 6;
    const value = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--kds-floating-offset"),
    );
    return Number.isFinite(value) ? value : 6;
  }, []);

  const collisionPadding = useMemo(() => {
    if (typeof window === "undefined") return 8;
    const value = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--kds-floating-collision-padding"),
    );
    return Number.isFinite(value) ? value : 8;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (positioning?.mode === "anchor" && positioning.anchorEl) {
      restoreFocusRef.current = positioning.anchorEl;
      return;
    }
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }, [open, positioning]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const menuEl = menuRef.current;
      if (!menuEl || menuEl.contains(target)) return;
      if (positioning?.mode === "anchor" && positioning.anchorEl?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, positioning]);

  useEffect(() => {
    if (open) return;
    if (!restoreFocusRef.current) return;
    window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !positioning || !menuRef.current) return;
    const currentPositioning = positioning;

    function updatePosition() {
      const menuEl = menuRef.current;
      if (!menuEl) return;

      const menuWidth = menuEl.offsetWidth;
      const menuHeight = menuEl.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxLeft = Math.max(collisionPadding, viewportWidth - menuWidth - collisionPadding);
      const maxTop = Math.max(collisionPadding, viewportHeight - menuHeight - collisionPadding);

      if (currentPositioning.mode === "point") {
        const hasRoomRight = currentPositioning.x + offset + menuWidth <= viewportWidth - collisionPadding;
        const hasRoomBottom = currentPositioning.y + offset + menuHeight <= viewportHeight - collisionPadding;
        const left = hasRoomRight
          ? currentPositioning.x + offset
          : currentPositioning.x - menuWidth - offset;
        const top = hasRoomBottom
          ? currentPositioning.y + offset
          : currentPositioning.y - menuHeight - offset;

        setStyle({
          left: clamp(left, collisionPadding, maxLeft),
          position: "fixed",
          top: clamp(top, collisionPadding, maxTop),
          visibility: "visible",
        });
        return;
      }

      const { align = "end", anchorEl, side = "bottom" } = currentPositioning;
      if (!anchorEl) return;

      const anchorRect = anchorEl.getBoundingClientRect();
      const preferredSide = side;
      let actualSide = preferredSide;

      if (preferredSide === "bottom" && anchorRect.bottom + offset + menuHeight > viewportHeight - collisionPadding) {
        actualSide = "top";
      } else if (preferredSide === "top" && anchorRect.top - offset - menuHeight < collisionPadding) {
        actualSide = "bottom";
      } else if (preferredSide === "right" && anchorRect.right + offset + menuWidth > viewportWidth - collisionPadding) {
        actualSide = "left";
      } else if (preferredSide === "left" && anchorRect.left - offset - menuWidth < collisionPadding) {
        actualSide = "right";
      }

      let left = anchorRect.left;
      let top = anchorRect.bottom + offset;

      if (actualSide === "top") {
        top = anchorRect.top - menuHeight - offset;
      } else if (actualSide === "bottom") {
        top = anchorRect.bottom + offset;
      } else if (actualSide === "left") {
        left = anchorRect.left - menuWidth - offset;
      } else if (actualSide === "right") {
        left = anchorRect.right + offset;
      }

      if (actualSide === "top" || actualSide === "bottom") {
        if (align === "start") {
          left = anchorRect.left;
        } else if (align === "center") {
          left = anchorRect.left + (anchorRect.width - menuWidth) / 2;
        } else {
          left = anchorRect.right - menuWidth;
        }
      } else {
        if (align === "start") {
          top = anchorRect.top;
        } else if (align === "center") {
          top = anchorRect.top + (anchorRect.height - menuHeight) / 2;
        } else {
          top = anchorRect.bottom - menuHeight;
        }
      }

      setStyle({
        left: clamp(left, collisionPadding, maxLeft),
        position: "fixed",
        top: clamp(top, collisionPadding, maxTop),
        visibility: "visible",
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [collisionPadding, offset, open, positioning]);

  useEffect(() => {
    if (!open) return;
    const menuEl = menuRef.current;
    const firstItem = getMenuItems(menuEl)[0];
    if (!firstItem) return;
    window.requestAnimationFrame(() => firstItem.focus());
  }, [open]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = getMenuItems(menuRef.current);
    if (items.length === 0) return;

    const currentIndex = items.findIndex((item) => item === document.activeElement);
    const nextIndex =
      event.key === "ArrowDown"
        ? (currentIndex + 1 + items.length) % items.length
        : event.key === "ArrowUp"
          ? (currentIndex - 1 + items.length) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : -1;

    if (nextIndex === -1) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  }

  if (!mounted || !open || !positioning) return null;

  return createPortal(
    <div
      aria-label={ariaLabel}
      className={className}
      onKeyDown={handleMenuKeyDown}
      ref={menuRef}
      role="menu"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
