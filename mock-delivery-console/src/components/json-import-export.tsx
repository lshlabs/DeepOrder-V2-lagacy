"use client"

import { useState, useRef } from "react"
import { Download, Upload, FileJson, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CatalogData } from "@/lib/types"
import { getFriendlyError } from "@/lib/runtime"

interface JsonImportExportProps {
  onExport: () => Promise<CatalogData>
  onImport: (
    data: CatalogData,
    mode: "merge" | "replace"
  ) => Promise<{ imported: number; errors: string[] }>
  isLoading: boolean
  /** When true, render only the action buttons (no Card wrapper) for use in toolbars. */
  compact?: boolean
}

export function JsonImportExport({
  onExport,
  onImport,
  isLoading,
  compact = false,
}: JsonImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")
  const [importData, setImportData] = useState<CatalogData | null>(null)
  const [importResult, setImportResult] = useState<{
    imported: number
    errors: string[]
  } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      const data = await onExport()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `catalog-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
      setImportResult({
        imported: 0,
        errors: [getFriendlyError(error, "내보내기에 실패했습니다")],
      })
      setImportDialogOpen(true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        setImportData(data)
        setParseError(null)
        setImportResult(null)
        setImportDialogOpen(true)
      } catch (error) {
        setParseError(
          error instanceof Error ? error.message : "올바르지 않은 JSON 형식입니다"
        )
        setImportData(null)
        setImportDialogOpen(true)
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImport = async () => {
    if (!importData) return
    try {
      const result = await onImport(importData, importMode)
      setImportResult(result)
    } catch (error) {
      setImportResult({
        imported: 0,
        errors: [getFriendlyError(error, "가져오기에 실패했습니다")],
      })
    }
  }

  const closeImportDialog = () => {
    setImportDialogOpen(false)
    setImportData(null)
    setImportResult(null)
    setParseError(null)
  }

  const getDataSummary = (data: CatalogData) => {
    return {
      stores: data.stores?.length || 0,
      menus: data.menus?.length || 0,
      optionGroups: data.optionGroups?.length || 0,
      options: data.options?.length || 0,
    }
  }

  const actionButtons = (
    <>
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={handleExport}
        disabled={isLoading}
        className={compact ? undefined : "flex-1"}
      >
        <Download className="h-4 w-4 mr-2" />
        내보내기
      </Button>
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={compact ? undefined : "flex-1"}
      >
        <Upload className="h-4 w-4 mr-2" />
        가져오기
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  )

  return (
    <>
      {compact ? (
        <div className="flex items-center gap-2">{actionButtons}</div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              JSON 가져오기 / 내보내기
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">{actionButtons}</CardContent>
        </Card>
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>카탈로그 데이터 가져오기</DialogTitle>
            <DialogDescription>
              JSON 파일에서 카탈로그 데이터를 검토하고 가져옵니다.
            </DialogDescription>
          </DialogHeader>

          {parseError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">JSON 파싱 오류</p>
                <p className="text-sm">{parseError}</p>
              </div>
            </div>
          )}

          {importData && !importResult && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-2">데이터 요약</p>
                {(() => {
                  const summary = getDataSummary(importData)
                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>매장: {summary.stores}개</div>
                      <div>메뉴: {summary.menus}개</div>
                      <div>옵션 그룹: {summary.optionGroups}개</div>
                      <div>옵션: {summary.options}개</div>
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-2">
                <Label>가져오기 방식</Label>
                <Select
                  value={importMode}
                  onValueChange={(v) => setImportMode(v as "merge" | "replace")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">
                      병합 (기존 유지, 새 항목 추가)
                    </SelectItem>
                    <SelectItem value="replace">
                      교체 (기존 데이터 삭제)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {importMode === "merge"
                    ? "기존 데이터를 유지합니다. 중복 ID는 건너뜁니다."
                    : "주의: 기존 매장/메뉴/옵션 데이터가 교체됩니다. 필요하면 먼저 내보내기로 백업하세요."}
                </p>
              </div>
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  importResult.errors.length > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {importResult.errors.length > 0 ? (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {importResult.errors.length > 0
                      ? "오류와 함께 가져오기 완료"
                      : "가져오기 성공"}
                  </p>
                  <p className="text-sm">{importResult.imported}개 항목을 가져왔습니다</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    오류 ({importResult.errors.length}개)
                  </p>
                  <ScrollArea className="h-32 border rounded-lg p-2">
                    {importResult.errors.map((error, i) => (
                      <p key={i} className="text-xs text-destructive mb-1">
                        {error}
                      </p>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog}>
              {importResult ? "닫기" : "취소"}
            </Button>
            {importData && !importResult && (
              <Button onClick={handleImport} disabled={isLoading}>
                가져오기
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
