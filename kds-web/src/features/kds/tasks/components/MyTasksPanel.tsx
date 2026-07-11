import { useMemo, useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  getElapsedMinutes,
  normalizeAssignedMenuName,
  parseApiTimestamp,
} from "../../orders/lib/orderFormatters";
import { ActionMenu } from "@/components/layout/ActionMenu";
import type { AssignedMenu, Order } from "../../../../types";

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
      .filter((order) => order.status === "NEW" || order.status === "COOKING" || order.status === "DONE")
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
    rows.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
    return rows;
  }, [assignedNames, now, orders]);

  const selectedMenuName = selectedMenuId
    ? (assignedMenus.find((menu) => String(menu.id) === selectedMenuId)?.menuName ?? null)
    : null;

  const historyRows = useMemo(() => {
    if (!selectedMenuName) return allHistoryRows;
    return allHistoryRows.filter((row) => row.menuName.trim() === selectedMenuName.trim());
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
      const message = error instanceof Error ? error.message : "담당 메뉴를 저장하지 못했습니다.";
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
    () => [...assignedMenus].sort((left, right) => {
      const leftCount = remainingCounts.get(left.menuName) ?? 0;
      const rightCount = remainingCounts.get(right.menuName) ?? 0;
      return rightCount - leftCount;
    }),
    [assignedMenus, remainingCounts],
  );

  const totalActive = Array.from(remainingCounts.values()).reduce((sum, value) => sum + value, 0);

  return (
    <section className="kds-panel kds-panel--mytasks" aria-label="내 업무">
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">내 업무</h2>
          <p className="kds-panel-subtitle">
            {assignedMenus.length > 0
              ? `담당 ${assignedMenus.length}개 메뉴 · 진행중 ${totalActive}건`
              : "담당 메뉴가 없습니다"}
          </p>
        </div>
        <button className="kds-btn-primary kds-btn-sm" onClick={openAdd} type="button">
          <Plus size={11} aria-hidden="true" />
          메뉴 추가
        </button>
      </div>

      {loading ? (
        <p className="kds-panel-empty">담당 메뉴를 불러오는 중…</p>
      ) : assignedMenus.length === 0 ? (
        <p className="kds-panel-empty">메뉴 추가를 눌러 담��� 메뉴를 등록하세요.</p>
      ) : (
        <div className="kds-mytasks-grid">
          {sortedMenus.map((menu) => {
            const count = remainingCounts.get(menu.menuName) ?? 0;
            const isIdle = count === 0;
            const isDelayed = delayedMenuNames.has(menu.menuName.trim());
            const isSelected = selectedMenuId === String(menu.id);
            const isPopoverOpen = openPopoverId === String(menu.id);
            return (
              <div
                key={menu.id}
                className={`kds-menu-tile${isIdle ? " idle" : ""}${isDelayed ? " delayed" : ""}${isSelected ? " selected" : ""}`}
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
                {isDelayed ? (
                  <span className="kds-tile-delay-dot" aria-label="지연" title="지연 주문 있음" />
                ) : null}
                <div className="kds-menu-tile-count" aria-label={`진행중 ${count}건`}>{count}</div>
                <div className="kds-menu-tile-name">{menu.menuName}</div>
                <div className="kds-tile-options-wrap">
                  <button
                    className="kds-tile-options-btn"
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
                  >
                    <MoreVertical size={14} aria-hidden="true" />
                  </button>
                  <ActionMenu
                    ariaLabel={`${menu.menuName} 메뉴 옵션`}
                    className="kds-tile-popover"
                    onClose={() => {
                      setOpenPopoverId(null);
                      setPopoverAnchorEl(null);
                    }}
                    open={isPopoverOpen}
                    positioning={
                      isPopoverOpen
                        ? { align: "end", anchorEl: popoverAnchorEl, mode: "anchor", side: "bottom" }
                        : null
                    }
                  >
                    <button
                      className="kds-tile-popover-item"
                      role="menuitem"
                      type="button"
                      onClick={() => openEdit(menu)}
                    >
                      <Pencil size={18} aria-hidden="true" />
                      수정
                    </button>
                    <button
                      className="kds-tile-popover-item danger"
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

      <div className="kds-section-divider">
        <span className="kds-section-label">
          {selectedMenuName ? `주문 내역 — ${selectedMenuName}` : "주문 내역"}
        </span>
      </div>

      {historyRows.length === 0 ? (
        <p className="kds-panel-empty">
          {selectedMenuName ? `'${selectedMenuName}' 관련 주문 내역이 없습니다.` : "관련 주문 내역이 없습니다."}
        </p>
      ) : (
        <div className="kds-table-wrap">
          <table className="kds-table kds-table--history">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>메뉴</th>
                <th style={{ textAlign: "center" }}>수량</th>
                <th>주문시각</th>
                <th style={{ textAlign: "center" }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row, idx) => (
                <tr
                  key={`${row.orderNumber}-${row.itemId}-${idx}`}
                  className={row.status === "완료" ? "row-done" : row.delayed ? "row-delayed" : ""}
                >
                  <td className="kds-table-cell-muted">{row.orderNumber}</td>
                  <td>
                    <div className="kds-table-cell-stack">
                      <span className="kds-table-cell-primary">{row.menuName}</span>
                      <span className="kds-table-cell-subtext">
                        <span className="kds-history-subtext-order">{row.orderNumber}</span>
                        <span className="kds-history-subtext-time"> · {formatHistoryTime(row.timestamp)}</span>
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{row.quantity}</td>
                  <td className="kds-table-cell-muted">{formatHistoryTime(row.timestamp)}</td>
                  <td style={{ textAlign: "center" }}>
                    {row.delayed ? (
                      <span className="kds-badge red">지연</span>
                    ) : (
                      <span className={`kds-badge${row.status === "완료" ? " dim" : " accent"}`}>{row.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {menuModal ? (
        <div className="kds-modal-backdrop" onClick={() => { setMenuModal(null); setMenuError(null); }}>
          <div
            className="kds-modal kds-modal--sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={menuModal.type === "add" ? "담당 메뉴 추가" : "담당 메뉴 수정"}
          >
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">{menuModal.type === "add" ? "담당 메뉴 추가" : "담당 메뉴 수정"}</h2>
              <button
                className="kds-modal-close"
                onClick={() => {
                  setMenuModal(null);
                  setMenuError(null);
                }}
                type="button"
                aria-label="닫기"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="kds-modal-body">
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="menu-name-input">메뉴명</label>
                <input
                  id="menu-name-input"
                  type="text"
                  value={menuInput}
                  onChange={(e) => {
                    setMenuInput(e.target.value);
                    if (menuError) {
                      setMenuError(null);
                    }
                  }}
                  placeholder="예: 짜장면"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") void saveMenu(); }}
                />
                {menuError ? <p className="kds-settings-error">{menuError}</p> : null}
              </div>
            </div>
            <div className="kds-modal-foot">
              <button
                className="kds-modal-btn secondary"
                onClick={() => {
                  setMenuModal(null);
                  setMenuError(null);
                }}
                type="button"
              >
                취소
              </button>
              <button className="kds-modal-btn primary" disabled={saving || !menuInput.trim()} onClick={() => void saveMenu()} type="button">{saving ? "저장 중…" : "저장"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="kds-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">담당 메뉴 삭제</h2>
            </div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc">
                이 담당 메뉴를 삭제하시겠습니까?<br />
                <strong>{deleteTarget.menuName}</strong>
              </p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setDeleteTarget(null)} type="button">아니오</button>
              <button className="kds-modal-btn danger" disabled={saving} onClick={() => void confirmDelete()} type="button">{saving ? "삭제 중…" : "예"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
