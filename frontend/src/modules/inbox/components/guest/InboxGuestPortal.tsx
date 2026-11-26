import React, { useMemo, useRef, useState } from "react";
import { Bell, Check, CheckCheck, ChevronLeft, Mail, MailOpen, Sparkles } from "lucide-react";
import { setupScrollBatchCards, useGSAP } from "../../../../core/ui/gsap";
import { cn } from "../../../../core/ui/utils";
import type { GuestInboxMessage } from "../../types";

interface InboxGuestPortalProps {
  roomNumber?: string;
  messages: GuestInboxMessage[];
  loading: boolean;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onBackToHub?: () => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  Offer: "bg-amber-400/20 border-amber-300/35 text-amber-100",
  Event: "bg-sky-400/20 border-sky-300/35 text-sky-100",
  Alert: "bg-rose-500/22 border-rose-300/40 text-rose-100",
  Concierge: "bg-emerald-400/20 border-emerald-300/35 text-emerald-100",
  Notice: "bg-white/14 border-white/20 text-white/90",
};

function formatMessageTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InboxGuestPortal({
  roomNumber,
  messages,
  loading,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  onBackToHub,
}: InboxGuestPortalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>("All");

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.isRead).length,
    [messages]
  );

  const filterChips = useMemo(() => {
    const base = ["All"];
    if (unreadCount > 0) base.push("Unread");
    const cats = Array.from(new Set(messages.map((m) => m.category).filter(Boolean)));
    return [...base, ...cats];
  }, [messages, unreadCount]);

  const filteredMessages = useMemo(() => {
    if (filter === "All") return messages;
    if (filter === "Unread") return messages.filter((m) => !m.isRead);
    return messages.filter((m) => m.category === filter);
  }, [filter, messages]);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el || loading || filteredMessages.length === 0) return;
      setupScrollBatchCards(el, ".gsap-inbox-card", { stagger: 0.06, y: 20, start: "top 94%" });
    },
    { scope: containerRef, dependencies: [loading, filteredMessages.length, filter], revertOnUpdate: true }
  );

  return (
    <div ref={containerRef} className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-5 sm:space-y-6">
      {onBackToHub && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full frost-cta-white btn-smooth-press-sm"
          >
            <ChevronLeft size={16} /> All Services
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] font-semibold text-white/85 frost-pill-chip px-3 py-1 rounded-full btn-smooth-press-sm"
          >
            Refresh Inbox
          </button>
        </div>
      )}

      {/* Reference 2 Frosted Inbox Header Card */}
      <section className="relative overflow-hidden rounded-[32px] frost-component-card p-6 sm:p-7 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full frost-pill-chip text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-sans text-[22px] sm:text-[26px] font-bold tracking-tight text-white leading-tight">
                Suite Inbox
              </h2>
              <p className="text-xs text-white/70 mt-0.5 tabular-nums">
                Direct updates & invitations for Suite {roomNumber || "Guest"}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full frost-pill-chip px-3 py-1 text-xs font-bold text-white tabular-nums">
            {unreadCount > 0 ? `${unreadCount} Unread` : "All Read"}
          </span>
        </div>

        <p className="text-[12.5px] sm:text-[13.5px] text-white/75 leading-relaxed max-w-[54ch]">
          Messages from Reception and our hospitality team—including personal suite notices, dining specials, and resort announcements—appear here automatically.
        </p>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex w-full items-center justify-center gap-2 rounded-full frost-cta-white py-2.5 text-xs font-bold btn-smooth-press cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </button>
        )}
      </section>

      {/* Filter Chips */}
      {messages.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {filterChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setFilter(chip)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors btn-smooth-press-sm",
                filter === chip ? "frost-cta-white" : "frost-pill-chip text-white/85"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Messages Feed */}
      {loading ? (
        <div className="frost-component-card rounded-[28px] py-12 text-center text-xs text-white/75">
          <div className="w-7 h-7 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto mb-2.5" />
          Loading suite notifications...
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="gsap-inbox-card frost-component-card rounded-[30px] p-8 text-center space-y-2.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full frost-pill-chip text-white/70">
            <MailOpen className="h-5 w-5" />
          </div>
          <h3 className="font-sans text-base font-bold text-white">
            {filter === "All" ? "Your Suite Inbox is Quiet" : `No ${filter} Messages`}
          </h3>
          <p className="text-xs text-white/65 max-w-sm mx-auto leading-relaxed">
            When Reception or our concierge sends a note to Suite {roomNumber || "your room"} or a resort announcement, it will show up right here.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredMessages.map((msg) => {
            const isUnread = !msg.isRead;
            const catClass = CATEGORY_STYLES[msg.category] || CATEGORY_STYLES.Notice;

            return (
              <article
                key={msg.id}
                onClick={() => {
                  if (isUnread) onMarkRead(msg.id);
                }}
                className={cn(
                  "gsap-inbox-card frost-component-card rounded-[28px] p-5 space-y-3 transition-colors",
                  isUnread
                    ? "border-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_20px_48px_-14px_rgba(0,0,0,0.62)] cursor-pointer"
                    : "opacity-85"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isUnread && (
                      <span className="relative flex h-2.5 w-2.5 items-center justify-center mr-0.5" title="Unread">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 zomato-beacon-ring" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold",
                        catClass
                      )}
                    >
                      {msg.category === "Offer" ? (
                        <Sparkles className="h-2.5 w-2.5" />
                      ) : (
                        <Bell className="h-2.5 w-2.5" />
                      )}
                      {msg.category}
                    </span>
                    <span className="rounded-full frost-pill-chip px-2.5 py-0.5 text-[10px] font-semibold">
                      {msg.targetType === "all"
                        ? "Resort-Wide Notice"
                        : `Personal · Suite ${roomNumber || ""}`}
                    </span>
                  </div>

                  <time className="text-[10.5px] font-medium text-white/60 tabular-nums">
                    {formatMessageTime(msg.createdAt)}
                  </time>
                </div>

                <h3 className="font-sans text-[17px] sm:text-[18px] font-bold text-white leading-snug">
                  {msg.title}
                </h3>

                <p className="whitespace-pre-line text-[12.5px] sm:text-[13px] leading-relaxed text-white/80">
                  {msg.body}
                </p>

                <div className="flex items-center justify-between border-t border-white/14 pt-3 text-[11px]">
                  <span className="text-white/60">
                    From <strong className="text-white/85">{msg.createdByName || "Concierge"}</strong>
                  </span>

                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(msg.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full frost-cta-white px-3 py-1 text-[11px] font-bold btn-smooth-press-sm cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      Mark Read
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-white/55 font-medium">
                      <CheckCheck className="h-3.5 w-3.5" /> Read
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
