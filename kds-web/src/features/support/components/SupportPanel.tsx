import { useChatbotSession } from "../hooks/useChatbotSession";
import { FaqSection } from "./FaqSection";

export function SupportPanel() {
  const { open } = useChatbotSession();

  function handleOpenChatbot(context?: string) {
    open(context);
  }

  return (
    <div className="support-panel">
      <div className="support-faq-page">
        {/* Page header */}
        <div className="support-page-header">
          <div>
            <h1 className="support-page-title">고객지원</h1>
            <p className="support-page-desc">
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
