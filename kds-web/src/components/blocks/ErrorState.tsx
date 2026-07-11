import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
      </div>
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
