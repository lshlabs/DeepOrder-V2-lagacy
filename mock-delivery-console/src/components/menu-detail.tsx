"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { Menu, OptionGroup, Option } from "@/lib/types"

interface MenuDetailProps {
  menu: Menu | null
  optionGroups: OptionGroup[]
  options: Map<string, Option[]>
  linkableMenus: Menu[]
  isLoading?: boolean
}

export function MenuDetail({
  menu,
  optionGroups,
  options,
  linkableMenus,
  isLoading = false,
}: MenuDetailProps) {
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

  if (!menu) {
    return (
      <Card className="flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-muted-foreground">
          메뉴를 선택하면 상세 정보가 표시됩니다
        </p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">메뉴 상세</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3 px-5 pb-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <div className="px-5">
          <Separator />
        </div>
        <div className="flex flex-col gap-3 px-5 pt-4 pb-6">
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="mb-3 h-4 w-20" />
              <div className="flex flex-col gap-2 border-l-2 border-border pl-4">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-18" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const canHaveOptions = menu.type === "MAIN" || menu.type === "SET"

  return (
    <Card
      key={menu.id}
      className="animate-in fade-in-0 duration-200 flex flex-col overflow-hidden"
    >
      <ScrollArea className="flex-1">
      {/* Header */}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">메뉴 상세</CardTitle>
      </CardHeader>

      {/* 기본 정보 */}
      <div className="flex flex-col gap-3 px-5 pb-4">
        {/* 메뉴명 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">메뉴명</span>
          <span className="text-sm font-medium text-foreground">
            {menu.name}
          </span>
        </div>

        {/* 유형 (ID 제거) */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">유형</span>
          <div>
            <Badge variant="outline" className="rounded-full text-xs font-medium">
              {getTypeLabel(menu.type)}
            </Badge>
          </div>
        </div>

        {/* 기본가격 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">기본가격</span>
          <span className="text-sm font-semibold text-foreground">
            {menu.basePrice.toLocaleString()}원
          </span>
        </div>

        {/* 알레르기 정보 */}
        {menu.allergens.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">알레르기 정보</span>
            <div className="flex flex-wrap gap-1.5">
              {menu.allergens.map((allergen) => (
                <Badge
                  key={allergen}
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5"><Separator /></div>

      {/* 옵션 그룹 섹션 */}
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6">
        {!canHaveOptions ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Badge variant="secondary">{getTypeLabel(menu.type)}</Badge>
            <p className="text-sm text-muted-foreground">
              {getTypeLabel(menu.type)} 메뉴는 옵션 그룹을 가질 수 없습니다.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">
              옵션 그룹 ({optionGroups.length}개)
            </p>
            {optionGroups.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                설정된 옵션 그룹이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {optionGroups.map((group) => {
                  const groupOptions = options.get(group.id) || []
                  return (
                    <div
                      key={group.id}
                      className="rounded-xl border border-border bg-white p-4"
                    >
                      {/* 그룹 헤더 */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-foreground">
                            {group.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          >
                            {group.selectionType === "RADIO" ? "단일" : "다중"}
                          </Badge>
                          {group.isRequired && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
                              필수
                            </Badge>
                          )}
                          {!group.isAvailable && (
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
                              비활성
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 선택 범위 */}
                      <p className="text-sm text-muted-foreground mb-3">
                        선택: {group.minSelect}~{group.maxSelect}개
                      </p>

                      {/* 옵션 목록 */}
                      {groupOptions.length > 0 && (
                        <div className="flex flex-col border-l-2 border-border ml-1 pl-1">
                          {groupOptions.map((opt) => (
                            <div
                              key={opt.id}
                              className="flex items-center justify-between pl-3 py-1 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-foreground truncate">
                                  {opt.name}
                                </span>
                                {opt.isDefaultSelected && (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full px-2.5 py-0.5 text-xs shrink-0"
                                  >
                                    기본
                                  </Badge>
                                )}
                                {opt.linkedMenuId && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    →{" "}
                                    {linkableMenus.find(
                                      (m) => m.id === opt.linkedMenuId
                                    )?.name || "?"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                {opt.additionalPrice !== 0 && (
                                  <span className="text-sm text-foreground tabular-nums">
                                    {opt.additionalPrice > 0 ? "+" : ""}
                                    {opt.additionalPrice.toLocaleString()}원
                                  </span>
                                )}
                                {!opt.isAvailable && (
                                  <Badge variant="secondary" className="text-xs rounded-full">
                                    N/A
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
      </ScrollArea>
    </Card>
  )
}
