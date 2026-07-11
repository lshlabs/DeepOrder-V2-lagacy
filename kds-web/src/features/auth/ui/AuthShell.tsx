import type { ReactNode } from "react";
import { ChefHat } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
}

/**
 * Full-viewport auth layout: hero panel (desktop-only) + content card.
 * Replaces .auth-shell, .auth-hero, .auth-card with Tailwind.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="grid grid-cols-1 lg:grid-cols-[1fr_480px] h-screen overflow-hidden bg-background">
      {/* Hero — desktop only */}
      <section
        className="hidden lg:flex flex-col justify-between p-10 bg-card border-r border-border"
        aria-hidden="true"
      >
        <div className="flex flex-col gap-12">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
              <ChefHat size={16} aria-hidden="true" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">DeepOrder</span>
          </div>

          {/* Headline */}
          <div className="flex flex-col gap-3.5">
            <h1 className="text-5xl font-bold tracking-[-1px] leading-[1.1] text-foreground">
              주방을<br />더 스마트하게
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
              실시간 주문 현황을 한눈에. 직원 배정부터 통계까지 하나의 화면에서 관리하세요.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">© 2025 DeepOrder. All rights reserved.</p>
      </section>

      {/* Auth card */}
      <section className="flex flex-col justify-center overflow-y-auto px-6 py-10 bg-background">
        <div className="flex flex-col gap-6 w-full max-w-[400px] mx-auto">
          {children}
        </div>
      </section>
    </main>
  );
}
