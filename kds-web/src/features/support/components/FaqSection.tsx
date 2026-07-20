import { useMemo, useState } from "react";
import { ChevronDown, MessageCircle, Search, Star, X } from "lucide-react";

import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  type FaqCategory,
  type FaqItem,
} from "../data/supportData";

type FaqSectionProps = {
  onOpenChatbot: (context?: string) => void;
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="support-faq-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function renderAnswer(answer: string, query: string, isSearching: boolean) {
  return answer.split("\n").map((line, i) => (
    <p key={i}>
      {isSearching ? highlight(line, query) : line}
    </p>
  ));
}

export function FaqSection({ onOpenChatbot }: FaqSectionProps) {
  const [activeCategory, setActiveCategory] = useState<FaqCategory | "인기">("인기");
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isSearching = searchQuery.trim().length > 0;

  const displayedItems: FaqItem[] = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.trim().toLowerCase();
      return FAQ_ITEMS.filter(
        (f) =>
          f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    }
    return activeCategory === "인기"
      ? FAQ_ITEMS.filter((f) => f.popular)
      : FAQ_ITEMS.filter((f) => f.category === activeCategory);
  }, [searchQuery, activeCategory, isSearching]);

  function toggleItem(id: string) {
    setOpenItemId((prev) => (prev === id ? null : id));
  }

  function clearSearch() {
    setSearchQuery("");
    setOpenItemId(null);
  }

  return (
    <div className="support-faq">
      {/* Search bar */}
      <div className="support-faq-search-wrap">
        <div className="support-faq-search-field">
          <Search size={15} className="support-faq-search-icon" aria-hidden="true" />
          <input
            aria-label="FAQ 검색"
            className="support-faq-search-input"
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpenItemId(null);
            }}
            placeholder="질문이나 키워드를 검색하세요..."
            type="search"
            value={searchQuery}
          />
          {isSearching ? (
            <button
              aria-label="검색 지우기"
              className="support-faq-search-clear"
              onClick={clearSearch}
              type="button"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Category tabs — hidden while searching */}
      {!isSearching ? (
        <div className="support-faq-tabs" role="tablist" aria-label="FAQ 카테고리">
          <button
            role="tab"
            aria-selected={activeCategory === "인기"}
            className={`support-faq-tab${activeCategory === "인기" ? " active" : ""}`}
            onClick={() => {
              setActiveCategory("인기");
              setOpenItemId(null);
            }}
            type="button"
          >
            <Star size={11} aria-hidden="true" />
            인기
          </button>
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`support-faq-tab${activeCategory === cat ? " active" : ""}`}
              onClick={() => {
                setActiveCategory(cat);
                setOpenItemId(null);
              }}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>
      ) : null}

      {/* FAQ list / search results */}
      <div className="support-faq-list" role={isSearching ? undefined : "tabpanel"}>
        {isSearching ? (
          <p className="support-faq-results-label">
            {displayedItems.length > 0
              ? `"${searchQuery}" 검색 결과 ${displayedItems.length}건`
              : null}
          </p>
        ) : null}

        {displayedItems.length === 0 ? (
          <div className="support-faq-empty">
            <Search size={28} aria-hidden="true" className="support-faq-empty-icon" />
            <p className="support-faq-empty-title">검색 결과가 없습니다</p>
            <p className="support-faq-empty-desc">
              다른 키워드로 검색해 보거나 챗봇 상담을 이용해 주세요.
            </p>
            <button
              className="support-faq-chatbot-btn"
              onClick={() => onOpenChatbot(searchQuery ? `검색어: ${searchQuery}` : undefined)}
              type="button"
            >
              <MessageCircle size={14} aria-hidden="true" />
              챗봇으로 문의하기
            </button>
          </div>
        ) : (
          displayedItems.map((item) => (
            <div
              key={item.id}
              className={`support-faq-item${openItemId === item.id ? " open" : ""}`}
            >
              <button
                aria-expanded={openItemId === item.id}
                className="support-faq-question"
                onClick={() => toggleItem(item.id)}
                type="button"
              >
                <span>
                  {isSearching
                    ? highlight(item.question, searchQuery)
                    : item.question}
                </span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`support-faq-chevron${openItemId === item.id ? " rotated" : ""}`}
                />
              </button>
              {openItemId === item.id ? (
                <div className="support-faq-answer" role="region">
                  {renderAnswer(item.answer, searchQuery, isSearching)}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
