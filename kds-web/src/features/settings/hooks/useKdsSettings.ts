import { useCallback, useEffect, useState } from "react";

import type { ShowToast } from "@/hooks";
import { requestWithReauth } from "@/lib/api";

import { apiGetKdsSettings, apiUpdateKdsSettings } from "../api/settings-api";
import { mapApiSettingsToUi, mapUiSettingsToApi } from "../lib/settingsMapper";
import { DEFAULT_SETTINGS_STATE, type SettingsState } from "../types";

type UseKdsSettingsParams = {
  accessToken: string;
  onUnauthorized: () => Promise<string | null>;
  showToast: ShowToast;
};

export function useKdsSettings({
  accessToken,
  onUnauthorized,
  showToast,
}: UseKdsSettingsParams) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshSettings = useCallback(async () => {
    const data = await requestWithReauth(accessToken, onUnauthorized, apiGetKdsSettings);
    setSettings(mapApiSettingsToUi(data));
  }, [accessToken, onUnauthorized]);

  useEffect(() => {
    void refreshSettings()
      .catch((error) => {
        showToast(error instanceof Error ? error.message : "설정을 불러오지 못했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshSettings, showToast]);

  async function persistSettings(nextSettings: SettingsState) {
    setSaving(true);
    try {
      const saved = await requestWithReauth(accessToken, onUnauthorized, (nextAccessToken) =>
        apiUpdateKdsSettings(nextAccessToken, mapUiSettingsToApi(nextSettings)),
      );
      setSettings(mapApiSettingsToUi(saved));
    } catch (error) {
      await refreshSettings().catch(() => undefined);
      showToast(error instanceof Error ? error.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function updateSettings(partial: Partial<SettingsState>) {
    setSettings((prev) => {
      const next = {
        ...prev,
        ...partial,
      };
      void persistSettings(next);
      return next;
    });
  }

  return {
    loading,
    refreshSettings,
    saving,
    settings,
    updateSettings,
  };
}
