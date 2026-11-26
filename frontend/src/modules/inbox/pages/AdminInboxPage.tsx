import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  DoorOpen,
  Eye,
  EyeOff,
  Mail,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { httpClient } from "../../../core/transport/httpClient";
import { cn } from "../../../core/ui/utils";
import { inboxApi } from "../api";
import type { CreateInboxMessagePayload, GuestInboxMessage, InboxCategory } from "../types";

interface AdminRoomRow {
  id: number;
  room_number: string;
  floor: string | null;
  wing: string | null;
  is_active: boolean;
  active_stay_id: number | null;
  guest_name: string | null;
}

const CATEGORIES: InboxCategory[] = ["Notice", "Offer", "Event", "Alert", "Concierge"];

export function AdminInbox() {
  const [messages, setMessages] = useState<GuestInboxMessage[]>([]);
  const [rooms, setRooms] = useState<AdminRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "broadcast" | "rooms">("all");

  // Compose state
  const [targetType, setTargetType] = useState<"all" | "rooms">("all");
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [category, setCategory] = useState<InboxCategory>("Notice");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxRes, roomsRes] = await Promise.all([
        inboxApi.listAdminMessages(),
        httpClient.request<{ rooms: AdminRoomRow[] }>("/rooms"),
      ]);
      setMessages(inboxRes.messages || []);
      setRooms((roomsRes.rooms || []).filter((r) => r.is_active !== false));
    } catch (err: any) {
      showToast("error", err.message || "Failed to load inbox messages or rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const occupiedRooms = useMemo(
    () => rooms.filter((r) => Boolean(r.active_stay_id)),
    [rooms]
  );

  const toggleRoomSelection = (roomId: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast("error", "Please enter both a notification title and message body.");
      return;
    }
    if (targetType === "rooms" && selectedRoomIds.length === 0) {
      showToast("error", "Select at least one room to send a room-specific notification.");
      return;
    }

    setSending(true);
    try {
      const payload: CreateInboxMessagePayload = {
        title: title.trim(),
        body: body.trim(),
        category,
        targetType,
        targetRoomIds: targetType === "all" ? [] : selectedRoomIds,
        isActive: true,
      };
      const res = await inboxApi.sendMessage(payload);
      setMessages((prev) => [res.message, ...prev]);
      setTitle("");
      setBody("");
      if (targetType === "rooms") setSelectedRoomIds([]);
      showToast(
        "success",
        targetType === "all"
          ? "Broadcast pushed to all active suites!"
          : `Notification pushed to ${res.message.targetRoomNumbers.map((n) => `Suite ${n}`).join(", ")}!`
      );
    } catch (err: any) {
      showToast("error", err.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  const handleToggleActive = async (msg: GuestInboxMessage) => {
    try {
      const res = await inboxApi.toggleMessageStatus(msg.id, !msg.isActive);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...res.message, readCount: m.readCount } : m))
      );
    } catch (err: any) {
      showToast("error", err.message || "Failed to update message status.");
    }
  };

  const handleDelete = async (msg: GuestInboxMessage) => {
    if (!window.confirm(`Delete notification "${msg.title}" from guest inboxes?`)) return;
    try {
      await inboxApi.deleteMessage(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      showToast("success", "Notification removed.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete notification.");
    }
  };

  const filteredHistory = useMemo(() => {
    if (historyFilter === "broadcast") return messages.filter((m) => m.targetType === "all");
    if (historyFilter === "rooms") return messages.filter((m) => m.targetType === "rooms");
    return messages;
  }, [historyFilter, messages]);

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-6 border-b border-[#E5DDD1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Direct Guest Messaging · Push Alerts
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            Guest Inbox & Broadcasts
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Push instant notifications, offers, or arrival notes to specific suites or broadcast to all rooms at once.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] px-3.5 py-2 text-xs font-semibold text-[#1E150F] hover:border-[#B88223] btn-smooth-press"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#8E6314]" />
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2.5",
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          )}
        >
          <CheckCircle2
            className={cn(
              "w-4 h-4 shrink-0",
              feedback.type === "success" ? "text-emerald-600" : "text-rose-600"
            )}
          />
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Composer Card */}
        <form
          onSubmit={handleSend}
          className="lg:col-span-5 rounded-3xl border border-[#E5DDD1] bg-[#FFFDF9] p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5DDD1]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF3E6] border border-[#ECD7A9] text-[#8E6314]">
              <BellRing className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1E150F]">Compose Notification</h2>
              <p className="text-[11px] text-[#73685C]">Delivered in real time to guest web portals</p>
            </div>
          </div>

          {/* Target Scope Toggle */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
              Recipients
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType("all")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer",
                  targetType === "all"
                    ? "border-[#1E150F] bg-[#1E150F] text-white"
                    : "border-[#E5DDD1] bg-[#FAF8F5] text-[#51473F] hover:border-[#B88223]"
                )}
              >
                <Building2 className="w-4 h-4" />
                <span>All Rooms ({rooms.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType("rooms")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer",
                  targetType === "rooms"
                    ? "border-[#1E150F] bg-[#1E150F] text-white"
                    : "border-[#E5DDD1] bg-[#FAF8F5] text-[#51473F] hover:border-[#B88223]"
                )}
              >
                <DoorOpen className="w-4 h-4" />
                <span>Specific Room(s)</span>
              </button>
            </div>
          </div>

          {/* Multi-Room Picker when targeting specific rooms */}
          {targetType === "rooms" && (
            <div className="rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-[#1E150F]">
                  Select Suite(s) ({selectedRoomIds.length} selected)
                </span>
                <div className="flex items-center gap-2">
                  {occupiedRooms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRoomIds(occupiedRooms.map((r) => r.id))}
                      className="font-semibold text-[#8E6314] hover:underline"
                    >
                      Occupied ({occupiedRooms.length})
                    </button>
                  )}
                  {selectedRoomIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRoomIds([])}
                      className="font-semibold text-[#73685C] hover:text-[#1E150F]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {rooms.length === 0 ? (
                <p className="text-xs text-[#73685C] py-2">No active rooms found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {rooms.map((rm) => {
                    const selected = selectedRoomIds.includes(rm.id);
                    const occupied = Boolean(rm.active_stay_id);
                    return (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => toggleRoomSelection(rm.id)}
                        className={cn(
                          "flex flex-col items-start rounded-xl border px-2.5 py-2 text-left transition-colors cursor-pointer",
                          selected
                            ? "border-[#1E150F] bg-[#1E150F] text-white"
                            : "border-[#E5DDD1] bg-white text-[#1E150F] hover:border-[#B88223]"
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-1 text-xs font-bold tabular-nums">
                          <span>Suite {rm.room_number}</span>
                          {selected && <Check className="w-3 h-3 text-[#ECD7A9]" />}
                        </div>
                        <span
                          className={cn(
                            "mt-0.5 truncate w-full text-[10px]",
                            selected
                              ? "text-[#ECD7A9]"
                              : occupied
                              ? "text-emerald-700 font-medium"
                              : "text-[#73685C]"
                          )}
                        >
                          {occupied ? rm.guest_name : "Vacant"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
              Category Badge
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
                    category === cat
                      ? "border-[#8E6314] bg-[#FAF3E6] text-[#8E6314]"
                      : "border-[#E5DDD1] bg-[#FAF8F5] text-[#73685C] hover:border-[#B88223]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
              Title *
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Evening Sunset Mocktails by the Pool"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1E150F] focus:border-[#B88223] focus:outline-none"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
              Message *
            </label>
            <textarea
              required
              rows={4}
              maxLength={2000}
              placeholder="Write your personalized suite message or resort announcement..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1E150F] focus:border-[#B88223] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-2xl bg-[#1E150F] py-3 px-5 text-xs font-bold text-white shadow-sm hover:bg-[#33241A] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 btn-smooth-press cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#ECD7A9]" />
            <span>
              {sending
                ? "Sending Notification..."
                : targetType === "all"
                ? "Push to All Rooms"
                : `Push to ${selectedRoomIds.length || 0} Selected Room${selectedRoomIds.length === 1 ? "" : "s"}`}
            </span>
          </button>
        </form>

        {/* Sent Notifications Log */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-bold text-[#1E150F] flex items-center gap-2">
              <Mail className="w-4.5 h-4.5 text-[#8E6314]" />
              Sent Notifications ({filteredHistory.length})
            </h2>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "broadcast", label: "All-Room Broadcasts" },
                  { id: "rooms", label: "Room Specific" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryFilter(tab.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
                    historyFilter === tab.id
                      ? "border-[#1E150F] bg-[#1E150F] text-white"
                      : "border-[#E5DDD1] bg-[#FFFDF9] text-[#73685C]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#E5DDD1] bg-[#FFFDF9] p-10 text-center text-xs text-[#73685C]">
              Loading sent messages...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-3xl border border-[#E5DDD1] bg-[#FFFDF9] p-10 text-center">
              <BellRing className="w-8 h-8 text-[#D4C3A3] mx-auto mb-2" />
              <p className="font-serif text-base font-bold text-[#1E150F]">No notifications sent yet</p>
              <p className="text-xs text-[#73685C] mt-1">
                Compose a message on the left to notify one room, several rooms, or the entire resort.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((msg) => (
                <article
                  key={msg.id}
                  className={cn(
                    "rounded-3xl border bg-[#FFFDF9] p-5 shadow-2xs space-y-2.5",
                    msg.isActive ? "border-[#E5DDD1]" : "border-stone-200 opacity-65"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-[#ECD7A9] bg-[#FAF3E6] px-2.5 py-0.5 text-[10px] font-bold text-[#8E6314]">
                        {msg.category}
                      </span>
                      {msg.targetType === "all" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                          <Building2 className="w-3 h-3" /> All Rooms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <DoorOpen className="w-3 h-3" />
                          {msg.targetRoomNumbers.map((num) => `Suite ${num}`).join(", ")}
                        </span>
                      )}
                      {typeof msg.readCount === "number" && (
                        <span className="rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#73685C] tabular-nums">
                          {msg.readCount} read
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(msg)}
                        title={msg.isActive ? "Hide from guest inbox" : "Show in guest inbox"}
                        className="rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] p-1.5 text-[#73685C] hover:text-[#1E150F] cursor-pointer"
                      >
                        {msg.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(msg)}
                        title="Delete notification"
                        className="rounded-xl border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-serif text-base font-bold text-[#1E150F]">{msg.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#51473F]">
                      {msg.body}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E5DDD1]/70 flex items-center justify-between text-[10.5px] text-[#73685C] tabular-nums">
                    <span>Sent by {msg.createdByName || "Staff"}</span>
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
