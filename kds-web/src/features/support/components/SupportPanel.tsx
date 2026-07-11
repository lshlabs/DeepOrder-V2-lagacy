import { useChatbotSession } from "../hooks/useChatbotSession";
import { FaqSection } from "./FaqSection";

export function SupportPanel() {
  const { open } = useChatbotSession();

  function handleOpenChatbot(context?: string) {
    open(context);
  }

  return (
    <div className="flex flex-1 h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        {/* Page header */}
        <div className="flex items-center justify-between border-b border-border pb-[14px]">
          <div>
            <h1 className="text-[17px] font-bold tracking-[-0.3px] text-foreground m-0">
              고객지원
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground mt-0.5 mb-0">
              자주 묻는 질문을 검색하거나 카테고리별로 찾아보세요. 해결되지 않으면 챗봇 상담을 이용해 주세요.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <FaqSection onOpenChatbot={handleOpenChatbot} />
      </div>
    </div>
  );
}
