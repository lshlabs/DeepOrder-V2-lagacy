import { useCallback, useEffect, useState } from "react";
import { Plus, MoreVertical, X } from "lucide-react";

import {
  apiCreateStaff,
  apiGetStaff,
  apiRegenerateStaffPin,
  apiUpdateStaff,
  apiUpdateStaffActive,
} from "../api/staff-api";
import { ActionMenu } from "@/components/ui";
import type { AuthSession } from "@/features/auth";
import { requestWithReauth } from "@/lib/api";

import type { Staff } from "../types";

type StaffModalMode =
  | { type: "add" }
  | { type: "edit"; member: Staff }
  | { type: "created"; member: Staff; temporaryPin: string }
  | { type: "deactivate"; member: Staff };

type StaffPanelProps = {
  session: AuthSession;
  onUnauthorized: () => Promise<string | null>;
};

export function StaffPanel({
  session,
  onUnauthorized,
}: StaffPanelProps) {
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
        const created = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
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
      const result = await requestWithReauth(session.accessToken, onUnauthorized, (accessToken) =>
        apiRegenerateStaffPin(accessToken, member.id),
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
      setFormError(error instanceof Error ? error.message : "직원 상태를 변경하지 못했습니다.");
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

  return (
    <section className="kds-panel kds-panel--staff" aria-label="직원 관리">
      <div className="kds-panel-header">
        <div>
          <h2 className="kds-panel-title">직원 관리</h2>
          <p className="kds-panel-subtitle">총 {staffList.length}명 · 활성 {activeCount}명</p>
        </div>
        <button className="kds-btn-primary kds-btn-sm" disabled={saving} onClick={openAdd} type="button">
          <Plus size={12} aria-hidden="true" />
          직원 추가
        </button>
      </div>

      {formError && !modal ? <div className="banner error" role="alert">{formError}</div> : null}

      {loading ? <div className="kds-empty">직원 목록을 불러오는 중…</div> : null}

      {!loading ? (
        <div className="kds-table-wrap">
          <table className="kds-table kds-table--staff">
            <thead className="align-middle">
              <tr>
                <th>
                  <span className="kds-staff-header-mobile">직원 정보</span>
                  <span className="kds-staff-header-desktop">이름</span>
                </th>
                <th>아이디</th>
                <th style={{ textAlign: "center" }}>역할</th>
                <th style={{ textAlign: "center" }}>상태</th>
                <th style={{ textAlign: "right" }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((member) => (
                <tr key={member.id} className={!member.active ? "row-inactive" : ""}>
                  <td>
                    <div className="kds-table-cell-name">
                      <div className="kds-staff-avatar-sm" aria-hidden="true">{member.name.slice(0, 1)}</div>
                      <div className="kds-table-cell-stack">
                        <span className="kds-table-cell-primary">{member.name}</span>
                        <span className="kds-table-cell-subtext kds-staff-subtext">
                          {member.loginId}
                          <span className="kds-staff-role-inline"> · {member.positionLabel ?? "직원"}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="kds-table-cell-muted">
                    <div className="kds-table-cell-stack">
                      <span>{member.loginId}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`kds-badge${member.positionLabel === "매니저" ? " accent" : ""}`}>
                      {member.positionLabel ?? "직원"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`kds-badge${member.active ? " green" : " dim"}`}>
                      {member.active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="kds-table-actions-cell">
                    <div className="kds-table-actions">
                      <div className="kds-table-actions-inline">
                        <button className="kds-btn-ghost kds-btn-xs" disabled={saving} onClick={() => openEdit(member)} type="button" aria-label="수정">
                          <span className="kds-table-action-label">수정</span>
                        </button>
                        <button
                          disabled={saving}
                          className={`kds-btn-ghost kds-btn-xs${member.active ? " danger" : " green"}`}
                          onClick={() => setModal({ type: "deactivate", member })}
                          type="button"
                          aria-label={member.active ? "비활성화" : "활성화"}
                        >
                          <span className="kds-table-action-label">{member.active ? "비활성화" : "활성화"}</span>
                        </button>
                      </div>
                      <div className={`kds-row-actions${actionMenuStaffId === member.id ? " open" : ""}`}>
                        <button
                          aria-expanded={actionMenuStaffId === member.id}
                          aria-haspopup="menu"
                          className={`kds-row-actions-trigger${actionMenuStaffId === member.id ? " open" : ""}`}
                          disabled={saving}
                          onClick={(event) => toggleActionMenu(member.id, event.currentTarget)}
                          type="button"
                        >
                          <span className="sr-only">직원 작업 메뉴 열기</span>
                          <MoreVertical size={16} aria-hidden="true" />
                        </button>
                        <ActionMenu
                          ariaLabel="직원 작업"
                          className="kds-row-actions-menu"
                          onClose={closeActionMenu}
                          open={actionMenuStaffId === member.id}
                          positioning={
                            actionMenuStaffId === member.id
                              ? { align: "end", anchorEl: actionMenuAnchorEl, mode: "anchor", side: "bottom" }
                              : null
                          }
                        >
                          <button className="kds-row-actions-item" onClick={() => openEdit(member)} role="menuitem" type="button">
                            수정
                          </button>
                          <button
                            className={`kds-row-actions-item${member.active ? " danger" : " green"}`}
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

      {(modal?.type === "add" || modal?.type === "edit") ? (
        <div className="kds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={modal.type === "add" ? "직원 추가" : "직원 정보 수정"}>
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">{modal.type === "add" ? "직원 추가" : "직원 정보 수정"}</h2>
              <button className="kds-modal-close" onClick={() => setModal(null)} type="button" aria-label="닫기">
                <X size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="kds-modal-body">
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="staff-name">이름</label>
                <input id="staff-name" type="text" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="직원 이름" autoFocus />
              </div>
              <div className="kds-settings-field">
                <label className="kds-settings-label" htmlFor="staff-login-id">아이디</label>
                <input id="staff-login-id" type="text" value={form.loginId} onChange={(e) => setForm((prev) => ({ ...prev, loginId: e.target.value }))} placeholder="example123" />
              </div>
              <div className="kds-settings-field">
                <label className="kds-settings-label">역할</label>
                <div className="kds-segmented">
                  {(["직원", "매니저"] as const).map((label) => (
                    <button key={label} className={`kds-segmented-btn${form.role === label ? " active" : ""}`} onClick={() => setForm((prev) => ({ ...prev, role: label }))} type="button">{label}</button>
                  ))}
                </div>
              </div>
              {modal.type === "edit" ? (
                <div className="kds-settings-field">
                  <div className="kds-pin-modal-row">
                    <div>
                      <p className="kds-settings-hint">재발급된 PIN은 이 창에서만 표시됩니다.</p>
                    </div>
                    <button
                      className="kds-btn-ghost kds-btn-xs"
                      disabled={saving}
                      onClick={() => void reissuePin(modal.member)}
                      type="button"
                    >
                      PIN 재발급
                    </button>
                  </div>
                  {revealedPinByStaffId[modal.member.id] ? (
                    <div className="kds-pin-modal-value" role="status">
                      {revealedPinByStaffId[modal.member.id]}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {modal.type === "add" ? <p className="kds-settings-hint">추가 후 4자리 PIN이 자동 발급됩니다.</p> : null}
              {formError ? <p className="kds-settings-error">{formError}</p> : null}
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setModal(null)} type="button">취소</button>
              <button className="kds-modal-btn primary" disabled={saving} onClick={() => void saveStaff()} type="button">{saving ? "저장중…" : "저장"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {modal?.type === "created" ? (
        <div className="kds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="직원 추가 완료">
            <div className="kds-modal-head">
              <h2 className="kds-modal-title">직원 추가 완료</h2>
              <button className="kds-modal-close" onClick={() => setModal(null)} type="button" aria-label="닫기">
                <X size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc">
                <strong>{modal.member.name}</strong> 직원 계정이 생성되었습니다.
              </p>
              <div className="kds-settings-field">
                <p className="kds-settings-hint">발급된 PIN은 이 창에서만 표시됩니다.</p>
                <div className="kds-pin-modal-value" role="status">
                  {modal.temporaryPin}
                </div>
              </div>
              {formError ? <p className="kds-settings-error">{formError}</p> : null}
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn primary" onClick={() => setModal(null)} type="button">확인</button>
            </div>
          </div>
        </div>
      ) : null}

      {modal?.type === "deactivate" ? (
        <div className="kds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="kds-modal kds-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kds-modal-head"><h2 className="kds-modal-title">{modal.member.active ? "직원 비활성화" : "직원 활성화"}</h2></div>
            <div className="kds-modal-body">
              <p className="kds-modal-desc">
                <strong>{modal.member.name}</strong>을(를) {modal.member.active ? "비활성화" : "활성화"}하시겠습니까?
                {modal.member.active ? " 비활성화된 직원은 로그인할 수 없습니다." : ""}
              </p>
            </div>
            <div className="kds-modal-foot">
              <button className="kds-modal-btn secondary" onClick={() => setModal(null)} type="button">취소</button>
              <button className={`kds-modal-btn${modal.member.active ? " danger" : " primary"}`} disabled={saving} onClick={() => void toggleActive(modal.member)} type="button">
                {saving ? "처리중…" : modal.member.active ? "비활성화" : "활성화"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
