export type ApprovalPendingViewProps = {
  storeName: string | null;
  userName: string | null;
  onBack: () => void;
};

export function ApprovalPendingView({ storeName, userName, onBack }: ApprovalPendingViewProps) {
  return (
    <div className="auth-view auth-view--visible" aria-hidden={false}>
      <div className="pending-head">
        <span className="status-badge">승인 대기</span>
        <h2>가입 신청 완료</h2>
        <p>관리자 검토 후 승인되면 로그인할 수 있습니다.</p>
      </div>

      <div className="pending-summary">
        <div className="pending-row">
          <span>매장명</span>
          <strong>{storeName ?? "-"}</strong>
        </div>
        <div className="pending-row">
          <span>이름</span>
          <strong>{userName ?? "-"}</strong>
        </div>
      </div>

      <button className="btn-outline auth-submit" onClick={onBack} type="button">
        이전으로
      </button>
    </div>
  );
}
