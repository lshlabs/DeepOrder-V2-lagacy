"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RuntimeStatus } from "@/components/runtime-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ApiConfig } from "@/lib/types"
import {
  apiGetApiConfigs,
  apiCreateApiConfig,
  apiUpdateApiConfig,
  apiDeleteApiConfig,
} from "@/lib/api"
import { getFriendlyError } from "@/lib/runtime"

const PROVIDERS = ["OpenAI", "Anthropic", "Google", "xAI", "Custom"]

interface FormState {
  name: string
  provider: string
  endpoint: string
  model: string
  apiKey: string
  temperature: number
  isActive: boolean
}

const emptyForm: FormState = {
  name: "",
  provider: "OpenAI",
  endpoint: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4o-mini",
  apiKey: "",
  temperature: 0.7,
  isActive: true,
}

function maskKey(key: string) {
  if (!key) return "—"
  if (key.length <= 8) return "••••"
  return `${key.slice(0, 4)}••••••${key.slice(-4)}`
}

export default function ApiManagementPage() {
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  // Form / dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ApiConfig | null>(null)

  useEffect(() => {
    void loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const data = await apiGetApiConfigs()
      setConfigs(data)
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "API 설정을 불러오는데 실패했습니다"))
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, isActive: configs.length === 0 })
    setDialogOpen(true)
  }

  const openEdit = (config: ApiConfig) => {
    setEditingId(config.id)
    setForm({
      name: config.name,
      provider: config.provider,
      endpoint: config.endpoint,
      model: config.model,
      apiKey: config.apiKey,
      temperature: config.temperature,
      isActive: config.isActive,
    })
    setDialogOpen(true)
  }

  const validate = () => {
    if (!form.name.trim()) return "설정 이름을 입력하세요"
    if (!form.endpoint.trim()) return "Endpoint를 입력하세요"
    if (!form.model.trim()) return "Model을 입력하세요"
    return null
  }

  const handleSubmit = async () => {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }
    setIsLoading(true)
    try {
      if (editingId) {
        const updated = await apiUpdateApiConfig(editingId, form)
        toast.success(`"${updated.name}" 설정이 수정되었습니다`)
      } else {
        const created = await apiCreateApiConfig(form)
        toast.success(`"${created.name}" 설정이 추가되었습니다`)
      }
      await loadConfigs()
      setDialogOpen(false)
    } catch (err) {
      console.error(err)
      toast.error(getFriendlyError(err, "저장에 실패했습니다"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (config: ApiConfig) => {
    setIsLoading(true)
    try {
      await apiUpdateApiConfig(config.id, { isActive: !config.isActive })
      await loadConfigs()
      toast.success(
        !config.isActive
          ? `"${config.name}"을(를) 활성화했습니다`
          : `"${config.name}"을(를) 비활성화했습니다`
      )
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "상태 변경에 실패했습니다"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsLoading(true)
    try {
      await apiDeleteApiConfig(deleteTarget.id)
      await loadConfigs()
      toast.success("설정이 삭제되었습니다")
      setDeleteTarget(null)
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "삭제에 실패했습니다"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8">
      {/* Page heading */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            API 관리
          </h1>
          <p className="text-sm text-muted-foreground">
            주문 생성에 사용할 AI 모델의 API 환경을 설정합니다
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          API 설정 추가
        </Button>
      </div>

      <div className="mb-6">
        <RuntimeStatus />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">등록된 API 설정</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {configs.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <KeyRound className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                등록된 API 설정이 없습니다
              </p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus />첫 설정 추가하기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">이름</th>
                    <th className="px-4 py-2 font-medium">Provider</th>
                    <th className="px-4 py-2 font-medium">Model</th>
                    <th className="px-4 py-2 font-medium">API Key</th>
                    <th className="px-4 py-2 font-medium">상태</th>
                    <th className="px-4 py-2 text-right font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config.id} className="border-b align-middle">
                      <td className="px-4 py-3">
                        <div className="font-medium">{config.name}</div>
                        <div className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                          {config.endpoint}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {config.provider}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{config.model}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">
                            {revealed[config.id]
                              ? config.apiKey || "—"
                              : maskKey(config.apiKey)}
                          </span>
                          {config.apiKey && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                setRevealed((prev) => ({
                                  ...prev,
                                  [config.id]: !prev[config.id],
                                }))
                              }
                              aria-label="API 키 표시 전환"
                            >
                              {revealed[config.id] ? <EyeOff /> : <Eye />}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(config)}
                          className="flex items-center gap-1.5"
                        >
                          {config.isActive ? (
                            <Badge className="gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              활성
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              비활성
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(config)}
                            aria-label="수정"
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(config)}
                            aria-label="삭제"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "API 설정 수정" : "API 설정 추가"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-name">설정 이름</Label>
              <Input
                id="cfg-name"
                value={form.name}
                placeholder="예: 운영 OpenAI"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={form.provider}
                onValueChange={(v) => {
                  if (v) {
                    setForm((f) => ({ ...f, provider: v }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cfg-endpoint">Endpoint</Label>
              <Input
                id="cfg-endpoint"
                value={form.endpoint}
                placeholder="https://api.example.com/v1/..."
                onChange={(e) =>
                  setForm((f) => ({ ...f, endpoint: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cfg-model">Model</Label>
                <Input
                  id="cfg-model"
                  value={form.model}
                  placeholder="gpt-4o-mini"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, model: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cfg-temp">Temperature</Label>
                <Input
                  id="cfg-temp"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      temperature: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cfg-key">API Key</Label>
              <Input
                id="cfg-key"
                type="password"
                value={form.apiKey}
                placeholder="sk-..."
                onChange={(e) =>
                  setForm((f) => ({ ...f, apiKey: e.target.value }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>활성 설정으로 지정</Label>
                <p className="text-xs text-muted-foreground">
                  주문 생성 시 이 설정을 사용합니다 (하나만 활성화 가능)
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              {editingId ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>API 설정 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &quot;{deleteTarget?.name}&quot; 설정을 삭제하시겠습니까? 이 작업은
            되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
