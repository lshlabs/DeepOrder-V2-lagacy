import { Outlet } from "react-router-dom"
import { Toaster } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"

export function ConsoleLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Toaster position="bottom-right" richColors />
      <AppSidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
