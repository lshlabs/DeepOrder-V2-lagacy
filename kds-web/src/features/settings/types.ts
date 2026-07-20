export type StoreSettings = {
  notificationsEnabled: boolean;
  notificationSound: string;
  breaktimeEnabled: boolean;
  breaktimeStartHour: number;
  breaktimeStartMinute: number;
  breaktimeDurationMinutes: number;
  autoAccept: boolean;
};

export type UpdateStoreSettingsRequest = StoreSettings;

export type SoundOption = "none" | "bell" | "chime" | "beep";

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
