type ClearCompletedDialogProps = {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ClearCompletedDialog({
  open,
  submitting,
  onCancel,
  onConfirm,
}: ClearCompletedDialogProps) {
  if (!open) return null;

  return (
    <div className="kds-modal-backdrop" onClick={onCancel}>
      <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="kds-modal-head">
          <h2 className="kds-modal-title">완료 내역 정리</h2>
        </div>
        <div className="kds-modal-body">
          <p className="kds-modal-desc">주문완료 내역을 삭제할까요?</p>
        </div>
        <div className="kds-modal-foot">
          <button className="kds-modal-btn secondary" onClick={onCancel} type="button">아니오</button>
          <button
            className="kds-modal-btn danger"
            disabled={submitting}
            onClick={onConfirm}
            type="button"
          >{submitting ? "처리중…" : "예"}</button>
        </div>
      </div>
    </div>
  );
}
