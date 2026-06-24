import { Badge } from "@/components/ui/badge"
import { API_BASE_URL } from "@/lib/runtime"

interface RuntimeStatusProps {
  compact?: boolean
}

export function RuntimeStatus({ compact = false }: RuntimeStatusProps) {
  const modeLabel = "FastAPI"
  const baseUrl = API_BASE_URL || "http://127.0.0.1:8001/api/mock"

  if (compact) {
    return (
      <div className="space-y-1">
        <Badge variant="default" className="text-xs">
          {modeLabel}
        </Badge>
        <p className="break-all font-mono text-[11px] leading-snug text-muted-foreground">
          {baseUrl}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-medium">연결 상태</span>
        <Badge variant="default" className="text-xs">
          {modeLabel}
        </Badge>
      </div>
      <p className="break-all font-mono text-xs text-muted-foreground">{baseUrl}</p>
    </div>
  )
}
