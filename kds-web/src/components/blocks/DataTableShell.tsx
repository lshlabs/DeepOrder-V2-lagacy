import * as React from "react";
import { cn } from "@/lib/utils";

interface DataTableShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableShell({ children, className }: DataTableShellProps) {
  return (
    <div className={cn("w-full overflow-auto rounded-lg border border-border", className)}>
      <table className="w-full caption-bottom text-sm">{children}</table>
    </div>
  );
}

export function DataTableHeader({ children, className }: DataTableShellProps) {
  return (
    <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)}>{children}</thead>
  );
}

export function DataTableBody({ children, className }: DataTableShellProps) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)}>{children}</tbody>
  );
}

export function DataTableRow({ children, className }: DataTableShellProps) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableHead({ children, className }: DataTableShellProps) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function DataTableCell({ children, className }: DataTableShellProps) {
  return (
    <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>
      {children}
    </td>
  );
}
