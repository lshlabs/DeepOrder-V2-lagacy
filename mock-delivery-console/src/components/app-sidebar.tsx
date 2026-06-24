"use client"

import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutList,
  Sparkles,
  KeyRound,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  UtensilsCrossed,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RuntimeStatus } from "@/components/runtime-status"

const navItems = [
  { href: "/", label: "메뉴 관리", icon: LayoutList },
  { href: "/orders", label: "주문 생성", icon: Sparkles },
  { href: "/api-management", label: "API 관리", icon: KeyRound },
  { href: "/user-approval", label: "회원 관리", icon: Users },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border px-3",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="truncate text-sm font-semibold">배달 API 콘솔</p>
                <p className="truncate text-xs text-muted-foreground">
                  Management
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            return (
              <NavLink
                key={item.href}
                to={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="space-y-3 border-t border-sidebar-border p-3">
            <RuntimeStatus compact />
            <p className="text-xs text-muted-foreground">
              Mock Delivery Console v1
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
