"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Sparkles,
  Send,
  Loader2,
  Store as StoreIcon,
  Trash2,
  ClipboardCopy,
  Inbox,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RuntimeStatus } from "@/components/runtime-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type {
  Store,
  GeneratedOrder,
  OrderRecord,
  ApiConfig,
} from "@/lib/types"
import {
  apiGetStores,
  apiGenerateOrder,
  apiSendOrder,
  apiGetOrderRecords,
  apiClearOrderRecords,
  apiGetActiveApiConfig,
} from "@/lib/api"
import { getFriendlyError } from "@/lib/runtime"

const SELECTED_STORE_STORAGE_KEY = "console:selectedStoreId"
const DEEPORDER_WEBHOOK_URL =
  import.meta.env.VITE_DEEPORDER_WEBHOOK_URL ??
  "http://127.0.0.1:8000/api/external/orders/webhook"

export default function OrdersPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [activeConfig, setActiveConfig] = useState<ApiConfig | null>(null)

  const [order, setOrder] = useState<GeneratedOrder | null>(null)
  const [records, setRecords] = useState<OrderRecord[]>([])

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    void init()
  }, [])

  const init = async () => {
    try {
      const [storeData, recordData, config] = await Promise.all([
        apiGetStores(),
        apiGetOrderRecords(),
        apiGetActiveApiConfig(),
      ])
      setStores(storeData)
      setRecords(recordData)
      setActiveConfig(config)

      const storedStoreId = window.localStorage.getItem(SELECTED_STORE_STORAGE_KEY)
      const nextStoreId =
        storeData.find((store) => store.id === storedStoreId)?.id ??
        storeData[0]?.id ??
        ""

      setSelectedStoreId(nextStoreId)
      if (nextStoreId) {
        window.localStorage.setItem(SELECTED_STORE_STORAGE_KEY, nextStoreId)
      } else {
        window.localStorage.removeItem(SELECTED_STORE_STORAGE_KEY)
      }
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "데이터를 불러오는데 실패했습니다"))
    }
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null

  const handleGenerate = async () => {
    if (!selectedStoreId) {
      toast.error("매장을 먼저 선택하세요")
      return
    }
    setIsGenerating(true)
    try {
      const generated = await apiGenerateOrder(selectedStoreId)
      setOrder(generated)
      toast.success("AI가 주문 조합을 생성했습니다")
    } catch (error) {
      toast.error(getFriendlyError(error, "주문 생성에 실패했습니다"))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = async () => {
    if (!order) {
      toast.error("먼저 주문을 생성하세요")
      return
    }
    setIsSending(true)
    try {
      const record = await apiSendOrder(order)
      setRecords((prev) => [record, ...prev])
      if (record.status === "success") {
        toast.success(`주문 전송 성공 (HTTP ${record.httpStatus})`)
      } else {
        toast.error(`주문 전송 실패 (HTTP ${record.httpStatus})`)
      }
    } catch (error) {
      console.error(error)
      toast.error(getFriendlyError(error, "주문 전송에 실패했습니다"))
    } finally {
      setIsSending(false)
    }
  }

  const handleClearRecords = async () => {
    await apiClearOrderRecords()
    setRecords([])
    toast.success("전송 목록을 비웠습니다")
  }

  const handleCopyJson = async () => {
    if (!order) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(order, null, 2))
      toast.success("JSON을 복사했습니다")
    } catch {
      toast.error("복사에 실패했습니다")
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

  return (
    <div className="px-4 py-6 lg:px-8">
      {/* Page heading */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            주문 생성
          </h1>
          <p className="text-sm text-muted-foreground">
            메뉴 관리 데이터를 기반으로 AI 주문 조합을 생성하고 전송합니다
          </p>
        </div>
        {activeConfig ? (
          <Badge variant="outline" className="w-fit text-xs">
            AI 생성: {activeConfig.name} ({activeConfig.model})
          </Badge>
        ) : (
          <Badge variant="secondary" className="w-fit text-xs">
            AI 설정 없음
          </Badge>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RuntimeStatus />
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium">주문 전송 대상</span>
            <Badge variant="outline" className="text-xs">
              DeepOrder
            </Badge>
          </div>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {DEEPORDER_WEBHOOK_URL}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: controls + JSON viewer */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">매장 정보 및 생성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>매장 선택</Label>
                <Select
                  value={selectedStoreId}
                  onValueChange={(v) => {
                    if (v) {
                      setSelectedStoreId(v)
                      window.localStorage.setItem(SELECTED_STORE_STORAGE_KEY, v)
                      setOrder(null)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="매장을 선택하세요">
                      {selectedStore?.name ?? "매장을 선택하세요"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stores.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    먼저 &apos;메뉴 관리&apos;에서 매장과 메뉴를 등록하세요.
                  </p>
                )}
              </div>

              {selectedStore && (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    <StoreIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedStore.name}</span>
                    <Badge
                      variant={selectedStore.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {selectedStore.isActive ? "영업중" : "휴업"}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedStoreId}
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  주문 생성
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSend}
                  disabled={isSending || !order}
                >
                  {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                  주문 보내기
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">JSON 뷰어</CardTitle>
                {order && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyJson}
                    className="shrink-0"
                  >
                    <ClipboardCopy />
                    복사
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {order ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">항목 {order.items.length}개</Badge>
                    <Badge variant="outline">
                      합계 {order.totalPrice.toLocaleString()}원
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      by {order.generatedBy}
                    </span>
                  </div>
                  <ScrollArea className="h-[360px] rounded-lg border bg-muted/40">
                    <pre className="p-3 font-mono text-xs leading-relaxed text-foreground">
                      {JSON.stringify(order, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex h-[360px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    &apos;주문 생성&apos;을 눌러 주문 조합을 생성하세요
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: transmission list */}
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">전송 목록</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {records.length}
                </Badge>
              </div>
              {records.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRecords}
                  className="shrink-0 text-destructive"
                >
                  <Trash2 />
                  비우기
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
                <Inbox className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  전송된 주문이 없습니다
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[560px]">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="w-[170px] px-3 py-2 font-medium">시간</th>
                      <th className="w-[80px] px-3 py-2 font-medium">상태</th>
                      <th className="w-[70px] px-3 py-2 font-medium">HTTP</th>
                      <th className="w-[88px] px-3 py-2 font-medium">페이로드</th>
                      <th className="px-3 py-2 font-medium">응답 / 오류</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b align-middle">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          {formatTime(record.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              record.status === "success" ? "default" : "destructive"
                            }
                            className="text-xs"
                          >
                            {record.status === "success" ? "성공" : "실패"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {record.httpStatus}
                        </td>
                        <td className="px-3 py-2">
                          <Dialog>
                            <DialogTrigger
                              render={<Button variant="outline" size="xs" />}
                            >
                              보기
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl overflow-hidden">
                              <DialogHeader>
                                <DialogTitle>
                                  주문 페이로드 - {record.storeName}
                                </DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh] rounded-lg border bg-muted/40">
                                <pre className="whitespace-pre-wrap break-all p-3 font-mono text-xs leading-relaxed">
                                  {record.payload}
                                </pre>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          <p className="whitespace-pre-wrap break-all leading-relaxed">
                          {record.message}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
