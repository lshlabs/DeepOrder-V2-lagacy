"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { StoreManager } from "@/components/store-manager"
import { MenuManager } from "@/components/menu-manager"
import { OptionGroupManager } from "@/components/option-group-manager"
import { OptionManager } from "@/components/option-manager"
import { MenuDetail } from "@/components/menu-detail"
import { JsonImportExport } from "@/components/json-import-export"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Home } from "lucide-react"
import type { Store, Menu, OptionGroup, Option, CatalogData } from "@/lib/types"
import {
  apiGetStores,
  apiCreateStore,
  apiUpdateStore,
  apiDeleteStore,
  apiGetMenus,
  apiCreateMenu,
  apiUpdateMenu,
  apiDeleteMenu,
  apiCloneMenu,
  apiGetOptionGroups,
  apiCreateOptionGroup,
  apiUpdateOptionGroup,
  apiDeleteOptionGroup,
  apiGetOptions,
  apiCreateOption,
  apiUpdateOption,
  apiDeleteOption,
  apiCloneOptionGroup,
  apiCloneOption,
  apiExportCatalog,
  apiImportCatalog,
  apiGetLinkableMenus,
} from "@/lib/api"

const SELECTED_STORE_STORAGE_KEY = "console:selectedStoreId"

export default function MenuManagementPage() {
  // Data state
  const [stores, setStores] = useState<Store[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [options, setOptions] = useState<Map<string, Option[]>>(new Map())
  const [linkableMenus, setLinkableMenus] = useState<Menu[]>([])

  // Selection state
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [selectedOptionGroup, setSelectedOptionGroup] = useState<OptionGroup | null>(
    null
  )

  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Store picker modal state
  const [storePickerOpen, setStorePickerOpen] = useState(false)

  // Load stores on mount
  useEffect(() => {
    loadStores()
  }, [])

  // Load menus when store changes
  useEffect(() => {
    if (selectedStore) {
      loadMenus(selectedStore.id)
    } else {
      setMenus([])
      setSelectedMenu(null)
    }
  }, [selectedStore])

  // Load option groups and linkable menus when menu changes
  useEffect(() => {
    if (!selectedMenu) {
      setOptionGroups([])
      setSelectedOptionGroup(null)
      setOptions(new Map())
      setLinkableMenus([])
      setIsDetailLoading(false)
      return
    }

    let cancelled = false

    const loadMenuDetail = async () => {
      const startedAt = Date.now()
      setIsDetailLoading(true)

      try {
        const [groupData, linkableData] = await Promise.all([
          apiGetOptionGroups(selectedMenu.id),
          apiGetLinkableMenus(selectedMenu.storeId),
        ])

        if (cancelled) {
          return
        }

        setOptionGroups(groupData)
        setSelectedOptionGroup(null)
        setLinkableMenus(linkableData)

        const optionEntries = await Promise.all(
          groupData.map(async (group) => [group.id, await apiGetOptions(group.id)] as const)
        )

        if (cancelled) {
          return
        }

        setOptions(new Map(optionEntries))
      } catch (error) {
        if (!cancelled) {
          toast.error("메뉴 상세 정보를 불러오는데 실패했습니다")
          console.error(error)
        }
      } finally {
        const remaining = Math.max(0, 1000 - (Date.now() - startedAt))
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining))
        }

        if (!cancelled) {
          setIsDetailLoading(false)
        }
      }
    }

    loadMenuDetail()

    return () => {
      cancelled = true
    }
  }, [selectedMenu])

  // Load options when option group changes
  useEffect(() => {
    if (selectedOptionGroup) {
      loadOptions(selectedOptionGroup.id)
    }
  }, [selectedOptionGroup])

  // API calls
  const loadStores = async () => {
    try {
      const data = await apiGetStores()
      setStores(data)
      const storedStoreId = window.localStorage.getItem(SELECTED_STORE_STORAGE_KEY)
      const storedStore = data.find((store) => store.id === storedStoreId) ?? null
      setSelectedStore(storedStore)
      if (!storedStore) {
        window.localStorage.removeItem(SELECTED_STORE_STORAGE_KEY)
      }
    } catch (error) {
      toast.error("매장 목록을 불러오는데 실패했습니다")
      console.error(error)
    }
  }

  const loadMenus = async (storeId: string) => {
    try {
      const data = await apiGetMenus(storeId)
      setMenus(data)
      setSelectedMenu(null)
      setOptionGroups([])
      setSelectedOptionGroup(null)
    } catch (error) {
      toast.error("메뉴 목록을 불러오는데 실패했습니다")
      console.error(error)
    }
  }

  const loadOptions = async (optionGroupId: string) => {
    try {
      const data = await apiGetOptions(optionGroupId)
      setOptions((prev) => new Map(prev).set(optionGroupId, data))
    } catch (error) {
      toast.error("옵션을 불러오는데 실패했습니다")
      console.error(error)
    }
  }

  // Store handlers
  const handleCreateStore = async (
    data: Omit<Store, "id" | "createdAt" | "updatedAt">
  ) => {
    setIsLoading(true)
    try {
      const store = await apiCreateStore(data)
      setStores((prev) => [...prev, store])
      toast.success(`"${store.name}" 매장이 생성되었습니다`)
    } catch (error) {
      toast.error("매장 생성에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStore = async (
    id: string,
    data: Partial<Omit<Store, "id" | "createdAt" | "updatedAt">>
  ) => {
    setIsLoading(true)
    try {
      const store = await apiUpdateStore(id, data)
      setStores((prev) => prev.map((s) => (s.id === id ? store : s)))
      if (selectedStore?.id === id) {
        setSelectedStore(store)
      }
      toast.success(`"${store.name}" 매장이 수정되었습니다`)
    } catch (error) {
      toast.error("매장 수정에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStore = async (id: string) => {
    setIsLoading(true)
    try {
      await apiDeleteStore(id)
      setStores((prev) => prev.filter((s) => s.id !== id))
      if (selectedStore?.id === id) {
        window.localStorage.removeItem(SELECTED_STORE_STORAGE_KEY)
        setSelectedStore(null)
        setMenus([])
        setSelectedMenu(null)
        setOptionGroups([])
        setSelectedOptionGroup(null)
      }
      toast.success("매장이 삭제되었습니다")
    } catch (error) {
      toast.error("매장 삭제에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Menu handlers
  const handleCreateMenu = async (
    data: Omit<Menu, "id" | "createdAt" | "updatedAt">
  ) => {
    setIsLoading(true)
    try {
      const menu = await apiCreateMenu(data)
      setMenus((prev) => [...prev, menu])
      toast.success(`"${menu.name}" 메뉴가 생성되었습니다`)
    } catch (error) {
      toast.error("메����� 생성에 실패���습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateMenu = async (
    id: string,
    data: Partial<Omit<Menu, "id" | "createdAt" | "updatedAt">>
  ) => {
    setIsLoading(true)
    try {
      const menu = await apiUpdateMenu(id, data)
      setMenus((prev) => prev.map((m) => (m.id === id ? menu : m)))
      if (selectedMenu?.id === id) {
        setSelectedMenu(menu)
      }
      toast.success(`"${menu.name}" 메뉴가 수정되었습니다`)
    } catch (error) {
      toast.error("메뉴 수정에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMenu = async (id: string) => {
    setIsLoading(true)
    try {
      await apiDeleteMenu(id)
      setMenus((prev) => prev.filter((m) => m.id !== id))
      if (selectedMenu?.id === id) {
        setSelectedMenu(null)
        setOptionGroups([])
        setSelectedOptionGroup(null)
      }
      toast.success("메뉴가 삭제되었습니다")
    } catch (error) {
      toast.error("메뉴 삭제에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloneMenu = async (id: string) => {
    if (!selectedStore) return
    setIsLoading(true)
    try {
      const cloned = await apiCloneMenu(id)
      const data = await apiGetMenus(selectedStore.id)
      setMenus(data)
      toast.success(`"${cloned.name}" 메뉴가 복제되었습니다`)
    } catch (error) {
      toast.error("메뉴 복제에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reorder menus (immediate state update for real-time reflection)
  const handleReorderMenus = (reorderedMenus: Menu[]) => {
    setMenus(reorderedMenus)
  }

  // OptionGroup handlers
  const handleCreateOptionGroup = async (
    data: Omit<OptionGroup, "id" | "createdAt" | "updatedAt">
  ) => {
    setIsLoading(true)
    try {
      const og = await apiCreateOptionGroup(data)
      setOptionGroups((prev) => [...prev, og].sort((a, b) => a.sortOrder - b.sortOrder))
      toast.success(`"${og.name}" 옵션 그룹이 생성되었습니다`)
    } catch (error) {
      toast.error("옵션 그룹 생성에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateOptionGroup = async (
    id: string,
    data: Partial<Omit<OptionGroup, "id" | "createdAt" | "updatedAt">>
  ) => {
    setIsLoading(true)
    try {
      const og = await apiUpdateOptionGroup(id, data)
      setOptionGroups((prev) =>
        prev.map((g) => (g.id === id ? og : g)).sort((a, b) => a.sortOrder - b.sortOrder)
      )
      if (selectedOptionGroup?.id === id) {
        setSelectedOptionGroup(og)
      }
      // Only show toast if not a sortOrder-only update (drag reorder)
      if (Object.keys(data).length > 1 || !('sortOrder' in data)) {
        toast.success(`"${og.name}" 옵션 그룹이 수정되었습니다`)
      }
    } catch (error) {
      toast.error("옵션 그룹 수정에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reorder option groups (immediate state update for real-time reflection)
  const handleReorderOptionGroups = (reorderedGroups: OptionGroup[]) => {
    setOptionGroups(reorderedGroups)
  }

  const handleDeleteOptionGroup = async (id: string) => {
    setIsLoading(true)
    try {
      await apiDeleteOptionGroup(id)
      setOptionGroups((prev) => prev.filter((g) => g.id !== id))
      if (selectedOptionGroup?.id === id) {
        setSelectedOptionGroup(null)
      }
      setOptions((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
      toast.success("옵션 그룹이 삭제되었습니다")
    } catch (error) {
      toast.error("옵션 그룹 삭제에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloneOptionGroup = async (id: string) => {
    setIsLoading(true)
    try {
      const cloned = await apiCloneOptionGroup(id)
      setOptionGroups((prev) => [...prev, cloned])
      toast.success(`"${cloned.name}" 옵션 그룹이 복제되었습니다`)
    } catch (error) {
      toast.error("옵션 그룹 복제에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloneOption = async (id: string) => {
    setIsLoading(true)
    try {
      const cloned = await apiCloneOption(id)
      setOptions((prev) => {
        const next = new Map(prev)
        const existing = next.get(cloned.optionGroupId) || []
        next.set(
          cloned.optionGroupId,
          [...existing, cloned].sort((a, b) => a.sortOrder - b.sortOrder)
        )
        return next
      })
      toast.success(`"${cloned.name}" 옵션이 복제되었습니다`)
    } catch (error) {
      toast.error("옵션 복제에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateOptionWithMenu = async (
    data: Omit<Option, "id" | "createdAt" | "updatedAt">
  ): Promise<Menu> => {
    if (!selectedMenu) throw new Error("No menu selected")
    setIsLoading(true)
    try {
      const newMenu = await apiCreateMenu({
        storeId: selectedMenu.storeId,
        name: data.name,
        type: "SIDE",
        basePrice: data.additionalPrice,
        allergens: [],
        isAvailable: true,
        sortOrder: menus.length,
      })
      setMenus((prev) => [...prev, newMenu])

      const opt = await apiCreateOption({ ...data, linkedMenuId: newMenu.id })
      setOptions((prev) => {
        const next = new Map(prev)
        const existing = next.get(opt.optionGroupId) || []
        next.set(
          opt.optionGroupId,
          [...existing, opt].sort((a, b) => a.sortOrder - b.sortOrder)
        )
        return next
      })

      toast.success(`"${opt.name}" 옵션과 연결 메뉴가 생성되었습니다`)
      return newMenu
    } catch (error) {
      toast.error("옵션/메뉴 생성에 실패했습니다")
      console.error(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateOptionWithMenu = async (
    id: string,
    data: Partial<Omit<Option, "id" | "createdAt" | "updatedAt">>
  ): Promise<Menu> => {
    if (!selectedMenu) throw new Error("No menu selected")
    setIsLoading(true)
    try {
      const newMenu = await apiCreateMenu({
        storeId: selectedMenu.storeId,
        name: (data.name as string) ?? "",
        type: "SIDE",
        basePrice: (data.additionalPrice as number) ?? 0,
        allergens: [],
        isAvailable: true,
        sortOrder: menus.length,
      })
      setMenus((prev) => [...prev, newMenu])

      const opt = await apiUpdateOption(id, { ...data, linkedMenuId: newMenu.id })
      setOptions((prev) => {
        const next = new Map(prev)
        const existing = next.get(opt.optionGroupId) || []
        next.set(
          opt.optionGroupId,
          existing
            .map((o) => (o.id === id ? opt : o))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        )
        return next
      })

      toast.success(`"${opt.name}" 옵션과 연결 메뉴가 생성되었습니다`)
      return newMenu
    } catch (error) {
      toast.error("옵션/메뉴 생성에 실패했습니다")
      console.error(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Option handlers
  const handleCreateOption = async (
    data: Omit<Option, "id" | "createdAt" | "updatedAt">
  ) => {
    setIsLoading(true)
    try {
      const opt = await apiCreateOption(data)
      setOptions((prev) => {
        const next = new Map(prev)
        const existing = next.get(opt.optionGroupId) || []
        next.set(
          opt.optionGroupId,
          [...existing, opt].sort((a, b) => a.sortOrder - b.sortOrder)
        )
        return next
      })
      toast.success(`"${opt.name}" 옵션이 생성되었습니다`)
    } catch (error) {
      toast.error("옵션 생성에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateOption = async (
    id: string,
    data: Partial<Omit<Option, "id" | "createdAt" | "updatedAt">>
  ) => {
    setIsLoading(true)
    try {
      const opt = await apiUpdateOption(id, data)
      setOptions((prev) => {
        const next = new Map(prev)
        const existing = next.get(opt.optionGroupId) || []
        next.set(
          opt.optionGroupId,
          existing
            .map((o) => (o.id === id ? opt : o))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        )
        return next
      })
      // Only show toast if not a sortOrder-only update (drag reorder)
      if (Object.keys(data).length > 1 || !('sortOrder' in data)) {
        toast.success(`"${opt.name}" 옵션이 수정되었습니다`)
      }
    } catch (error) {
      toast.error("옵션 수정에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reorder options (immediate state update for real-time reflection)
  const handleReorderOptions = (reorderedOptions: Option[]) => {
    if (!selectedOptionGroup) return
    setOptions((prev) => {
      const next = new Map(prev)
      next.set(selectedOptionGroup.id, reorderedOptions)
      return next
    })
  }

  const handleDeleteOption = async (id: string) => {
    setIsLoading(true)
    try {
      await apiDeleteOption(id)
      setOptions((prev) => {
        const next = new Map(prev)
        for (const [groupId, groupOptions] of next) {
          next.set(
            groupId,
            groupOptions.filter((o) => o.id !== id)
          )
        }
        return next
      })
      toast.success("옵션이 삭제되었습니다")
    } catch (error) {
      toast.error("옵션 삭제에 실패했습니다")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Import/Export handlers
  const handleExport = async (): Promise<CatalogData> => {
    return apiExportCatalog()
  }

  const handleImport = async (
    data: CatalogData,
    mode: "merge" | "replace"
  ): Promise<{ imported: number; errors: string[] }> => {
    setIsLoading(true)
    try {
      const result = await apiImportCatalog(data, mode)
      // Refresh all data after import
      await loadStores()
      window.localStorage.removeItem(SELECTED_STORE_STORAGE_KEY)
      setSelectedStore(null)
      setMenus([])
      setSelectedMenu(null)
      setOptionGroups([])
      setSelectedOptionGroup(null)
      toast.success(`${result.imported}개 항목을 가져왔습니다`)
      return result
    } catch (error) {
      toast.error("가져오기에 실패했습니다")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky toolbar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              메뉴 관리
            </h1>
            <p className="text-sm text-muted-foreground">
              매장에서 메뉴, 옵션 그룹, 옵션까지 단계별로 관리하세요
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Store picker button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStorePickerOpen(true)}
              className="max-w-[220px]"
            >
              <Home className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {selectedStore ? selectedStore.name : "매장 선택"}
              </span>
            </Button>

            {/* Store picker modal */}
            <Dialog open={storePickerOpen} onOpenChange={setStorePickerOpen}>
              <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
                <StoreManager
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(store) => {
                    setSelectedStore(store)
                    window.localStorage.setItem(SELECTED_STORE_STORAGE_KEY, store.id)
                    setStorePickerOpen(false)
                  }}
                  onCreateStore={handleCreateStore}
                  onUpdateStore={handleUpdateStore}
                  onDeleteStore={handleDeleteStore}
                  isLoading={isLoading}
                />
              </DialogContent>
            </Dialog>

            <JsonImportExport
              onExport={handleExport}
              onImport={handleImport}
              isLoading={isLoading}
              compact
            />
          </div>
        </div>
      </header>

      {/* 4-column drill-down: 메뉴 | 옵션 그룹 | 옵션 | 상세 패널 */}
      <div className="flex-1 px-4 py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
          {/* Col 1 — 메뉴 목록 */}
          <MenuManager
            menus={menus}
            selectedMenu={selectedMenu}
            storeId={selectedStore?.id || null}
            onSelectMenu={setSelectedMenu}
            onCreateMenu={handleCreateMenu}
            onUpdateMenu={handleUpdateMenu}
            onDeleteMenu={handleDeleteMenu}
            onCloneMenu={handleCloneMenu}
            onReorderMenus={handleReorderMenus}
            isLoading={isLoading}
          />

          {/* Col 2 — 옵션 그룹 */}
          <OptionGroupManager
            optionGroups={optionGroups}
            selectedOptionGroup={selectedOptionGroup}
            selectedMenu={selectedMenu}
            onSelectOptionGroup={setSelectedOptionGroup}
            onCreateOptionGroup={handleCreateOptionGroup}
            onUpdateOptionGroup={handleUpdateOptionGroup}
            onDeleteOptionGroup={handleDeleteOptionGroup}
            onCloneOptionGroup={handleCloneOptionGroup}
            onReorderOptionGroups={handleReorderOptionGroups}
            isLoading={isLoading}
          />

          {/* Col 3 — 옵션 목록 */}
          <OptionManager
            options={
              selectedOptionGroup
                ? options.get(selectedOptionGroup.id) || []
                : []
            }
            selectedOptionGroup={selectedOptionGroup}
            linkableMenus={linkableMenus}
            onCreateOption={handleCreateOption}
            onCreateOptionWithMenu={handleCreateOptionWithMenu}
            onUpdateOption={handleUpdateOption}
            onUpdateOptionWithMenu={handleUpdateOptionWithMenu}
            onDeleteOption={handleDeleteOption}
            onCloneOption={handleCloneOption}
            onReorderOptions={handleReorderOptions}
            isLoading={isLoading}
          />

          {/* Col 4 — 메뉴 상세 패널 (인라인, 상시 노출) */}
          <MenuDetail
            menu={selectedMenu}
            optionGroups={optionGroups}
            options={options}
            linkableMenus={linkableMenus}
            isLoading={isDetailLoading}
          />
        </div>
      </div>
    </div>
  )
}
