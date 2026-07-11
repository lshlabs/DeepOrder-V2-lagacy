import type { Order } from "@/lib/types";

export type BoardTab =
  | "RECEIVED"
  | "DONE"
  | "MY_TASKS"
  | "STATS"
  | "SETTINGS"
  | "STAFF"
  | "SUPPORT";

export type StoreStatus = "OPEN" | "PAUSED" | "CLOSED";

export type OrderSortDirection =
  | "newest-first"
  | "oldest-first";

export type OrderLayoutColumn = {
  orders: Order[];
  width: "base" | "wide" | "xwide";
};

export type SoundOption =
  | "none"
  | "bell"
  | "chime"
  | "beep";

export type BreaktimeConfig = {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
};

export type SettingsState = {
  notificationsEnabled: boolean;
  sound: SoundOption;
  breaktime: BreaktimeConfig;
  autoAccept: boolean;
};

export const DEFAULT_SETTINGS_STATE: SettingsState = {
  notificationsEnabled: true,
  sound: "bell",
  breaktime: {
    enabled: false,
    startHour: 15,
    startMinute: 0,
    durationMinutes: 60,
  },
  autoAccept: false,
};
