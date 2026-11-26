import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { gsap, setupScrollBatchCards, useGSAP } from "../../../../core/ui/gsap";
import { cn } from "../../../../core/ui/utils";
import { useFaqAdapter } from "../../adapter";
import type { FaqItem } from "../../types";

export function FaqGuestSection() {
  const { api } = useFaqAdapter();
  const sectionRef = useRef<HTMLElement>(null);
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

  useGSAP(
    () => {
      const el = sectionRef.current;
      if (!el || visibleFaqs.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            force3D: true,
            clearProps: "transform",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          }
        );
      });

      setupScrollBatchCards(el, ".gsap-faq-row", { stagger: 0.03, y: 10, start: "top 95%" });
    },
    { scope: sectionRef, dependencies: [loaded, visibleFaqs.length], revertOnUpdate: true }
  );

  if (!loaded || faqs.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="guest-faq-section"
      aria-labelledby="guest-faq-heading"
      className="rounded-[32px] frost-component-card p-5 sm:p-7 space-y-4 text-white"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3.5 border-b border-white/15">
        <div>
          <h3
            id="guest-faq-heading"
            className="font-sans text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full frost-pill-chip">
              <HelpCircle className="w-4 h-4 text-white shrink-0" />
            </span>
            <span>Frequently Asked Questions</span>
          </h3>
          <p className="text-xs text-white/70 mt-1.5">
            Quick answers for your stay, dining hours, Wi-Fi, and resort facilities.
          </p>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors btn-smooth-press-sm",
                  selectedCategory === cat ? "frost-cta-white" : "frost-pill-chip text-white/85"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {visibleFaqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={cn(
                "gsap-faq-row rounded-2xl transition-colors",
                isOpen ? "bg-white/16 border border-white/22 px-3.5 py-1" : "px-2 py-0.5 hover:bg-white/[0.06]"
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-center justify-between gap-4 py-2.5 text-left"
              >
                <span className="font-sans text-sm sm:text-[15px] font-semibold text-white leading-snug block min-w-0">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 shrink-0 text-white/75 transition-transform duration-200",
                    isOpen && "rotate-180 text-white"
                  )}
                />
              </button>
              {isOpen && (
                <div className="pb-3 pr-4 max-w-[65ch] text-xs sm:text-[13px] leading-relaxed text-white/78 whitespace-pre-line">
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
