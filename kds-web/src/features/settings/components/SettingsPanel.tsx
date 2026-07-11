import type { SettingsState, SoundOption } from "@/features/kds/types";

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

/** "HH:mm" → { hour, minute } */
function parseHHMM(value: string): { hour: number; minute: number } {
  const [h = "0", m = "0"] = value.split(":");
  return { hour: parseInt(h, 10) || 0, minute: parseInt(m, 10) || 0 };
}

/** { hour, minute } → "HH:mm" */
function toHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function SettingsPanel({
  settings,
  onUpdate,
  onChangePasswordClick,
  disabled = false,
}: SettingsPanelProps) {
  const startValue = toHHMM(settings.breaktime.startHour, settings.breaktime.startMinute);
  const endHour = Math.floor(
    (settings.breaktime.startHour * 60 + settings.breaktime.startMinute + settings.breaktime.durationMinutes) / 60,
  ) % 24;
  const endMinute =
    (settings.breaktime.startHour * 60 + settings.breaktime.startMinute + settings.breaktime.durationMinutes) % 60;
  const endValue = toHHMM(endHour, endMinute);

  function handleStartChange(value: string) {
    const { hour, minute } = parseHHMM(value);
    onUpdate({ breaktime: { ...settings.breaktime, startHour: hour, startMinute: minute } });
  }

  function handleEndChange(value: string) {
    const { hour: endH, minute: endM } = parseHHMM(value);
    const startTotal = settings.breaktime.startHour * 60 + settings.breaktime.startMinute;
    const endTotal = endH * 60 + endM;
    const duration = endTotal > startTotal ? endTotal - startTotal : 1440 - startTotal + endTotal;
    onUpdate({ breaktime: { ...settings.breaktime, durationMinutes: Math.max(5, duration) } });
  }

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
          <div className="kds-settings-inline-control">
            <label className="sr-only" htmlFor="bt-start">시작 시간</label>
            <input
              id="bt-start"
              className="kds-time-input"
              disabled={disabled || !settings.breaktime.enabled}
              type="time"
              value={startValue}
              onChange={(e) => handleStartChange(e.target.value)}
            />
            <span className="kds-settings-row-desc" aria-hidden="true">~</span>
            <label className="sr-only" htmlFor="bt-end">종료 시간</label>
            <input
              id="bt-end"
              className="kds-time-input"
              disabled={disabled || !settings.breaktime.enabled}
              type="time"
              value={endValue}
              onChange={(e) => handleEndChange(e.target.value)}
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
