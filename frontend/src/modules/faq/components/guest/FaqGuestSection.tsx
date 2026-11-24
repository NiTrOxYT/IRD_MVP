import React, { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../../../core/ui/utils";
import { useFaqAdapter } from "../../adapter";
import type { FaqItem } from "../../types";

export function FaqGuestSection() {
  const { api } = useFaqAdapter();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getGuestFaqs()
      .then((res) => {
        if (!active) return;
        const list = res.faqs || [];
        setFaqs(list);
        if (list.length > 0) setOpenId(list[0].id);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)));
    return unique.length > 1 ? ["All", ...unique] : [];
  }, [faqs]);

  const visibleFaqs = useMemo(() => {
    if (selectedCategory === "All") return faqs;
    return faqs.filter((f) => f.category === selectedCategory);
  }, [faqs, selectedCategory]);

  if (!loaded || faqs.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="guest-faq-heading"
      className="mx-auto max-w-5xl rounded-xl border border-[rgba(20,18,16,0.09)] bg-white p-5 sm:p-7"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[rgba(20,18,16,0.08)] pb-4 sm:flex-row sm:items-end">
        <div>
          <h2
            id="guest-faq-heading"
            className="font-serif text-2xl font-semibold tracking-[-0.01em] text-[#141210]"
          >
            Guest Information & FAQ
          </h2>
          <p className="mt-1 text-xs text-[#5C554E]">
            Dining schedules, connectivity, transfers, and property policies.
          </p>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                  selectedCategory === cat
                    ? "border-[#141210] bg-[#141210] text-white"
                    : "border-[rgba(20,18,16,0.12)] bg-[#F6F4EF] text-[#5C554E] hover:border-[rgba(20,18,16,0.28)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="divide-y divide-[rgba(20,18,16,0.08)]">
        {visibleFaqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div key={faq.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors hover:text-[#966F29]"
              >
                <span className="font-serif text-[17px] font-semibold leading-snug text-[#141210]">
                  {faq.question}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[rgba(20,18,16,0.1)] text-[#5C554E]">
                  {isOpen ? (
                    <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                </span>
              </button>
              {isOpen && (
                <div className="max-w-[68ch] whitespace-pre-line pb-4 pr-8 text-[13px] leading-relaxed text-[#5C554E]">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
