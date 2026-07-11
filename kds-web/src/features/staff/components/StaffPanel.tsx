import { useCallback, useEffect, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";

import {
  apiCreateStaff,
  apiGetStaff,
  apiRegenerateStaffPin,
  apiUpdateStaff,
  apiUpdateStaffActive,
} from "../../../lib/api";
import { ActionMenu } from "@/components/layout/ActionMenu";
import { requestWithReauth } from "@/lib/requestWithReauth";
import type { AuthSession, Staff } from "@/lib/types";
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

type StaffModalMode =
  | { type: "add" }
  | { type: "edit"; member: Staff }
  | { type: "created"; member: Staff; temporaryPin: string }
  | { type: "deactivate"; member: Staff };

type StaffPanelProps = {
  session: AuthSession;
  onUnauthorized: () => Promise<string | null>;
};

export function StaffPanel({ session, onUnauthorized }: StaffPanelProps) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<StaffModalMode | null>(null);
  const [form, setForm] = useState({ name: "", loginId: "", role: "직원" });
  const [formError, setFormError] = useState<string | null>(null);
  const [revealedPinByStaffId, setRevealedPinByStaffId] = useState<Record<number, string>>({});
  const [actionMenuStaffId, setActionMenuStaffId] = useState<number | null>(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<HTMLElement | null>(null);

  function normalizeStaffIdentifier(value: string) {
    return value.trim().toLowerCase();
  }

  function isValidStaffIdentifier(value: string) {
    return /^[a-z0-9][a-z0-9._-]{3,31}$/.test(value);
  }

  const fetchStaff = useCallback(async () => {
    const data = await requestWithReauth(session.accessToken, onUnauthorized, apiGetStaff);
    setStaffList(data.staff);
  }, [onUnauthorized, session.accessToken]);

  useEffect(() => {
    void fetchStaff()
      .catch((error) => {
        setFormError(error instanceof Error ? error.message : "직원 목록을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [fetchStaff]);

  function openAdd() {
    setActionMenuStaffId(null);
    setActionMenuAnchorEl(null);
    setRevealedPinByStaffId({});
    setForm({ name: "", loginId: "", role: "직원" });
    setFormError(null);
    setModal({ type: "add" });
  }

  function openEdit(member: Staff) {
    setActionMenuStaffId(null);
    setActionMenuAnchorEl(null);
    setRevealedPinByStaffId({});
    setForm({ name: member.name, loginId: member.loginId, role: member.positionLabel ?? "직원" });
    setFormError(null);
    setModal({ type: "edit", member });
  }

  function closeActionMenu() {
    setActionMenuStaffId(null);
    setActionMenuAnchorEl(null);
  }

  async function saveStaff() {
    if (!form.name.trim()) {
      setFormError("이름을 입력하세요.");
      return;
    }
    if (!isValidStaffIdentifier(form.loginId)) {
      setFormError("아이디는 영문 소문자, 숫자, ., _, - 만 사용해 4~32자로 입력해주세요.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const loginId = normalizeStaffIdentifier(form.loginId);
      if (modal?.type === "add") {
        const created = await requestWithReauth(
          session.accessToken,
          onUnauthorized,
          (accessToken) =>
            apiCreateStaff(accessToken, {
              name: form.name.trim(),
              loginId,
              positionLabel: form.role,
            }),
        );
        setRevealedPinByStaffId({ [created.id]: created.temporaryPin });
        setModal({ type: "created", member: created, temporaryPin: created.temporaryPin });
      } else if (modal?.type === "edit") {
        await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
          apiUpdateStaff(accessToken, modal.member.id, {
            name: form.name.trim(),
            loginId,
            positionLabel: form.role,
          }),
        );
        setModal(null);
      }
      await fetchStaff();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "직원 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function reissuePin(member: Staff) {
    setActionMenuStaffId(null);
    setActionMenuAnchorEl(null);
    setSaving(true);
    try {
      const result = await requestWithReauth(
        session.accessToken,
        onUnauthorized,
        (accessToken) => apiRegenerateStaffPin(accessToken, member.id),
      );
      setRevealedPinByStaffId({ [member.id]: result.temporaryPin });
      await fetchStaff();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "PIN을 재발급하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: Staff) {
    setActionMenuStaffId(null);
    setActionMenuAnchorEl(null);
    setSaving(true);
    try {
      await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiUpdateStaffActive(accessToken, member.id, { active: !member.active }),
      );
      setModal(null);
      await fetchStaff();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "직원 상태를 변경하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  const activeCount = staffList.filter((member) => member.active).length;

  function toggleActionMenu(memberId: number, button: HTMLButtonElement) {
    if (actionMenuStaffId === memberId) {
      closeActionMenu();
      return;
    }
    setActionMenuAnchorEl(button);
    setActionMenuStaffId(memberId);
  }

  /* ─── helpers ─── */
  const roleBadge = (member: Staff) =>
    member.positionLabel === "매니저" ? (
      <Badge className="rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] text-[11px] font-semibold px-2 py-0.5">
        {member.positionLabel}
      </Badge>
    ) : (
      <Badge variant="secondary" className="rounded-full text-[11px] font-semibold px-2 py-0.5">
        {member.positionLabel ?? "직원"}
      </Badge>
    );

  const activeBadge = (member: Staff) =>
    member.active ? (
      <Badge className="rounded-full bg-[var(--color-green-subtle)] text-[var(--color-green)] hover:bg-[var(--color-green-subtle)] text-[11px] font-semibold px-2 py-0.5">
        활성
      </Badge>
    ) : (
      <Badge variant="secondary" className="rounded-full text-[11px] font-semibold px-2 py-0.5 opacity-60">
        비활성
      </Badge>
    );

  const isFormModalOpen = modal?.type === "add" || modal?.type === "edit";
  const isCreatedModalOpen = modal?.type === "created";
  const isDeactivateModalOpen = modal?.type === "deactivate";

  return (
    <section
      className="flex flex-col h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-[14px] scrollbar-none"
      aria-label="직원 관리"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-[14px] mb-0">
        <div>
          <h2 className="text-[17px] font-bold tracking-[-0.3px] text-[var(--color-text)]">
            직원 관리
          </h2>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
            총 {staffList.length}명 &middot; 활성 {activeCount}명
          </p>
        </div>
        <Button
          size="sm"
          disabled={saving}
          onClick={openAdd}
          type="button"
          className="h-7 text-[12px] px-2.5 gap-1"
        >
          <Plus size={12} aria-hidden="true" />
          직원 추가
        </Button>
      </div>

      {formError && !modal ? (
        <div
          className="mt-3 rounded-md bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error-text)] text-[12px] px-3 py-2"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[var(--color-text-muted)] py-[14px]">
          직원 목록을 불러오는 중…
        </p>
      ) : null}

      {!loading ? (
        <div className="overflow-x-auto flex-grow flex-shrink min-h-0 scrollbar-none">
          <table className="w-full border-collapse text-[12px] table-fixed" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-[9px] px-3 pl-[14px] w-auto">
                  <span className="md:hidden">직원 정보</span>
                  <span className="hidden md:inline">이름</span>
                </th>
                <th className="hidden md:table-cell border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-[9px] px-3 w-[24%]">
                  아이디
                </th>
                <th className="hidden md:table-cell border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-center text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-[9px] px-3 w-[14%]">
                  역할
                </th>
                <th className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-center text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-[9px] px-3 w-[60px] md:w-[12%]">
                  상태
                </th>
                <th className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] sticky top-0 z-10 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--color-text-muted)] py-[9px] pr-3 pl-1 w-[44px] md:w-[52px]">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((member) => (
                <tr
                  key={member.id}
                  className={cn(
                    "border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-2)]",
                    !member.active && "opacity-45",
                  )}
                >
                  {/* Name cell */}
                  <td className="overflow-hidden text-ellipsis whitespace-nowrap py-[11px] px-3 pl-[14px] text-[var(--color-text)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="hidden md:flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-[11px] font-bold shrink-0"
                        aria-hidden="true"
                      >
                        {member.name.slice(0, 1)}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                          {member.name}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] block overflow-hidden text-ellipsis whitespace-nowrap md:hidden">
                          {member.loginId}
                          <span className="md:hidden"> &middot; {member.positionLabel ?? "직원"}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* Login ID — md+ only */}
                  <td className="hidden md:table-cell overflow-hidden text-ellipsis whitespace-nowrap py-[11px] px-3 text-[var(--color-text-muted)]">
                    {member.loginId}
                  </td>
                  {/* Role — md+ only */}
                  <td className="hidden md:table-cell py-[11px] px-3 text-center">
                    {roleBadge(member)}
                  </td>
                  {/* Status */}
                  <td className="py-[11px] px-1 text-center">
                    {activeBadge(member)}
                  </td>
                  {/* Actions */}
                  <td className="overflow-visible relative py-[11px] pr-3 pl-1 text-right">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      {/* Inline actions — xl+ */}
                      <div className="hidden xl:flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          onClick={() => openEdit(member)}
                          type="button"
                          aria-label="수정"
                          className="h-7 text-[11px] px-2"
                        >
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          onClick={() => setModal({ type: "deactivate", member })}
                          type="button"
                          aria-label={member.active ? "비활성화" : "활성화"}
                          className={cn(
                            "h-7 text-[11px] px-2",
                            member.active
                              ? "text-[var(--color-danger-text)] hover:text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)]"
                              : "text-[var(--color-success-text)] hover:text-[var(--color-success-text)] hover:bg-[var(--color-success-bg)]",
                          )}
                        >
                          {member.active ? "비활성화" : "활성화"}
                        </Button>
                      </div>
                      {/* Overflow menu — below xl */}
                      <div
                        className={cn(
                          "xl:hidden inline-flex relative z-20",
                          actionMenuStaffId === member.id && "z-[200]",
                        )}
                      >
                        <button
                          aria-expanded={actionMenuStaffId === member.id}
                          aria-haspopup="menu"
                          className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] border border-transparent bg-transparent text-[var(--color-text-muted)] transition-colors",
                            "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
                            actionMenuStaffId === member.id &&
                              "bg-[var(--color-surface-2)] text-[var(--color-text)]",
                          )}
                          disabled={saving}
                          onClick={(event) => toggleActionMenu(member.id, event.currentTarget)}
                          type="button"
                        >
                          <span className="sr-only">직원 작업 메뉴 열기</span>
                          <MoreVertical size={16} aria-hidden="true" />
                        </button>
                        <ActionMenu
                          ariaLabel="직원 작업"
                          className="animate-[kds-floating-in_120ms_ease-out] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-floating)] min-w-[152px] md:min-w-[168px] p-[var(--kds-floating-padding-menu)] fixed z-[100]"
                          onClose={closeActionMenu}
                          open={actionMenuStaffId === member.id}
                          positioning={
                            actionMenuStaffId === member.id
                              ? {
                                  align: "end",
                                  anchorEl: actionMenuAnchorEl,
                                  mode: "anchor",
                                  side: "bottom",
                                }
                              : null
                          }
                        >
                          <button
                            className="flex items-center w-full text-left bg-transparent border-none rounded-[var(--radius-sm)] text-[var(--color-text)] text-[14px] font-medium h-[var(--kds-menu-item-height)] px-3 hover:bg-[var(--color-surface-2)]"
                            onClick={() => openEdit(member)}
                            role="menuitem"
                            type="button"
                          >
                            수정
                          </button>
                          <button
                            className={cn(
                              "flex items-center w-full text-left bg-transparent border-none rounded-[var(--radius-sm)] text-[14px] font-medium h-[var(--kds-menu-item-height)] px-3",
                              member.active
                                ? "text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)]"
                                : "text-[var(--color-success-text)] hover:bg-[var(--color-success-bg)]",
                            )}
                            onClick={() => {
                              closeActionMenu();
                              setModal({ type: "deactivate", member });
                            }}
                            role="menuitem"
                            type="button"
                          >
                            {member.active ? "비활성화" : "활성화"}
                          </button>
                        </ActionMenu>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Add / Edit dialog */}
      <Dialog
        open={isFormModalOpen}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {modal?.type === "add" ? "직원 추가" : "직원 정보 수정"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-name" className="text-[12px] text-[var(--color-text-muted)] font-medium">
                이름
              </Label>
              <Input
                id="staff-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="직원 이름"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-login-id" className="text-[12px] text-[var(--color-text-muted)] font-medium">
                아이디
              </Label>
              <Input
                id="staff-login-id"
                type="text"
                value={form.loginId}
                onChange={(e) => setForm((prev) => ({ ...prev, loginId: e.target.value }))}
                placeholder="example123"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[var(--color-text-muted)] font-medium">역할</Label>
              <div className="flex bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] gap-0.5 p-0.5">
                {(["직원", "매니저"] as const).map((label) => (
                  <button
                    key={label}
                    className={cn(
                      "flex-1 rounded-[var(--radius-sm)] text-[12px] font-medium h-[26px] px-2.5 transition-all",
                      form.role === label
                        ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)] font-semibold"
                        : "bg-transparent text-[var(--color-text-muted)]",
                    )}
                    onClick={() => setForm((prev) => ({ ...prev, role: label }))}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {modal?.type === "edit" ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    재발급된 PIN은 이 창에서만 표시됩니다.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => void reissuePin(modal.member)}
                    type="button"
                    className="h-7 text-[11px] px-2 shrink-0"
                  >
                    PIN 재발급
                  </Button>
                </div>
                {revealedPinByStaffId[modal.member.id] ? (
                  <div
                    className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] border border-[rgba(232,101,10,0.2)] text-[var(--color-accent)] text-[18px] font-[800] tracking-[0.12em] py-2.5 px-3 text-center"
                    role="status"
                  >
                    {revealedPinByStaffId[modal.member.id]}
                  </div>
                ) : null}
              </div>
            ) : null}
            {modal?.type === "add" ? (
              <p className="text-[12px] text-[var(--color-text-muted)]">
                추가 후 4자리 PIN이 자동 발급됩니다.
              </p>
            ) : null}
            {formError ? (
              <p className="text-[12px] text-[var(--color-error-text)]">{formError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)} type="button">
              취소
            </Button>
            <Button disabled={saving} onClick={() => void saveStaff()} type="button">
              {saving ? "저장중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created (PIN reveal) dialog */}
      <Dialog
        open={isCreatedModalOpen}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>직원 추가 완료</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {modal?.type === "created" ? (
              <>
                <p className="text-[13px] text-[var(--color-text)]">
                  <strong>{modal.member.name}</strong> 직원 계정이 생성되었습니다.
                </p>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    발급된 PIN은 이 창에서만 표시됩니다.
                  </p>
                  <div
                    className="rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] border border-[rgba(232,101,10,0.2)] text-[var(--color-accent)] text-[18px] font-[800] tracking-[0.12em] py-2.5 px-3 text-center mt-2"
                    role="status"
                  >
                    {modal.temporaryPin}
                  </div>
                </div>
                {formError ? (
                  <p className="text-[12px] text-[var(--color-error-text)]">{formError}</p>
                ) : null}
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setModal(null)} type="button">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Activate confirmation */}
      <AlertDialog
        open={isDeactivateModalOpen}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {modal?.type === "deactivate"
                ? modal.member.active
                  ? "직원 비활성화"
                  : "직원 활성화"
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {modal?.type === "deactivate" ? (
                <>
                  <strong>{modal.member.name}</strong>을(를){" "}
                  {modal.member.active ? "비활성화" : "활성화"}하시겠습니까?
                  {modal.member.active
                    ? " 비활성화된 직원은 로그인할 수 없습니다."
                    : ""}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setModal(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => {
                if (modal?.type === "deactivate") {
                  void toggleActive(modal.member);
                }
              }}
              className={cn(
                modal?.type === "deactivate" && modal.member.active
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "",
              )}
            >
              {saving
                ? "처리중…"
                : modal?.type === "deactivate"
                  ? modal.member.active
                    ? "비활성화"
                    : "활성화"
                  : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
