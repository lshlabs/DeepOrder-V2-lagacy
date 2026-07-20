import type { ComponentProps } from "react";

import { MyTasksPanel } from "@/features/tasks";

type TasksPageProps = ComponentProps<typeof MyTasksPanel>;

export function TasksPage(props: TasksPageProps) {
  return (
    <div className="kds-panel-shell">
      <MyTasksPanel {...props} />
    </div>
  );
}
