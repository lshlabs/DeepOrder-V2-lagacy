import type { ComponentProps } from "react";

import { SettingsPanel } from "@/features/settings";

type SettingsPageProps = ComponentProps<typeof SettingsPanel>;

export function SettingsPage(props: SettingsPageProps) {
  return (
    <div className="kds-panel-shell">
      <SettingsPanel {...props} />
    </div>
  );
}
