import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  HelpCircle,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Modal } from "../../../core/ui/Modal";
import { cn } from "../../../core/ui/utils";
import { faqApi } from "../api";
import type { FaqItem, FaqPayload } from "../types";

const DEFAULT_FORM: FaqPayload = {
  question: "",
  answer: "",
  category: "General",
  sortOrder: 0,
  isActive: true,
};

export function AdminFaq() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FaqPayload>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await faqApi.listAdminFaqs();
      setFaqs(res.faqs || []);
    } catch (err: any) {
      showToast("error", err.message || "Failed to load FAQs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)));
    return ["All", ...unique];
  }, [faqs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faqs.filter((f) => {
      if (categoryFilter !== "All" && f.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [faqs, categoryFilter, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, sortOrder: faqs.length + 1 });
    setModalOpen(true);
  };

  const openEditModal = (item: FaqItem) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category || "General",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      const payload: FaqPayload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || "General",
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (editingId) {
        await faqApi.updateFaq(editingId, payload);
        showToast("success", "FAQ updated successfully.");
      } else {
        await faqApi.createFaq(payload);
        showToast("success", "FAQ added successfully.");
      }
      setModalOpen(false);
      await fetchFaqs();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: FaqItem) => {
    try {
      await faqApi.toggleFaqStatus(item.id, !item.isActive);
      await fetchFaqs();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update visibility.");
    }
  };

  const handleDelete = async (item: FaqItem) => {
    if (!window.confirm(`Delete FAQ "${item.question}"?`)) return;
    try {
      await faqApi.deleteFaq(item.id);
      showToast("success", "FAQ deleted.");
      await fetchFaqs();
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete FAQ.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-6 border-b border-[#E5DDD1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Guest Information · Concierge
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            Guest FAQ Management
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Add, edit, reorder, or hide frequently asked questions displayed on the In-Suite Guest Portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFaqs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#E5DDD1] text-[#1E150F] hover:bg-[#FAF8F5]"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1E150F] text-white hover:bg-[#29231F] shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#ECD7A9]" /> Add Question
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-2xl border text-xs flex items-center gap-2 font-medium",
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          )}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 text-[#73685C] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search questions or answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] py-2.5 pl-10 pr-4 text-xs text-[#1E150F] focus:outline-none focus:border-[#B88223]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                categoryFilter === cat
                  ? "border-[#1E150F] bg-[#1E150F] text-white"
                  : "border-[#E5DDD1] bg-[#FFFDF9] text-[#73685C] hover:border-[#B88223]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#73685C]">Loading FAQs...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-12 text-center">
          <HelpCircle className="w-10 h-10 text-[#B88223] mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-[#1E150F]">No FAQs Found</h3>
          <p className="text-xs text-[#73685C] mt-1 mb-4">
            Create helpful questions and answers so guests have instant answers in their suite.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#1E150F] text-white text-xs font-bold"
          >
            + Add First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                "bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4",
                !item.isActive && "opacity-65"
              )}
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                    {item.category}
                  </span>
                  <span className="font-mono text-[11px] text-[#73685C]">Order #{item.sortOrder}</span>
                  {!item.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 text-stone-700">
                      Hidden
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-base font-bold text-[#1E150F] leading-snug">
                  {item.question}
                </h3>
                <p className="text-xs leading-relaxed text-[#51473F] whitespace-pre-line">
                  {item.answer}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleActive(item)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5DDD1] bg-[#FAF8F5] text-xs font-semibold text-[#73685C] hover:text-[#1E150F]"
                >
                  {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {item.isActive ? "Visible" : "Hidden"}
                </button>
                <button
                  onClick={() => openEditModal(item)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5DDD1] bg-white text-xs font-semibold text-[#1E150F] hover:border-[#B88223]"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  aria-label={`Delete ${item.question}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit FAQ Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? "Edit Guest FAQ" : "Add Guest FAQ"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
              Question *
            </label>
            <input
              type="text"
              required
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="e.g. What time is breakfast served?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] text-[#1E150F]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
              Answer *
            </label>
            <textarea
              rows={4}
              required
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Write a clear, helpful answer for suite guests..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] text-[#1E150F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Dining, Stay, Wi-Fi, General..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] text-[#1E150F]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] font-mono text-[#1E150F]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 font-semibold text-[#1E150F] cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded text-[#B88223]"
            />
            Visible on Guest Portal
          </label>

          <div className="pt-3 border-t border-[#E5DDD1] flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#E5DDD1] font-semibold text-[#73685C]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#1E150F] text-white font-bold shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create FAQ"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
