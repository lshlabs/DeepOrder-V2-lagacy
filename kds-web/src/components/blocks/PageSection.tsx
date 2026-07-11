import * as React from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ title, children, className }: PageSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="rounded-lg border border-border bg-card p-4">{children}</div>
    </section>
  );
}
