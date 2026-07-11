import { useMemo, useState } from "react";
import { ChevronDown, MessageCircle, Search, Star, X } from "lucide-react";

import { cn } from "@/lib/utils";
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
      <mark
        key={i}
        className="bg-amber-100 dark:bg-amber-900/30 text-foreground not-italic rounded-[2px] px-px"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function renderAnswer(answer: string, query: string, isSearching: boolean) {
  return answer.split("\n").map((line, i) => (
    <p key={i} className="text-[13.5px] leading-7 text-muted-foreground m-0 max-w-[72ch]">
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
    <div className="flex flex-1 flex-col">
      {/* Search bar */}
      <div className="border-b border-border py-[14px]">
        <div
          className={cn(
            "flex items-center gap-2 bg-muted/50 border border-border rounded-md px-[10px]",
            "transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          )}
        >
          <Search size={15} className="text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            aria-label="FAQ 검색"
            className={cn(
              "flex-1 bg-transparent border-none shadow-none text-foreground",
              "text-[13px] h-9 outline-none p-0 placeholder:text-muted-foreground",
              "[&::-webkit-search-cancel-button]:hidden"
            )}
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
              className="flex items-center justify-center w-[22px] h-[22px] rounded-full shrink-0 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer"
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
        <div
          className="flex items-center gap-0.5 border-b border-border overflow-x-auto py-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="FAQ 카테고리"
        >
          <button
            role="tab"
            aria-selected={activeCategory === "인기"}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-[10px] rounded-sm text-xs font-medium whitespace-nowrap border transition-colors",
              activeCategory === "인기"
                ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                : "bg-transparent border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
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
              className={cn(
                "inline-flex items-center gap-1 h-7 px-[10px] rounded-sm text-xs font-medium whitespace-nowrap border transition-colors",
                activeCategory === cat
                  ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                  : "bg-transparent border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
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
      <div
        className="flex flex-1 flex-col gap-1.5 py-3"
        role={isSearching ? undefined : "tabpanel"}
      >
        {isSearching ? (
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            {displayedItems.length > 0
              ? `"${searchQuery}" 검색 결과 ${displayedItems.length}건`
              : null}
          </p>
        ) : null}

        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
            <Search size={28} aria-hidden="true" className="text-muted-foreground opacity-40" />
            <p className="text-sm font-semibold text-foreground mt-1">검색 결과가 없습니다</p>
            <p className="text-[13px] text-muted-foreground m-0">
              다른 키워드로 검색해 보거나 챗봇 상담을 이용해 주세요.
            </p>
            <button
              className={cn(
                "inline-flex items-center gap-[7px] h-9 px-4 rounded-md mt-2",
                "bg-primary text-primary-foreground text-[13px] font-semibold border-none cursor-pointer",
                "hover:bg-primary/90 transition-colors"
              )}
              onClick={() => onOpenChatbot(searchQuery ? `검색어: ${searchQuery}` : undefined)}
              type="button"
            >
              <MessageCircle size={14} aria-hidden="true" />
              챗봇으로 문의하기
            </button>
          </div>
        ) : (
          displayedItems.map((item) => (
            <FaqItem
              key={item.id}
              item={item}
              isOpen={openItemId === item.id}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onToggle={() => toggleItem(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

type FaqItemProps = {
  item: FaqItem;
  isOpen: boolean;
  isSearching: boolean;
  searchQuery: string;
  onToggle: () => void;
};

function FaqItem({ item, isOpen, isSearching, searchQuery, onToggle }: FaqItemProps) {
  return (
    <div
      className={cn(
        "border rounded-md overflow-hidden transition-colors",
        isOpen ? "border-primary/40" : "border-border"
      )}
    >
      <button
        aria-expanded={isOpen}
        className={cn(
          "flex items-center justify-between gap-[10px] w-full min-h-12 px-[14px] py-[13px]",
          "bg-transparent border-none text-foreground text-sm font-semibold",
          "text-left leading-[1.45] cursor-pointer",
          "hover:bg-muted/50 transition-colors"
        )}
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 whitespace-normal">
          {isSearching ? highlight(item.question, searchQuery) : item.question}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn(
            "text-muted-foreground shrink-0 transition-transform duration-[180ms] ease-out",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen ? (
        <div
          className="flex flex-col gap-2 bg-muted/40 border-t border-border px-[14px] py-[14px]"
          role="region"
        >
          {renderAnswer(item.answer, searchQuery, isSearching)}
        </div>
      ) : null}
    </div>
  );
}
