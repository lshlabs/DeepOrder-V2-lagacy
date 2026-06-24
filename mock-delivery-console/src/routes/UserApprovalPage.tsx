"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Check,
  Clock3,
  Loader2,
  Pencil,
  ShieldAlert,
  Trash2,
  UserRoundX,
  Users,
} from "lucide-react"

import {
  apiDeleteAdminUser,
  apiGetAdminUsers,
  apiGetStores,
  apiUpdateAdminUserStore,
  apiUpdateUserApproval,
} from "@/lib/api"
import { getFriendlyError } from "@/lib/runtime"
import type { AdminUser, ApprovalStatus, Store } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RuntimeStatus } from "@/components/runtime-status"

const filters: Array<{ label: string; value: ApprovalStatus | "ALL" }> = [
  { label: "전체", value: "ALL" },
  { label: "가입 대기", value: "PENDING_APPROVAL" },
  { label: "승인 완료", value: "APPROVED" },
  { label: "거절", value: "REJECTED" },
]

export default function UserApprovalPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [mockStores, setMockStores] = useState<Store[]>([])
  const [filter, setFilter] = useState<ApprovalStatus | "ALL">("ALL")
  const [loading, setLoading] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [selectedMockStoreId, setSelectedMockStoreId] = useState<string>("")
  const [savingStoreUserId, setSavingStoreUserId] = useState<number | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)

  useEffect(() => {
    void init()
  }, [])

  useEffect(() => {
    void loadUsers(filter)
  }, [filter])

  async function init() {
    try {
      const stores = await apiGetStores()
      setMockStores(stores)
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "메뉴 관리 매장 목록을 불러오는데 실패했습니다"))
    }
  }

  async function loadUsers(nextFilter: ApprovalStatus | "ALL") {
    setLoading(true)
    try {
      const data = await apiGetAdminUsers(nextFilter === "ALL" ? undefined : nextFilter)
      setUsers(data)
      setErrorMessage(null)
    } catch (error) {
      console.error(error)
      const message = getFriendlyError(error, "회원 목록을 불러오는데 실패했습니다")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateApproval(userId: number, approvalStatus: "APPROVED" | "REJECTED") {
    setUpdatingUserId(userId)
    try {
      const updated = await apiUpdateUserApproval(userId, approvalStatus)
      await loadUsers(filter)
      toast.success(
        approvalStatus === "APPROVED"
          ? `"${updated.name}" 계정을 승인했습니다`
          : `"${updated.name}" 계정을 거절 처리했습니다`
      )
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "승인 상태 변경에 실패했습니다"))
    } finally {
      setUpdatingUserId(null)
    }
  }

  function openEditDialog(user: AdminUser) {
    setEditingUser(user)
    const matchedStore = mockStores.find((store) => store.id === user.store.storeId)
    setSelectedMockStoreId(matchedStore?.id ?? "")
  }

  async function handleSaveStoreContext() {
    if (!editingUser) return

    const selectedStore = mockStores.find((store) => store.id === selectedMockStoreId)
    if (!selectedStore) {
      toast.error("연결할 매장을 선택하세요")
      return
    }

    setSavingStoreUserId(editingUser.id)
    try {
      const updated = await apiUpdateAdminUserStore(editingUser.id, {
        storeId: selectedStore.id,
        storeName: selectedStore.name,
      })
      await loadUsers(filter)
      setEditingUser(null)
      setSelectedMockStoreId("")
      toast.success(`"${updated.name}" 계정의 매장 연결을 변경했습니다`)
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "매장 연결 저장에 실패했습니다"))
    } finally {
      setSavingStoreUserId(null)
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser) return

    setDeletingUserId(deletingUser.id)
    try {
      const deleted = await apiDeleteAdminUser(deletingUser.id)
      await loadUsers(filter)
      setDeletingUser(null)
      toast.success(`회원을 삭제했습니다 (${deleted.deletedStoreId})`)
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "회원 삭제에 실패했습니다"))
    } finally {
      setDeletingUserId(null)
    }
  }

  const selectedMockStore = mockStores.find((store) => store.id === selectedMockStoreId) ?? null

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">회원 관리</h1>
          <p className="text-sm text-muted-foreground">
            KDS 계정 가입 신청을 확인하고 매장 승인을 처리합니다.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs">
          Admin API · X-Admin-Token
        </Badge>
      </div>

      <div className="mb-6">
        <RuntimeStatus />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">가입 신청 필터</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "default" : "outline"}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">회원 승인 목록</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {users.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              회원 목록을 불러오는 중입니다
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <p className="text-sm font-medium text-foreground">회원 목록을 불러오지 못했습니다</p>
              <p className="max-w-lg text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => void loadUsers(filter)} variant="outline">
                다시 시도
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Clock3 className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">조건에 맞는 가입 신청이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">담당자</th>
                    <th className="px-4 py-2 font-medium">매장</th>
                    <th className="px-4 py-2 font-medium">연락처 / 주소</th>
                    <th className="px-4 py-2 font-medium">가입일</th>
                    <th className="px-4 py-2 font-medium">상태</th>
                    <th className="px-4 py-2 text-right font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const updating = updatingUserId === user.id
                    return (
                      <tr key={user.id} className="border-b align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">아이디: {user.loginId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{user.store.storeName}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {user.store.storeId}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{user.store.phone || "연락처 없음"}</div>
                          <div className="max-w-md whitespace-normal break-words text-xs text-muted-foreground">
                            {formatAddress(user)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTime(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getBadgeVariant(user.approvalStatus)}>
                            {getApprovalStatusLabel(user.approvalStatus)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {user.approvalStatus === "PENDING_APPROVAL" ? (
                              <>
                                <Button
                                  disabled={updating}
                                  onClick={() => handleUpdateApproval(user.id, "APPROVED")}
                                  size="sm"
                                >
                                  {updating ? <Loader2 className="animate-spin" /> : <Check />}
                                  승인
                                </Button>
                                <Button
                                  disabled={updating}
                                  onClick={() => handleUpdateApproval(user.id, "REJECTED")}
                                  size="sm"
                                  variant="destructive"
                                >
                                  {updating ? <Loader2 className="animate-spin" /> : <UserRoundX />}
                                  거절
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(user)}
                                  aria-label={`${user.name} 수정`}
                                  title="수정"
                                >
                                  <Pencil />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => setDeletingUser(user)}
                                  aria-label={`${user.name} 삭제`}
                                  title="삭제"
                                >
                                  <Trash2 />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null)
            setSelectedMockStoreId("")
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>회원 매장 연결 수정</DialogTitle>
            <DialogDescription>
              선택한 메뉴관리 매장의 `storeId`로 회원의 backend store context를 재바인딩합니다.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">이름</p>
                  <p className="font-medium">{editingUser.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">아이디</p>
                  <p className="font-medium">{editingUser.loginId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">현재 승인 상태</p>
                  <p className="font-medium">{getApprovalStatusLabel(editingUser.approvalStatus)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">현재 user.store_id</p>
                  <p className="font-mono text-sm">{editingUser.store.storeId}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">현재 연결된 store</p>
                  <p className="font-medium">{editingUser.store.storeName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAddress(editingUser) || "주소 정보 없음"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>메뉴관리 매장 선택</Label>
                <Select
                  value={selectedMockStoreId}
                  onValueChange={(value) => setSelectedMockStoreId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="연결할 매장을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMockStore && (
                  <p className="text-xs text-muted-foreground">
                    선택 storeId: <span className="font-mono">{selectedMockStore.id}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button onClick={handleSaveStoreContext} disabled={!editingUser || savingStoreUserId !== null}>
              {savingStoreUserId !== null ? <Loader2 className="animate-spin" /> : <Pencil />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingUser(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>정말 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 관련 회원, 매장, 인증 토큰 및 연결 데이터가 삭제됩니다.
            </DialogDescription>
          </DialogHeader>

          {deletingUser && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{deletingUser.name}</p>
              <p className="text-muted-foreground">아이디: {deletingUser.loginId}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {deletingUser.store.storeId} / {deletingUser.store.storeName}
              </p>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button onClick={handleDeleteUser} variant="destructive" disabled={deletingUserId !== null}>
              {deletingUserId !== null ? <Loader2 className="animate-spin" /> : <Trash2 />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAddress(user: AdminUser) {
  return [
    user.store.zipNo,
    user.store.roadAddress,
    user.store.jibunAddress,
    user.store.addressDetail,
  ]
    .filter(Boolean)
    .join(" / ")
}

function getApprovalStatusLabel(status: ApprovalStatus) {
  if (status === "APPROVED") return "승인 완료"
  if (status === "REJECTED") return "거절"
  return "가입 대기"
}

function getBadgeVariant(status: ApprovalStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default"
  if (status === "REJECTED") return "destructive"
  return "secondary"
}
