/** KDS section IDs — single source of truth aligned with BoardTab */
export type KdsSectionId =
  | "RECEIVED"
  | "MY_TASKS"
  | "STAFF"
  | "STATS"
  | "SETTINGS"
  | "SUPPORT";

export interface KdsSectionMeta {
  id: KdsSectionId;
  label: string;
  /** Icon component name from lucide-react (resolved at runtime in kds-sections.ts) */
  iconName: string;
  /** Only managers can access this section */
  managerOnly: boolean;
  /** Shown in topbar tab strip */
  showInTopbar: boolean;
  /** Shown in sidebar nav */
  showInSidebar: boolean;
}
