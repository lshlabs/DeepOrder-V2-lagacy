import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

type FloatingSide = "top" | "bottom" | "left" | "right";
type FloatingAlign = "start" | "center" | "end";

type AnchorPositioning = {
  align?: FloatingAlign;
  anchorEl: HTMLElement | null;
  side?: FloatingSide;
};

type PopoverPanelProps = {
  ariaLabel?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  className: string;
  onClose: () => void;
  open: boolean;
  positioning: AnchorPositioning | null;
  role?: "dialog" | "group";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function PopoverPanel({
  ariaLabel,
  ariaLabelledBy,
  children,
  className,
  onClose,
  open,
  positioning,
  role = "dialog",
}: PopoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
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
    if (positioning?.anchorEl) {
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
      const panelEl = panelRef.current;
      if (!panelEl || panelEl.contains(target)) return;
      if (positioning?.anchorEl?.contains(target)) return;
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
    if (!open || !positioning?.anchorEl || !panelRef.current) return;
    const currentPositioning = positioning;

    function updatePosition() {
      const panelEl = panelRef.current;
      if (!panelEl) return;

      const panelWidth = panelEl.offsetWidth;
      const panelHeight = panelEl.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxLeft = Math.max(collisionPadding, viewportWidth - panelWidth - collisionPadding);
      const maxTop = Math.max(collisionPadding, viewportHeight - panelHeight - collisionPadding);
      const anchorRect = currentPositioning.anchorEl?.getBoundingClientRect();
      if (!anchorRect) return;

      const { align = "end", side = "bottom" } = currentPositioning;
      let actualSide = side;

      if (side === "bottom" && anchorRect.bottom + offset + panelHeight > viewportHeight - collisionPadding) {
        actualSide = "top";
      } else if (side === "top" && anchorRect.top - offset - panelHeight < collisionPadding) {
        actualSide = "bottom";
      } else if (side === "right" && anchorRect.right + offset + panelWidth > viewportWidth - collisionPadding) {
        actualSide = "left";
      } else if (side === "left" && anchorRect.left - offset - panelWidth < collisionPadding) {
        actualSide = "right";
      }

      let left = anchorRect.left;
      let top = anchorRect.bottom + offset;

      if (actualSide === "top") {
        top = anchorRect.top - panelHeight - offset;
      } else if (actualSide === "bottom") {
        top = anchorRect.bottom + offset;
      } else if (actualSide === "left") {
        left = anchorRect.left - panelWidth - offset;
      } else if (actualSide === "right") {
        left = anchorRect.right + offset;
      }

      if (actualSide === "top" || actualSide === "bottom") {
        if (align === "start") {
          left = anchorRect.left;
        } else if (align === "center") {
          left = anchorRect.left + (anchorRect.width - panelWidth) / 2;
        } else {
          left = anchorRect.right - panelWidth;
        }
      } else if (align === "start") {
        top = anchorRect.top;
      } else if (align === "center") {
        top = anchorRect.top + (anchorRect.height - panelHeight) / 2;
      } else {
        top = anchorRect.bottom - panelHeight;
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

  if (!mounted || !open || !positioning) return null;

  return createPortal(
    <div
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-modal={role === "dialog" ? true : undefined}
      className={className}
      ref={panelRef}
      role={role}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
