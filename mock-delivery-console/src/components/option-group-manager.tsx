"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Plus, Edit2, Trash2, Check, X, Copy, GripVertical, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Menu, OptionGroup, SelectionType } from "@/lib/types"

const SELECTION_TYPES: SelectionType[] = ["RADIO", "CHECKBOX"]

interface SortableOptionGroupItemProps {
  og: OptionGroup
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onClone: () => void
}

function SortableOptionGroupItem({
  og,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onClone,
}: SortableOptionGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: og.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/10"
          : "hover:bg-muted/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{og.name}</span>
            <Badge variant="outline" className="shrink-0">
              {og.selectionType === "RADIO" ? "단일" : "다중"}
            </Badge>
            {og.isRequired && (
              <Badge variant="default" className="shrink-0">
                필수
              </Badge>
            )}
            {!og.isAvailable && (
              <Badge variant="secondary" className="shrink-0">
                비활성
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            선택: {og.minSelect}~{og.maxSelect}개
          </p>
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClone() }}>
              <Copy />
              복제
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Edit2 />
              수정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
              <Trash2 />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

interface OptionGroupManagerProps {
  optionGroups: OptionGroup[]
  selectedOptionGroup: OptionGroup | null
  selectedMenu: Menu | null
  onSelectOptionGroup: (og: OptionGroup) => void
  onCreateOptionGroup: (
    data: Omit<OptionGroup, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>
  onUpdateOptionGroup: (
    id: string,
    data: Partial<Omit<OptionGroup, "id" | "createdAt" | "updatedAt">>
  ) => Promise<void>
  onDeleteOptionGroup: (id: string) => Promise<void>
  onCloneOptionGroup: (id: string) => Promise<void>
  onReorderOptionGroups?: (reorderedGroups: OptionGroup[]) => void
  isLoading: boolean
}

export function OptionGroupManager({
  optionGroups,
  selectedOptionGroup,
  selectedMenu,
  onSelectOptionGroup,
  onCreateOptionGroup,
  onUpdateOptionGroup,
  onDeleteOptionGroup,
  onCloneOptionGroup,
  onReorderOptionGroups,
  isLoading,
}: OptionGroupManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    selectionType: SelectionType
    isRequired: boolean
    minSelect: number
    maxSelect: number
    isAvailable: boolean
  }>({
    name: "",
    selectionType: "RADIO",
    isRequired: false,
    minSelect: 0,
    maxSelect: 1,
    isAvailable: true,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const canHaveOptionGroups =
    selectedMenu?.type === "MAIN" || selectedMenu?.type === "SET"

  const resetForm = () => {
    setFormData({
      name: "",
      selectionType: "RADIO",
      isRequired: false,
      minSelect: 0,
      maxSelect: 1,
      isAvailable: true,
    })
    setIsCreating(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !selectedMenu) return
    // When required, enforce "select exactly 1"
    const minSelect = formData.isRequired ? 1 : formData.minSelect
    const maxSelect = formData.isRequired ? 1 : formData.maxSelect
    await onCreateOptionGroup({
      ...formData,
      menuId: selectedMenu.id,
      minSelect,
      maxSelect,
      sortOrder: optionGroups.length,
    })
    resetForm()
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) return
    // When required, enforce "select exactly 1"
    const minSelect = formData.isRequired ? 1 : formData.minSelect
    const maxSelect = formData.isRequired ? 1 : formData.maxSelect
    const currentGroup = optionGroups.find((g) => g.id === editingId)
    await onUpdateOptionGroup(editingId, {
      ...formData,
      minSelect,
      maxSelect,
      sortOrder: currentGroup?.sortOrder ?? 0,
    })
    resetForm()
  }

  const startEdit = (og: OptionGroup) => {
    setEditingId(og.id)
    setFormData({
      name: og.name,
      selectionType: og.selectionType,
      isRequired: og.isRequired,
      minSelect: og.minSelect,
      maxSelect: og.maxSelect,
      isAvailable: og.isAvailable,
    })
    setIsCreating(false)
  }

  const startCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setFormData({
      name: "",
      selectionType: "RADIO",
      isRequired: false,
      minSelect: 0,
      maxSelect: 1,
      isAvailable: true,
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = optionGroups.findIndex((g) => g.id === active.id)
    const newIndex = optionGroups.findIndex((g) => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Recompute sortOrder for every group based on its new position
    const reordered = arrayMove(optionGroups, oldIndex, newIndex).map(
      (group, index) => ({ ...group, sortOrder: index })
    )

    // Optimistic UI update so the new order reflects immediately
    onReorderOptionGroups?.(reordered)

    // Persist every group whose position actually changed. We compare each
    // group against its OWN previous sortOrder (matched by id) so the new
    // order survives navigation, re-renders, and import/export.
    const changed = reordered.filter((group) => {
      const original = optionGroups.find((g) => g.id === group.id)
      return !original || original.sortOrder !== group.sortOrder
    })

    await Promise.all(
      changed.map((group) =>
        onUpdateOptionGroup(group.id, { sortOrder: group.sortOrder })
      )
    )
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MAIN":
        return "메인"
      case "SET":
        return "세트"
      case "SIDE":
        return "사이드"
      case "DRINK":
        return "음료"
      default:
        return type
    }
  }

  if (!selectedMenu) {
    return (
      <Card className="flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-muted-foreground">
          메뉴를 선택하면 옵션 그룹이 표시됩니다
        </p>
      </Card>
    )
  }

  if (!canHaveOptionGroups) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">옵션 그룹</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Badge variant="secondary">{getTypeLabel(selectedMenu.type)}</Badge>
            <p className="text-sm text-muted-foreground">
              {getTypeLabel(selectedMenu.type)} 메뉴는 옵션 그룹을 가질 수 없습니다.
              <br />
              메인과 세트 메뉴만 옵션을 지원합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            옵션 그룹
            {optionGroups.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {optionGroups.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {(isCreating || editingId) && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="og-name">그룹명</Label>
                <Input
                  id="og-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 사이즈, 토핑"
                />
              </div>
              <div className="space-y-2">
                <Label>선택 방식</Label>
                <div className="flex gap-1.5">
                  {SELECTION_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      variant={formData.selectionType === type ? "default" : "outline"}
                      className={`flex-1 ${
                        formData.selectionType === type ? "pointer-events-none" : ""
                      }`}
                      aria-pressed={formData.selectionType === type}
                      onClick={() =>
                        setFormData({ ...formData, selectionType: type })
                      }
                    >
                      {type === "RADIO" ? "라디오 (단일)" : "체크박스 (다중)"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>필수 여부</Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={!formData.isRequired ? "default" : "outline"}
                    className={`flex-1 ${
                      !formData.isRequired ? "pointer-events-none" : ""
                    }`}
                    aria-pressed={!formData.isRequired}
                    onClick={() =>
                      setFormData({ ...formData, isRequired: false })
                    }
                  >
                    선택
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.isRequired ? "default" : "outline"}
                    className={`flex-1 ${
                      formData.isRequired ? "pointer-events-none" : ""
                    }`}
                    aria-pressed={formData.isRequired}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        isRequired: true,
                        // Enforce "select exactly 1" when required
                        minSelect: 1,
                        maxSelect: 1,
                      })
                    }
                  >
                    필수
                  </Button>
                </div>
                {formData.isRequired && (
                  <p className="text-xs text-muted-foreground">
                    필수 그룹은 정확히 1개를 선택하도록 강제됩니다.
                  </p>
                )}
              </div>
              {!formData.isRequired && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="og-min">최소 선택</Label>
                    <Input
                      id="og-min"
                      type="number"
                      min={0}
                      value={formData.minSelect}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minSelect: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="og-max">최대 선택</Label>
                    <Input
                      id="og-max"
                      type="number"
                      min={formData.minSelect}
                      value={formData.maxSelect}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxSelect: Math.max(
                            formData.minSelect,
                            parseInt(e.target.value) || 1
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  id="og-available"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAvailable: checked })
                  }
                />
                <Label htmlFor="og-available">사용 가능</Label>
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

          <div className="space-y-2">
            {optionGroups.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={optionGroups.map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {optionGroups.map((og) => (
                    <SortableOptionGroupItem
                      key={og.id}
                      og={og}
                      isSelected={selectedOptionGroup?.id === og.id}
                      onSelect={() => onSelectOptionGroup(og)}
                      onEdit={() => startEdit(og)}
                      onDelete={() => onDeleteOptionGroup(og.id)}
                      onClone={() => onCloneOptionGroup(og.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            {!isCreating && (
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
        </CardContent>
      </Card>

  )
}
