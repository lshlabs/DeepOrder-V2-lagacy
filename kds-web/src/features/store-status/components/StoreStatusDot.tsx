import type { StoreStatus } from "@/lib/kds-types";

type StoreStatusDotProps = {
  status: StoreStatus;
};

export function StoreStatusDot({ status }: StoreStatusDotProps) {
  const tone = status.toLowerCase();
  return (
    <span className={`kds-store-status-dot kds-store-status-dot--${tone}`} aria-hidden="true">
      <span className="kds-store-status-dot-core" />
      {status === "OPEN" ? <span className="kds-store-status-dot-pulse" /> : null}
    </span>
  );
}
