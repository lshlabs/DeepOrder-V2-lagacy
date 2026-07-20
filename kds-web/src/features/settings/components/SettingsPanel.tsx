import { TimePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { diffMinutesWithinDay } from "@/lib/date";

import type { SettingsState, SoundOption } from "../types";

const SOUND_OPTIONS: { value: SoundOption; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "bell", label: "벨" },
  { value: "chime", label: "차임" },
  { value: "beep", label: "비프" },
];

type SettingsPanelProps = {
  settings: SettingsState;
  onUpdate: (partial: Partial<SettingsState>) => void;
  onChangePasswordClick: () => void;
  disabled?: boolean;
};

export function SettingsPanel({
  settings,
  onUpdate,
  onChangePasswordClick,
  disabled = false,
}: SettingsPanelProps) {
  const breaktimeRangeStart = dayjs().hour(settings.breaktime.startHour).minute(settings.breaktime.startMinute).second(0);
  const breaktimeRangeValue: [Dayjs, Dayjs] = [
    breaktimeRangeStart,
    breaktimeRangeStart.add(settings.breaktime.durationMinutes, "minute"),
  ];

  return (
    <section className="kds-panel kds-panel--settings" aria-label="설정">
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">설정</h2>
          <p className="kds-panel-subtitle">운영 환경 및 알림 설정</p>
        </div>
      </div>

      <div className="kds-section-divider">
        <span className="kds-section-label">알림</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">알림 활성화</span>
            <span className="kds-settings-row-desc">주문 도착 시 알림을 받습니다</span>
          </div>
          <button
            className={`kds-toggle${settings.notificationsEnabled ? " on" : ""}`}
            disabled={disabled}
            onClick={() => onUpdate({ notificationsEnabled: !settings.notificationsEnabled })}
            type="button"
            role="switch"
            aria-checked={settings.notificationsEnabled}
          >
            <span className="kds-toggle-knob" />
          </button>
        </div>

        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">알림 사운드</span>
            <span className="kds-settings-row-desc">주문 도착 시 재생할 사운드</span>
          </div>
          <div className="kds-segmented">
            {SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`kds-segmented-btn${settings.sound === opt.value ? " active" : ""}`}
                disabled={disabled || !settings.notificationsEnabled}
                onClick={() => onUpdate({ sound: opt.value })}
                type="button"
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="kds-section-divider">
        <span className="kds-section-label">브레이크타임</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">브레이크타임 사용</span>
            <span className="kds-settings-row-desc">설정한 시간 동안 주문 접수를 일시 중지합니다</span>
          </div>
          <button
            className={`kds-toggle${settings.breaktime.enabled ? " on" : ""}`}
            disabled={disabled}
            onClick={() => onUpdate({ breaktime: { ...settings.breaktime, enabled: !settings.breaktime.enabled } })}
            type="button"
            role="switch"
            aria-checked={settings.breaktime.enabled}
            aria-label="브레이크타임 사용"
          >
            <span className="kds-toggle-knob" />
          </button>
        </div>

        <div className={`kds-settings-row${!settings.breaktime.enabled ? " kds-settings-row--disabled" : ""}`}>
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">브레이크타임 시간</span>
            <span className="kds-settings-row-desc">주문 접수를 중지할 시간 설정</span>
          </div>
          <div className="kds-settings-inline-picker">
            <TimePicker.RangePicker
              id="bt-range"
              allowClear={false}
              className="kds-time-range-picker"
              disabled={disabled || !settings.breaktime.enabled}
              format="HH:mm"
              inputReadOnly
              minuteStep={5}
              needConfirm
              placeholder={["Start time", "End time"]}
              value={breaktimeRangeValue}
              onChange={(value) => {
                if (!value || !value[0] || !value[1]) {
                  return;
                }
                const nextStartHour = value[0].hour();
                const nextStartMinute = value[0].minute();
                const nextDuration = diffMinutesWithinDay(value[0], value[1]);
                onUpdate({
                  breaktime: {
                    ...settings.breaktime,
                    startHour: nextStartHour,
                    startMinute: nextStartMinute,
                    durationMinutes: Math.max(5, nextDuration),
                  },
                });
              }}
            />
          </div>
        </div>
      </div>

      <div className="kds-section-divider">
        <span className="kds-section-label">주문 처리</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">주문 자동수락</span>
            <span className="kds-settings-row-desc">
              {settings.autoAccept ? "주문 수신 즉시 진행중 표시" : "수락 버튼을 눌러야 진행중 표시"}
            </span>
          </div>
          <button
            className={`kds-toggle${settings.autoAccept ? " on" : ""}`}
            disabled={disabled}
            onClick={() => onUpdate({ autoAccept: !settings.autoAccept })}
            type="button"
            role="switch"
            aria-checked={settings.autoAccept}
          >
            <span className="kds-toggle-knob" />
          </button>
        </div>
      </div>

      <div className="kds-section-divider">
        <span className="kds-section-label">계정</span>
      </div>
      <div className="kds-settings-rows">
        <div className="kds-settings-row">
          <div className="kds-settings-row-info">
            <span className="kds-settings-row-label">비밀번호 변경</span>
            <span className="kds-settings-row-desc">변경 후 자동 로그아웃됩니다</span>
          </div>
          <button className="kds-btn-ghost kds-btn-sm" disabled={disabled} onClick={onChangePasswordClick} type="button">변경</button>
        </div>
      </div>
    </section>
  );
}
