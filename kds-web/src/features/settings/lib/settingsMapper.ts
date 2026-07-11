import type { StoreSettings } from "@/lib/types";
import type { SettingsState, SoundOption } from "@/lib/kds-types";

export function mapApiSettingsToUi(settings: StoreSettings): SettingsState {
  return {
    notificationsEnabled: settings.notificationsEnabled,
    sound: asSoundOption(settings.notificationSound),
    breaktime: {
      enabled: settings.breaktimeEnabled,
      startHour: settings.breaktimeStartHour,
      startMinute: settings.breaktimeStartMinute,
      durationMinutes: settings.breaktimeDurationMinutes,
    },
    autoAccept: settings.autoAccept,
  };
}

export function mapUiSettingsToApi(settings: SettingsState): StoreSettings {
  return {
    notificationsEnabled: settings.notificationsEnabled,
    notificationSound: settings.sound,
    breaktimeEnabled: settings.breaktime.enabled,
    breaktimeStartHour: settings.breaktime.startHour,
    breaktimeStartMinute: settings.breaktime.startMinute,
    breaktimeDurationMinutes: settings.breaktime.durationMinutes,
    autoAccept: settings.autoAccept,
  };
}

export function asSoundOption(value: string): SoundOption {
  if (value === "none" || value === "bell" || value === "chime" || value === "beep") {
    return value;
  }
  return "bell";
}
