import { BarChart2, ClipboardList, HelpCircle, ListTodo, Settings, Users } from "lucide-react";
import type { ElementType } from "react";

import type { KdsSectionId, KdsSectionMeta } from "./types";

/** Icon lookup by section id */
export const KDS_SECTION_ICONS: Record<KdsSectionId, ElementType> = {
  RECEIVED: ClipboardList,
  MY_TASKS: ListTodo,
  STAFF: Users,
  STATS: BarChart2,
  SETTINGS: Settings,
  SUPPORT: HelpCircle,
};

/** Registry: single source of truth for label, icon, permissions, and display location */
export const KDS_SECTIONS: KdsSectionMeta[] = [
  {
    id: "RECEIVED",
    label: "업무",
    iconName: "ClipboardList",
    managerOnly: false,
    showInTopbar: true,
    showInSidebar: true,
  },
  {
    id: "MY_TASKS",
    label: "내 업무",
    iconName: "ListTodo",
    managerOnly: false,
    showInTopbar: true,
    showInSidebar: false,
  },
  {
    id: "STAFF",
    label: "직원",
    iconName: "Users",
    managerOnly: true,
    showInTopbar: false,
    showInSidebar: true,
  },
  {
    id: "STATS",
    label: "통계",
    iconName: "BarChart2",
    managerOnly: true,
    showInTopbar: false,
    showInSidebar: true,
  },
  {
    id: "SETTINGS",
    label: "설정",
    iconName: "Settings",
    managerOnly: true,
    showInTopbar: false,
    showInSidebar: true,
  },
  {
    id: "SUPPORT",
    label: "고객지원",
    iconName: "HelpCircle",
    managerOnly: false,
    showInTopbar: false,
    showInSidebar: true,
  },
];

/** Helper: filter sections visible to user role */
export function visibleSections(isManager: boolean) {
  return KDS_SECTIONS.filter((s) => !s.managerOnly || isManager);
}
