"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, Check, X, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Store } from "@/lib/types"

interface StoreManagerProps {
  stores: Store[]
  selectedStore: Store | null
  onSelectStore: (store: Store) => void
  onCreateStore: (data: Omit<Store, "id" | "createdAt" | "updatedAt">) => Promise<void>
  onUpdateStore: (
    id: string,
    data: Partial<Omit<Store, "id" | "createdAt" | "updatedAt">>
  ) => Promise<void>
  onDeleteStore: (id: string) => Promise<void>
  isLoading: boolean
}

export function StoreManager({
  stores,
  selectedStore,
  onSelectStore,
  onCreateStore,
  onUpdateStore,
  onDeleteStore,
  isLoading,
}: StoreManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
  })

  const resetForm = () => {
    setFormData({ name: "", isActive: true })
    setIsCreating(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    await onCreateStore(formData)
    resetForm()
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) return
    await onUpdateStore(editingId, formData)
    resetForm()
  }

  const startEdit = (store: Store) => {
    setEditingId(store.id)
    setFormData({
      name: store.name,
      isActive: store.isActive,
    })
    setIsCreating(false)
  }

  const startCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setFormData({ name: "", isActive: true })
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center border-b px-6 py-4">
        <span className="text-base font-semibold">
          매장 목록
          {stores.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {stores.length}
            </span>
          )}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 px-6 py-4">
        {(isCreating || editingId) && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="store-name">매장명</Label>
              <Input
                id="store-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="매장 이름을 입력하세요"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="store-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="store-active">운영중</Label>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={isLoading || !formData.name.trim()}
              >
                <Check className="h-4 w-4 mr-1" />
                {editingId ? "저장" : "생성"}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2">
            {stores.map((store) => (
              <div
                key={store.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedStore?.id === store.id
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectStore(store)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{store.name}</span>
                      <Badge
                        variant={store.isActive ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {store.isActive ? "운영중" : "휴업"}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEdit(store) }}>
                        <Edit2 />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); onDeleteStore(store.id) }}>
                        <Trash2 />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {!isCreating && !editingId && (
              <button
                type="button"
                disabled={isLoading}
                onClick={startCreate}
                className="w-full rounded-lg border border-dashed border-muted-foreground/40 bg-transparent py-3 flex items-center justify-center text-muted-foreground hover:border-muted-foreground/70 hover:bg-muted/30 hover:text-foreground transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
