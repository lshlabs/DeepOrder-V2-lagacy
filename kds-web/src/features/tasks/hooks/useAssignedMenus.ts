import { useCallback, useEffect, useState } from "react";

import {
  apiCreateAssignedMenu,
  apiDeleteAssignedMenu,
  apiGetAssignedMenus,
  apiUpdateAssignedMenu,
} from "../../../lib/api";
import { requestWithReauth } from "../../../shared/lib/requestWithReauth";
import type { AssignedMenu } from "../../../types";
import type { ShowToast } from "@/lib/notify";


type UseAssignedMenusParams = {
  accessToken: string;
  onUnauthorized: () => Promise<string | null>;
  showToast: ShowToast;
};

export function useAssignedMenus({
  accessToken,
  onUnauthorized,
  showToast,
}: UseAssignedMenusParams) {
  const [assignedMenus, setAssignedMenus] = useState<AssignedMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshAssignedMenus = useCallback(async () => {
    const data = await requestWithReauth(accessToken, onUnauthorized, apiGetAssignedMenus);
    setAssignedMenus(data.menus);
  }, [accessToken, onUnauthorized]);

  useEffect(() => {
    void refreshAssignedMenus()
      .catch((error) => {
        showToast(error instanceof Error ? error.message : "내 업무 메뉴를 불러오지 못했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshAssignedMenus, showToast]);

  async function createAssignedMenu(menuName: string) {
    setSaving(true);
    try {
      await requestWithReauth(accessToken, onUnauthorized, (nextAccessToken) =>
        apiCreateAssignedMenu(nextAccessToken, { menuName }),
      );
      await refreshAssignedMenus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "담당 메뉴를 추가하지 못했습니다.");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function updateAssignedMenu(menuId: number, menuName: string) {
    setSaving(true);
    try {
      await requestWithReauth(accessToken, onUnauthorized, (nextAccessToken) =>
        apiUpdateAssignedMenu(nextAccessToken, menuId, { menuName }),
      );
      await refreshAssignedMenus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "담당 메뉴를 수정하지 못했습니다.");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignedMenu(menuId: number) {
    setSaving(true);
    try {
      await requestWithReauth(accessToken, onUnauthorized, (nextAccessToken) =>
        apiDeleteAssignedMenu(nextAccessToken, menuId),
      );
      await refreshAssignedMenus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "담당 메뉴를 삭제하지 못했습니다.");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  return {
    assignedMenus,
    createAssignedMenu,
    deleteAssignedMenu,
    loading,
    refreshAssignedMenus,
    saving,
    updateAssignedMenu,
  };
}
