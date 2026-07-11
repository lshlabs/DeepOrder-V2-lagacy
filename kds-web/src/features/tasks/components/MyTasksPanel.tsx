import { useMemo, useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";

import {
  getElapsedMinutes,
  normalizeAssignedMenuName,
  parseApiTimestamp,
} from "@/lib/order-formatters";
import { ActionMenu } from "@/components/layout/ActionMenu";
import type { AssignedMenu, Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MenuModalMode = { type: "add" } | { type: "edit"; menu: AssignedMenu };

type HistoryRow = {
  orderNumber: string;
  menuName: string;
  quantity: number;
  timestamp: string;
  status: "진행중" | "완료";
  itemId: number;
  delayed: boolean;
  orderId: number;
};

type MyTasksPanelProps = {
  assignedMenus: AssignedMenu[];
  loading: boolean;
  now: number;
  onCreateAssignedMenu: (menuName: string) => Promise<void>;
  onDeleteAssignedMenu: (menuId: number) => Promise<void>;
  onUpdateAssignedMenu: (menuId: number, menuName: string) => Promise<void>;
  orders: Order[];
  saving: boolean;
};

export function MyTasksPanel({
  assignedMenus,
  loading,
  now,
  onCreateAssignedMenu,
  onDeleteAssignedMenu,
  onUpdateAssignedMenu,
  orders,
  saving,
}: MyTasksPanelProps) {
  const DELAY_THRESHOLD_MINUTES = 10;

  const [menuModal, setMenuModal] = useState<MenuModalMode | null>(null);
  const [menuInput, setMenuInput] = useState("");
  const [menuError, setMenuError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignedMenu | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);

  const assignedNames = useMemo(
    () => new Set(assignedMenus.map((menu) => menu.menuName.trim())),
    [assignedMenus],
  );

  const remainingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    assignedMenus.forEach((menu) => counts.set(menu.menuName, 0));
    orders
      .filter((order) => order.status === "NEW" || order.status === "COOKING")
      .forEach((order) => {
        order.items.forEach((item) => {
          const key = item.name.trim();
          if (assignedNames.has(key) && !item.done) {
            counts.set(key, (counts.get(key) ?? 0) + item.quantity);
          }
        });
      });
    return counts;
  }, [assignedMenus, assignedNames, orders]);

  const delayedMenuNames = useMemo(() => {
    const delayed = new Set<string>();
    orders
      .filter((order) => order.status === "NEW" || order.status === "COOKING")
      .forEach((order) => {
        const elapsed = getElapsedMinutes(now, order.ordered_at ?? order.created_at);
        if (elapsed >= DELAY_THRESHOLD_MINUTES) {
          order.items.forEach((item) => {
            if (assignedNames.has(item.name.trim()) && !item.done) {
              delayed.add(item.name.trim());
            }
          });
        }
      });
    return delayed;
  }, [assignedNames, now, orders]);

  const allHistoryRows = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [];
    orders
      .filter(
        (order) =>
          order.status === "NEW" ||
          order.status === "COOKING" ||
          order.status === "DONE",
      )
      .forEach((order) => {
        const elapsedMin = getElapsedMinutes(now, order.ordered_at ?? order.created_at);
        const inProgress = order.status === "NEW" || order.status === "COOKING";
        order.items.forEach((item) => {
          if (!assignedNames.has(item.name.trim())) return;
          const done = order.status === "DONE" || item.done;
          rows.push({
            orderNumber: order.order_number ?? String(order.id),
            menuName: item.name,
            quantity: item.quantity,
            timestamp: order.ordered_at ?? order.created_at,
            status: done ? "완료" : "진행중",
            itemId: item.id,
            delayed: inProgress && !done && elapsedMin >= DELAY_THRESHOLD_MINUTES,
            orderId: order.id,
          });
        });
      });
    rows.sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
    return rows;
  }, [assignedNames, now, orders]);

  const selectedMenuName = selectedMenuId
    ? (assignedMenus.find((menu) => String(menu.id) === selectedMenuId)?.menuName ?? null)
    : null;

  const historyRows = useMemo(() => {
    if (!selectedMenuName) return allHistoryRows;
    return allHistoryRows.filter(
      (row) => row.menuName.trim() === selectedMenuName.trim(),
    );
  }, [allHistoryRows, selectedMenuName]);

  function openAdd() {
    setMenuInput("");
    setMenuError(null);
    setMenuModal({ type: "add" });
  }

  function openEdit(menu: AssignedMenu) {
    setMenuInput(menu.menuName);
    setMenuError(null);
    setMenuModal({ type: "edit", menu });
    setOpenPopoverId(null);
    setPopoverAnchorEl(null);
  }

  async function saveMenu() {
    const name = menuInput.trim();
    if (!name) return;
    const normalizedName = normalizeAssignedMenuName(name);
    const duplicateMenu = assignedMenus.find((menu) => {
      if (menuModal?.type === "edit" && menu.id === menuModal.menu.id) {
        return false;
      }
      return normalizeAssignedMenuName(menu.menuName) === normalizedName;
    });
    if (duplicateMenu) {
      setMenuError("이미 등록된 담당 메뉴입니다.");
      return;
    }
    try {
      if (menuModal?.type === "add") {
        await onCreateAssignedMenu(name);
      } else if (menuModal?.type === "edit") {
        await onUpdateAssignedMenu(menuModal.menu.id, name);
      }
      setMenuError(null);
      setMenuModal(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "담당 메뉴를 저장하지 못했습니다.";
      if (message.includes("이미 등록된 담당 메뉴")) {
        setMenuError("이미 등록된 담당 메뉴입니다.");
        return;
      }
      throw error;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (selectedMenuId === String(deleteTarget.id)) setSelectedMenuId(null);
    await onDeleteAssignedMenu(deleteTarget.id);
    setDeleteTarget(null);
  }

  function formatHistoryTime(timestamp: string) {
    const date = parseApiTimestamp(timestamp);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleTileClick(menuId: string) {
    setSelectedMenuId((prev) => (prev === menuId ? null : menuId));
  }

  const sortedMenus = useMemo(
    () =>
      [...assignedMenus].sort((left, right) => {
        const leftCount = remainingCounts.get(left.menuName) ?? 0;
        const rightCount = remainingCounts.get(right.menuName) ?? 0;
        return rightCount - leftCount;
      }),
    [assignedMenus, remainingCounts],
  );

  const totalActive = Array.from(remainingCounts.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  return (
    <section
      className="flex flex-col h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain scrollbar-none"
      aria-label="내 업무"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-[22px] pt-[18px] pb-4">
        <div>
          <h2 className="text-[17px] font-bold tracking-[-0.3px] text-[var(--color-text)]">
            내 업무
          </h2>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
            {assignedMenus.length > 0
              ? `담당 ${assignedMenus.length}개 메뉴 · 진행중 ${totalActive}건`
              : "담당 메뉴가 없습니다"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={openAdd}
          type="button"
          className="h-7 text-[12px] px-2.5 gap-1"
        >
          <Plus size={11} aria-hidden="true" />
          메뉴 추가
        </Button>
      </div>

      {loading ? (
        <p className="text-[13px] text-[var(--color-text-muted)] px-[22px] py-[14px]">
          담당 메뉴를 불러오는 중…
        </p>
      ) : assignedMenus.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)] px-[22px] py-[14px]">
          메뉴 추가를 눌러 담당 메뉴를 등록하세요.
        </p>
      ) : (
        /* Tile grid */
        <div
          className="grid gap-px border-b border-[var(--color-border)] bg-[var(--color-border)]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))" }}
        >
          {sortedMenus.map((menu) => {
            const count = remainingCounts.get(menu.menuName) ?? 0;
            const isIdle = count === 0;
            const isDelayed = delayedMenuNames.has(menu.menuName.trim());
            const isSelected = selectedMenuId === String(menu.id);
            const isPopoverOpen = openPopoverId === String(menu.id);
            return (
              <div
                key={menu.id}
                className={cn(
                  "relative flex flex-col gap-1 min-h-[96px] bg-[var(--color-surface)] cursor-pointer select-none outline-none pt-[14px] pr-4 pb-3 pl-4 transition-[background] duration-[120ms]",
                  "hover:bg-[var(--color-surface-2)] focus-visible:shadow-[inset_0_0_0_2px_var(--color-accent)]",
                  isIdle && "opacity-55",
                  isDelayed && !isSelected && "bg-[var(--color-red-subtle)]",
                  isSelected && "!bg-[var(--color-accent-subtle)] opacity-100",
                )}
                onClick={() => handleTileClick(String(menu.id))}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTileClick(String(menu.id));
                  }
                }}
              >
                {/* Delay dot */}
                {isDelayed ? (
                  <span
                    className="absolute right-[34px] top-3 block w-[7px] h-[7px] rounded-full bg-[var(--color-red)]"
                    aria-label="지연"
                    title="지연 주문 있음"
                  />
                ) : null}

                {/* Count */}
                <div
                  className={cn(
                    "text-[36px] font-[800] leading-none tracking-[-1px]",
                    isIdle && "text-[var(--color-text-muted)]",
                    isDelayed && !isSelected && "text-[var(--color-red)]",
                    isSelected
                      ? isDelayed
                        ? "text-[var(--color-red)]"
                        : "text-[var(--color-accent)]"
                      : !isIdle && !isDelayed
                        ? "text-[var(--color-accent)]"
                        : "",
                  )}
                  aria-label={`진행중 ${count}건`}
                >
                  {count}
                </div>

                {/* Menu name */}
                <div
                  className={cn(
                    "text-[13px] font-medium leading-[1.3] max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[var(--color-text-subtle)]",
                    isSelected && "text-[var(--color-accent)] font-semibold",
                  )}
                >
                  {menu.menuName}
                </div>

                {/* Options button */}
                <div className="absolute right-2 top-2">
                  <button
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] bg-transparent border-none text-[var(--color-text-muted)] cursor-pointer transition-[opacity,background] duration-100",
                      "opacity-0 group-hover:opacity-100",
                      "[.kds-menu-tile:hover_&]:opacity-100",
                      isSelected && "opacity-100",
                      "hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]",
                      // always show on touch devices
                      "[@media(hover:none)]:opacity-100 [@media(pointer:coarse)]:opacity-100",
                    )}
                    aria-label={`${menu.menuName} 메뉴 옵션`}
                    aria-expanded={isPopoverOpen}
                    aria-haspopup="menu"
                    title="옵션"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPopoverOpen) {
                        setOpenPopoverId(null);
                        setPopoverAnchorEl(null);
                        return;
                      }
                      setOpenPopoverId(String(menu.id));
                      setPopoverAnchorEl(e.currentTarget);
                    }}
                    style={{ opacity: isSelected || isPopoverOpen ? 1 : undefined }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isPopoverOpen) {
                        // let the parent hover handle it
                        (e.currentTarget as HTMLButtonElement).style.opacity = "";
                      }
                    }}
                  >
                    <MoreVertical size={14} aria-hidden="true" />
                  </button>
                  <ActionMenu
                    ariaLabel={`${menu.menuName} 메뉴 옵션`}
                    className="animate-[kds-floating-in_120ms_ease-out] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-floating)] flex flex-col min-w-[152px] overflow-hidden p-[var(--kds-floating-padding-menu)] fixed z-50"
                    onClose={() => {
                      setOpenPopoverId(null);
                      setPopoverAnchorEl(null);
                    }}
                    open={isPopoverOpen}
                    positioning={
                      isPopoverOpen
                        ? {
                            align: "end",
                            anchorEl: popoverAnchorEl,
                            mode: "anchor",
                            side: "bottom",
                          }
                        : null
                    }
                  >
                    <button
                      className="flex items-center w-full bg-transparent border-none text-[var(--color-text)] text-[14px] font-medium gap-2.5 min-h-[var(--kds-menu-item-height)] px-3 text-left transition-[background] hover:bg-[var(--color-surface-2)]"
                      role="menuitem"
                      type="button"
                      onClick={() => openEdit(menu)}
                    >
                      <Pencil size={18} aria-hidden="true" />
                      수정
                    </button>
                    <button
                      className="flex items-center w-full bg-transparent border-none text-[var(--color-danger-text)] text-[14px] font-medium gap-2.5 min-h-[var(--kds-menu-item-height)] px-3 text-left transition-[background] hover:bg-[var(--color-danger-bg)]"
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setDeleteTarget(menu);
                        setOpenPopoverId(null);
                        setPopoverAnchorEl(null);
                      }}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                      삭제
                    </button>
                  </ActionMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section divider */}
      <div className="flex items-center border-b border-[var(--color-border)] px-3 pt-2.5 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          {selectedMenuName ? `주문 내역 — ${selectedMenuName}` : "주문 내역"}
        </span>
      </div>

      {historyRows.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)] px-[22px] py-[14px]">
          {selectedMenuName
            ? `'${selectedMenuName}' 관련 주문 내역이 없습니다.`
            : "관련 주문 내역이 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto overflow-y-auto flex-shrink flex-grow min-h-0 scrollbar-none">
          <table
            className="w-full border-collapse text-[12px] sm:text-[13px]"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr>
                {/* Col 1: order number — hidden on mobile, visible md+ */}
                <th className="hidden md:table-cell border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-2 px-3 pl-4 w-[16%]">
                  주문번호
                </th>
                {/* Col 2: menu */}
                <th className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-2 px-3 w-[62%] md:w-auto">
                  메뉴
                </th>
                {/* Col 3: qty */}
                <th className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-center text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-2 px-3 w-[14%] md:w-[10%]">
                  수량
                </th>
                {/* Col 4: time — hidden mobile, visible md+ */}
                <th className="hidden md:table-cell border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-2 px-3 w-[20%]">
                  주문시각
                </th>
                {/* Col 5: status */}
                <th className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-center text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-2 px-3 w-[24%] md:w-[14%]">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row, idx) => (
                <tr
                  key={`${row.orderNumber}-${row.itemId}-${idx}`}
                  className={cn(
                    "border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-2)]",
                    row.status === "완료" && "opacity-65 text-[var(--color-text-muted)]",
                    row.delayed && "text-[var(--color-red)]",
                  )}
                >
                  <td className="hidden md:table-cell overflow-hidden text-ellipsis whitespace-nowrap py-[11px] px-3 pl-4 text-[var(--color-text-muted)]">
                    {row.orderNumber}
                  </td>
                  <td className="overflow-hidden text-ellipsis whitespace-nowrap py-[11px] px-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                        {row.menuName}
                      </span>
                      <span className="md:hidden text-[11px] text-[var(--color-text-muted)] block overflow-hidden text-ellipsis whitespace-nowrap">
                        <span>{row.orderNumber}</span>
                        <span> · {formatHistoryTime(row.timestamp)}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-[11px] px-3 text-center font-bold">{row.quantity}</td>
                  <td className="hidden md:table-cell overflow-hidden text-ellipsis whitespace-nowrap py-[11px] px-3 text-[var(--color-text-muted)]">
                    {formatHistoryTime(row.timestamp)}
                  </td>
                  <td className="py-[11px] px-3 text-center">
                    {row.delayed ? (
                      <Badge className="rounded-full bg-[var(--color-red-subtle)] text-[var(--color-red)] hover:bg-[var(--color-red-subtle)] text-[11px] font-semibold px-2 py-0.5">
                        지연
                      </Badge>
                    ) : row.status === "완료" ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[11px] font-semibold px-2 py-0.5 opacity-60"
                      >
                        완료
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] text-[11px] font-semibold px-2 py-0.5">
                        진행중
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit menu dialog */}
      <Dialog
        open={menuModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMenuModal(null);
            setMenuError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {menuModal?.type === "add" ? "담당 메뉴 추가" : "담당 메뉴 수정"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="menu-name-input"
                className="text-[12px] text-[var(--color-text-muted)] font-medium"
              >
                메뉴명
              </Label>
              <Input
                id="menu-name-input"
                type="text"
                value={menuInput}
                onChange={(e) => {
                  setMenuInput(e.target.value);
                  if (menuError) setMenuError(null);
                }}
                placeholder="예: 짜장면"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) void saveMenu();
                }}
              />
              {menuError ? (
                <p className="text-[12px] text-[var(--color-error-text)]">{menuError}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMenuModal(null);
                setMenuError(null);
              }}
              type="button"
            >
              취소
            </Button>
            <Button
              disabled={saving || !menuInput.trim()}
              onClick={() => void saveMenu()}
              type="button"
            >
              {saving ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>담당 메뉴 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 담당 메뉴를 삭제하시겠습니까?
              <br />
              <strong>{deleteTarget?.menuName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>아니오</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "삭제 중…" : "예"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
