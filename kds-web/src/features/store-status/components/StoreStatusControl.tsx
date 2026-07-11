import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";

import { PopoverPanel } from "@/components/layout/PopoverPanel";
import type { StoreStatus } from "@/lib/kds-types";
import { StoreStatusDot } from "./StoreStatusDot";

type StoreStatusControlProps = {
  pauseMinutes: number;
  saving: boolean;
  status: StoreStatus;
  onCancelPendingPaused: () => void;
  onConfirmPaused: () => Promise<void>;
  onPauseMinutesChange: (updater: (minutes: number) => number) => void;
  onStatusChange: (status: StoreStatus) => Promise<void>;
};

export function StoreStatusControl({
  pauseMinutes,
  saving,
  status,
  onCancelPendingPaused,
  onConfirmPaused,
  onPauseMinutesChange,
  onStatusChange,
}: StoreStatusControlProps) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const titleId = useId();
  const sectionTitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const statusRefs = useRef<Record<StoreStatus, HTMLButtonElement | null>>({
    CLOSED: null,
    OPEN: null,
    PAUSED: null,
  });
  const statusOptions = ["OPEN", "PAUSED", "CLOSED"] as const satisfies readonly StoreStatus[];

  function getStatusLabel(nextStatus: StoreStatus) {
    return nextStatus === "OPEN" ? "영업중" : nextStatus === "PAUSED" ? "일시중지" : "영업종료";
  }

  function handleStatusChange(nextStatus: StoreStatus) {
    if (saving || nextStatus === status) {
      return;
    }
    if (nextStatus !== "PAUSED") {
      setOpen(false);
    }
    void onStatusChange(nextStatus);
  }

  function closeStatusPopup() {
    onCancelPendingPaused();
    setOpen(false);
  }

  function handleConfirmPaused() {
    setOpen(false);
    void onConfirmPaused();
  }

  function focusStatus(statusToFocus: StoreStatus) {
    statusRefs.current[statusToFocus]?.focus();
  }

  function handleStatusKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentStatus: StoreStatus) {
    const currentIndex = statusOptions.indexOf(currentStatus);
    if (currentIndex === -1) return;

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleStatusChange(currentStatus);
      return;
    }

    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    let nextIndex = currentIndex;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % statusOptions.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + statusOptions.length) % statusOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = statusOptions.length - 1;
    }

    const nextStatus = statusOptions[nextIndex];
    focusStatus(nextStatus);
    handleStatusChange(nextStatus);
  }

  useEffect(() => {
    if (!open) return;
    focusStatus(status);
  }, [open, status]);

  return (
    <div style={{ position: "relative" }}>
      <button
        className={`kds-store-status kds-store-status--${status.toLowerCase()}`}
        onClick={() => {
          if (open) {
            closeStatusPopup();
            return;
          }
          setOpen(true);
        }}
        onPointerDown={(event) => setAnchorEl(event.currentTarget)}
        ref={triggerRef}
        type="button"
        aria-label="매장 상태 변경"
        aria-expanded={open}
      >
        <StoreStatusDot status={status} />
        {getStatusLabel(status)}
      </button>

      <PopoverPanel
        ariaLabelledBy={titleId}
        className="kds-store-status-popup"
        onClose={closeStatusPopup}
        open={open}
        positioning={open ? { align: "end", anchorEl, side: "bottom" } : null}
        role="dialog"
      >
        <div className="kds-store-status-popup-surface">
          <p className="kds-store-status-popup-title" id={titleId}>매장 상태</p>
          <div className="kds-store-status-options" role="radiogroup" aria-labelledby={titleId}>
            {statusOptions.map((nextStatus) => (
              <button
                key={nextStatus}
                ref={(node) => {
                  statusRefs.current[nextStatus] = node;
                }}
                className={`kds-store-status-popup-btn${status === nextStatus ? " active" : ""}`}
                onClick={() => handleStatusChange(nextStatus)}
                onKeyDown={(event) => handleStatusKeyDown(event, nextStatus)}
                type="button"
                role="radio"
                aria-checked={status === nextStatus}
                tabIndex={status === nextStatus ? 0 : -1}
              >
                <StoreStatusDot status={nextStatus} />
                {getStatusLabel(nextStatus)}
              </button>
            ))}
          </div>
          {status === "PAUSED" ? (
            <div className="kds-pause-duration" aria-labelledby={sectionTitleId}>
              <span className="kds-pause-duration-label" id={sectionTitleId}>일시중지 시간</span>
              <div className="kds-pause-duration-control">
                <button
                  className="kds-pause-stepper"
                  onClick={() => onPauseMinutesChange((minutes) => Math.max(10, minutes - 10))}
                  type="button"
                  aria-label="10분 감소"
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <span className="kds-pause-duration-value" role="status" aria-live="polite">{pauseMinutes}분</span>
                <button
                  className="kds-pause-stepper"
                  onClick={() => onPauseMinutesChange((minutes) => minutes + 10)}
                  type="button"
                  aria-label="10분 증가"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
              <button
                className="kds-pause-confirm"
                disabled={saving}
                onClick={handleConfirmPaused}
                type="button"
              >확인</button>
            </div>
          ) : null}
        </div>
      </PopoverPanel>
    </div>
  );
}
