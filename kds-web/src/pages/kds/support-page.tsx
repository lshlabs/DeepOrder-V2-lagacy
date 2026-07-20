import { ChatbotFab, SupportPanel } from "@/features/support";

export function SupportPage() {
  return (
    <div className="kds-panel-shell">
      <SupportPanel />
      <ChatbotFab />
    </div>
  );
}
