import type { ReactNode } from "react";
import { Toaster } from "sonner";

interface AppProvidersProps {
  children: ReactNode;
}

/** Global provider wrapper. Add any future context providers here. */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
