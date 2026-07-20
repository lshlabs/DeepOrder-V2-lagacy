import type { ComponentProps } from "react";

import { StaffPanel } from "@/features/staff";

type StaffPageProps = ComponentProps<typeof StaffPanel>;

export function StaffPage(props: StaffPageProps) {
  return (
    <div className="kds-panel-shell">
      <StaffPanel {...props} />
    </div>
  );
}
