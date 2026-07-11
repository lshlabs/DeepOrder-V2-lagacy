import { Button } from "@/components/ui/button";
import type { AuthStore, AuthUser } from "../model/types";

interface ApprovalPendingViewProps {
  user: AuthUser | null;
  store: AuthStore | null;
  onBack: () => void;
}

/**
 * Shown when a user has registered and is waiting for admin approval,
 * or when approval status is PENDING_APPROVAL / REJECTED.
 * Replaces .pending-head, .pending-summary, .pending-row with Tailwind.
 */
export function ApprovalPendingView({ user, store, onBack }: ApprovalPendingViewProps) {
  const isRejected = user?.approvalStatus === "REJECTED";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span
          className={`inline-flex self-start text-xs font-semibold px-2 py-0.5 rounded-full ${
            isRejected
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          {isRejected ? "승인 거절" : "승인 대기"}
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-foreground mt-1">
          {isRejected ? "가입 신청이 거절되었습니다" : "가입 신청 완료"}
        </h2>
        {isRejected ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            관리자에게 문의하거나 다른 계정으로 신청해주세요.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            관리자 검토 후 승인되면 로그인할 수 있습니다.
          </p>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">매장명</span>
          <strong className="text-sm font-medium text-foreground">{store?.storeName ?? "-"}</strong>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">이름</span>
          <strong className="text-sm font-medium text-foreground">{user?.name ?? "-"}</strong>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">아이디</span>
          <strong className="text-sm font-medium text-foreground">{user?.loginId ?? "-"}</strong>
        </div>
      </div>

      <Button className="w-full" onClick={onBack} type="button" variant="outline">
        이전으로
      </Button>
    </div>
  );
}
