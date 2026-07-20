import { useCallback, useEffect, useState } from "react";

import type { ShowToast } from "@/hooks";
import { requestWithReauth } from "@/lib/api";

import { apiGetStoreContext, apiUpdateStoreStatus } from "../api/store-status-api";
import type { KdsStoreContext, StoreStatus } from "../types";

type UseStoreContextParams = {
  accessToken: string;
  onUnauthorized: () => Promise<string | null>;
  showToast: ShowToast;
};

export function useStoreContext({
  accessToken,
  onUnauthorized,
  showToast,
}: UseStoreContextParams) {
  const [storeContext, setStoreContext] = useState<KdsStoreContext | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>("OPEN");
  const [savingStoreStatus, setSavingStoreStatus] = useState(false);
  const [pauseMinutes, setPauseMinutes] = useState(10);

  const refreshStoreContext = useCallback(async () => {
    const data = await requestWithReauth(accessToken, onUnauthorized, apiGetStoreContext);
    setStoreContext(data);
    setStoreStatus(data.operatingStatus);
  }, [accessToken, onUnauthorized]);

  useEffect(() => {
    void refreshStoreContext().catch((error) => {
      showToast(error instanceof Error ? error.message : "매장 상태를 불러오지 못했습니다.");
    });
  }, [refreshStoreContext, showToast]);

  async function changeStoreStatus(nextStatus: StoreStatus) {
    setStoreStatus(nextStatus);
    if (nextStatus === "PAUSED") {
      return;
    }

    setSavingStoreStatus(true);
    try {
      const next = await requestWithReauth(accessToken, onUnauthorized, (nextAccessToken) =>
        apiUpdateStoreStatus(nextAccessToken, { operatingStatus: nextStatus }),
      );
      setStoreContext(next);
      setStoreStatus(next.operatingStatus);
    } catch (error) {
      if (storeContext) {
        setStoreStatus(storeContext.operatingStatus);
      }
      showToast(error instanceof Error ? error.message : "매장 상태를 저장하지 못했습니다.");
    } finally {
      setSavingStoreStatus(false);
    }
  }

  function revertPendingPausedStatus() {
    setStoreStatus((currentStatus) => {
      if (currentStatus === "PAUSED" && storeContext && storeContext.operatingStatus !== "PAUSED") {
        return storeContext.operatingStatus;
      }
      return currentStatus;
    });
  }

  async function confirmStoreStatusChange() {
    setSavingStoreStatus(true);
    try {
      const payload = storeStatus === "PAUSED"
        ? { operatingStatus: storeStatus, pauseMinutes }
        : { operatingStatus: storeStatus };
      const next = await requestWithReauth(accessToken, onUnauthorized, (nextAccessToken) =>
        apiUpdateStoreStatus(nextAccessToken, payload),
      );
      setStoreContext(next);
      setStoreStatus(next.operatingStatus);
    } catch (error) {
      if (storeContext) {
        setStoreStatus(storeContext.operatingStatus);
      }
      showToast(error instanceof Error ? error.message : "매장 상태를 저장하지 못했습니다.");
    } finally {
      setSavingStoreStatus(false);
    }
  }

  return {
    changeStoreStatus,
    confirmStoreStatusChange,
    pauseMinutes,
    refreshStoreContext,
    revertPendingPausedStatus,
    savingStoreStatus,
    setPauseMinutes,
    storeContext,
    storeStatus,
  };
}
