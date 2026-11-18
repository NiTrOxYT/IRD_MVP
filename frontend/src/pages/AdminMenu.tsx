import React, { useState, useEffect, useCallback } from "react";
import {
  getAdminMenu,
  toggleItemAvailability,
  createMenuItem,
  deleteMenuItem,
  Category,
  MenuItem,
} from "../lib/api";
import { Modal } from "../components/Modal";
import { DietaryBadge } from "../components/DietaryBadge";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react";

export function AdminMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New item modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prepTime, setPrepTime] = useState("20");
  const [dietaryFlags, setDietaryFlags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await getAdminMenu();
      setCategories(res.categories);
      setItems(res.items);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleToggle = async (item: MenuItem) => {
    const nextVal = !item.available;
    try {
      await toggleItemAvailability(item.id, nextVal);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: nextVal } : i))
      );
    } catch (err: any) {
      alert("Failed to toggle: " + err.message);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await deleteMenuItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert("Failed to delete item: " + err.message);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !price) {
      alert("Please fill in item name, category, and price.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createMenuItem({
        name: name.trim(),
        categoryId: Number(categoryId),
        price: Number(price),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        prepTimeMinutes: Number(prepTime) || 20,
        dietaryFlags,
        available: true,
      });

      setIsAddOpen(false);
      setName("");
      setCategoryId("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      setDietaryFlags([]);
      await fetchMenu();
    } catch (err: any) {
      alert("Creation failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFlag = (flag: string) => {
    setDietaryFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DDD1]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#B88223]">
            Culinary Management
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F]">
            In-Room Dining Menu Catalog
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Manage dish availability, prices, prep times, and dietary labels.
          </p>
        </div>

        <div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="py-2.5 px-4 bg-[#1E150F] hover:bg-[#29231F] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <Plus className="w-4 h-4 text-[#B88223]" /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Menu Categories and Items */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#73685C]">Loading menu catalog...</div>
      ) : (
        <div className="space-y-10">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.categoryId === cat.id);
            return (
              <section key={cat.id} className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-[#E5DDD1] pb-2">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#1E150F]">{cat.name}</h2>
                    {cat.description && (
                      <p className="text-xs text-[#73685C]">{cat.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[#73685C]">
                    {catItems.length} items
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-[#FFFDF9] border rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all ${
                        item.available ? "border-[#E5DDD1]" : "border-red-200 bg-red-50/10 opacity-75"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-serif text-base font-bold text-[#1E150F]">
                            {item.name}
                          </h3>
                          <span className="font-mono text-sm font-bold text-[#1E150F] shrink-0">
                            ${Number(item.price).toFixed(2)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-[#73685C] line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.dietaryFlags.map((f) => (
                            <DietaryBadge key={f} tag={f} />
                          ))}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="pt-3 border-t border-[#E5DDD1]/70 flex items-center justify-between">
                        <button
                          onClick={() => handleToggle(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            item.available
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {item.available ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-red-600" /> 86'd / Offline
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-[#73685C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create In-Room Dining Item">
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value) || "")}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              required
            >
              <option value="">-- Choose Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Dish Name
              </label>
              <input
                type="text"
                placeholder="e.g. Lobster Thermidor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs font-mono text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Detailed culinary ingredients, preparation style, allergen notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Photo URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Dietary & Signature Badges
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["veg", "vegan", "gluten_free", "spicy", "chef_special"].map((flag) => {
                const active = dietaryFlags.includes(flag);
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(flag)}
                    className={`px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-all ${
                      active
                        ? "bg-[#1E150F] text-white border-[#1E150F]"
                        : "bg-[#F8F5EF] text-[#73685C] border-[#E5DDD1]"
                    }`}
                  >
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E5DDD1]">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#73685C] hover:bg-[#F8F5EF] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#1E150F] hover:bg-[#29231F] rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Save Menu Item"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
