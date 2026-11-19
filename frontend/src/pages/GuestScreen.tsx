import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  verifyStay,
  resolveRoomQr,
  getGuestMenu,
  placeOrder,
  getStayOrders,
  cancelGuestOrder,
  getGuestHousekeepingRequests,
  createGuestHousekeepingRequest,
  HousekeepingRequest,
  MenuItem,
  MenuItemVariant,
  Category,
  ItemModifier,
  Order,
  PropertySettings,
} from "../lib/api";
import { formatINR } from "../lib/currency";
import {
  joinStayRoom,
  onStayInvalidated,
  onOrderStatusChanged,
  onOrderCreated,
  onHousekeepingCreated,
  onHousekeepingStatusChanged,
  subscribeConnectionStatus,
} from "../lib/socket";
import { DietaryBadge } from "../components/DietaryBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { playOrderChime } from "../lib/audio";
import {
  Search,
  X,
  Plus,
  Minus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ArrowRight,
  ShoppingBag,
  Utensils,
  ChevronRight,
  Info,
  RotateCcw,
  QrCode,
  Sparkles,
  ChefHat,
  BellRing,
  Coffee,
  Cake,
  Leaf,
  Flame,
  Home,
  Percent,
  Bath,
  Bed,
  Moon,
  Luggage,
  ChevronLeft,
  History,
  Send,
} from "lucide-react";
import { cn } from "../lib/utils";
import { usePropertyLogo } from "../lib/usePropertyName";

interface CartLineItem {
  cartItemId: string;
  item: MenuItem;
  variantId?: number | null;
  variantName?: string | null;
  quantity: number;
  selectedModifiers: ItemModifier[];
  notes?: string;
  unitPrice: number;
  lineTotal: number;
}

const ORDER_STAGES = [
  { key: "pending", label: "Received", desc: "Awaiting front desk confirmation" },
  { key: "accepted", label: "Confirmed", desc: "Sent to culinary team" },
  { key: "preparing", label: "In Kitchen", desc: "Crafting in resort kitchen" },
  { key: "ready", label: "Plated & Ready", desc: "Ready at culinary pass" },
  { key: "out_for_delivery", label: "En Route", desc: "Butler en route to your suite" },
  { key: "delivered", label: "Delivered", desc: "Delivered to your room" },
];

const HOUSEKEEPING_SERVICES = [
  {
    type: "cleaning",
    title: "Room Cleaning & Refresh",
    desc: "Complete suite refresh, dust & wipe, bed making, and waste clearance.",
    icon: Sparkles,
    badge: "Daily Refresh",
  },
  {
    type: "towels",
    title: "Fresh Bath Towels",
    desc: "Plush bath towels, hand towels, face cloths, and absorbent bath mats.",
    icon: Bath,
    badge: "Bathroom",
  },
  {
    type: "toiletries",
    title: "Toiletries & Amenities",
    desc: "Luxury bath gel, herbal shampoo, conditioner, dental kit, and vanity set.",
    icon: Sparkles,
    badge: "Bathroom",
  },
  {
    type: "linen",
    title: "Fresh Bed Linen",
    desc: "Crisp cotton bed sheets and pillowcase change for all suite beds.",
    icon: Bed,
    badge: "Bedding",
  },
  {
    type: "pillows_blankets",
    title: "Extra Pillows & Blankets",
    desc: "Plush hypoallergenic pillows and warm resort duvet/blanket.",
    icon: Bed,
    badge: "Bedding",
  },
  {
    type: "turndown",
    title: "Evening Turndown",
    desc: "Curtains drawn, bedding turned down, ambient lighting & fresh drinking water.",
    icon: Moon,
    badge: "Evening",
  },
  {
    type: "luggage",
    title: "Luggage & Porter Assistance",
    desc: "Assistance with luggage collection, room transfer, or departure transport.",
    icon: Luggage,
    badge: "Porter",
  },
  {
    type: "other",
    title: "Other In-Suite Assistance",
    desc: "Special housekeeping requests, iron & board, or extra packaged water.",
    icon: BellRing,
    badge: "Concierge",
  },
];

export function GuestScreen() {
  const loadingLogo = usePropertyLogo();
  const initialLoadStartedAt = useRef(performance.now());
  const [, setLocation] = useLocation();

  // Authentication & Stay State
  const [stayData, setStayData] = useState<any | null>(null);
  const [property, setProperty] = useState<PropertySettings | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Service Mode: "hub" (default service selection) | "room-service" | "housekeeping"
  const [serviceMode, setServiceMode] = useState<"hub" | "room-service" | "housekeeping">("hub");

  // Housekeeping State
  const [housekeepingRequests, setHousekeepingRequests] = useState<HousekeepingRequest[]>([]);
  const [hkLoading, setHkLoading] = useState(false);
  const [selectedHkService, setSelectedHkService] = useState<{
    type: string;
    title: string;
    desc: string;
    icon: any;
  } | null>(null);
  const [hkGuestNote, setHkGuestNote] = useState("");
  const [isSubmittingHk, setIsSubmittingHk] = useState(false);
  const [hkFeedback, setHkFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Active View Tab: "menu" | "orders"
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");

  // Menu State
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");
  const [menuSort, setMenuSort] = useState("recommended");

  // Cart State
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Customizer / Details Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<Record<string, ItemModifier>>({});
  const [itemNotes, setItemNotes] = useState("");

  // Rich Details View Modal State
  const [viewingItemDetails, setViewingItemDetails] = useState<MenuItem | null>(null);
  const [detailSelectedVariant, setDetailSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [detailSelectedMods, setDetailSelectedMods] = useState<Record<string, ItemModifier>>({});
  const [detailNotes, setDetailNotes] = useState("");
  const [detailQuantity, setDetailQuantity] = useState(1);

  // Orders Tracking State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  // Socket Connection Status
  const [connStatus, setConnStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");

  useEffect(() => {
    document.title = property?.name ? `${property.name} · In-Room Dining` : "In-Room Dining";
  }, [property?.name]);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;
    icon.href = property?.logoUrl || "/cafe-favicon.svg";
    icon.type = property?.logoUrl?.startsWith("data:image/webp") ? "image/webp" : "image/svg+xml";
  }, [property?.logoUrl]);

  useEffect(() => {
    const onLogoUpdated = (event: Event) => {
      const logoUrl = (event as CustomEvent<string | null>).detail;
      setProperty((current) => current ? { ...current, logoUrl } : current);
    };
    window.addEventListener("property-logo-updated", onLogoUpdated);
    return () => window.removeEventListener("property-logo-updated", onLogoUpdated);
  }, []);

  // 1. Initial Stay Verification
  const verifyToken = useCallback(async (token: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await verifyStay(token);
      localStorage.setItem("ird_stay_token", token);
      setStayData(res.stay);
      setProperty(res.property);
      joinStayRoom(res.stay.id);
      return res;
    } catch (err: any) {
      localStorage.removeItem("ird_stay_token");
      setAuthError(err.message || "Invalid or expired in-room dining access.");
      throw err;
    } finally {
      const minVisibleMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 450 : 2300;
      const remainingMs = Math.max(0, minVisibleMs - (performance.now() - initialLoadStartedAt.current));
      if (remainingMs > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, remainingMs));
      setAuthLoading(false);
    }
  }, []);

  const fetchMenuData = useCallback(async () => {
    setMenuLoading(true);
    try {
      const res = await getGuestMenu();
      setCategories(res.categories);
      setItems(res.items);
    } catch (err) {
      console.error("[Guest] Menu fetch error:", err);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const fetchOrdersData = useCallback(async () => {
    try {
      const res = await getStayOrders();
      setOrders(res.orders);
    } catch (err) {
      console.error("[Guest] Orders fetch error:", err);
    }
  }, []);

  const fetchHousekeepingData = useCallback(async () => {
    try {
      setHkLoading(true);
      const res = await getGuestHousekeepingRequests();
      if (res.success) {
        setHousekeepingRequests(res.requests);
      }
    } catch (err) {
      console.error("[Guest] Housekeeping fetch error:", err);
    } finally {
      setHkLoading(false);
    }
  }, []);

  // Mount & Auth Init
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token") || params.get("stay") || params.get("t");
    const roomQrParam = params.get("roomQr");
    const serviceParam = params.get("service");

    if (serviceParam === "housekeeping" || window.location.pathname === "/stay/housekeeping") {
      setServiceMode("housekeeping");
    } else if (serviceParam === "menu" || serviceParam === "room-service" || window.location.pathname === "/stay/menu") {
      setServiceMode("room-service");
    }

    if (tokenParam || roomQrParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const stayToken = tokenParam
        ? Promise.resolve(tokenParam)
        : resolveRoomQr(roomQrParam!).then((result) => result.stayToken);
      stayToken
        .then(verifyToken)
        .then(() => {
          fetchMenuData();
          fetchOrdersData();
          fetchHousekeepingData();
        })
        .catch((err: any) => {
          setAuthError(err?.message || "This room QR code could not be verified. Please contact Reception.");
          setAuthLoading(false);
        });
      return;
    }

    const savedToken = localStorage.getItem("ird_stay_token");
    if (savedToken) {
      verifyToken(savedToken)
        .then(() => {
          fetchMenuData();
          fetchOrdersData();
          fetchHousekeepingData();
        })
        .catch(() => {});
      return;
    }

    setAuthLoading(false);
  }, [verifyToken, fetchMenuData, fetchOrdersData, fetchHousekeepingData]);

  // Realtime Socket listeners & polling fallback
  useEffect(() => {
    if (!stayData?.id) return;

    joinStayRoom(stayData.id);

    const unsubInvalidated = onStayInvalidated((data) => {
      alert(data.message || "Your stay has been checked out by reception.");
      localStorage.removeItem("ird_stay_token");
      setStayData(null);
      setAuthError("Stay access expired or checked out.");
    });

    const unsubStatusChanged = onOrderStatusChanged(() => {
      playOrderChime();
      fetchOrdersData();
    });

    const unsubCreated = onOrderCreated(() => {
      fetchOrdersData();
    });

    const unsubHkCreated = onHousekeepingCreated((req) => {
      setHousekeepingRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
    });

    const unsubHkStatus = onHousekeepingStatusChanged((data) => {
      const updated = data.request;
      setHousekeepingRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    });

    const unsubConn = subscribeConnectionStatus(setConnStatus);

    // 5-second polling fallback while stay is active
    const pollInterval = setInterval(() => {
      fetchOrdersData();
      fetchHousekeepingData();
    }, 5000);

    return () => {
      unsubInvalidated();
      unsubStatusChanged();
      unsubCreated();
      unsubHkCreated();
      unsubHkStatus();
      unsubConn();
      clearInterval(pollInterval);
    };
  }, [stayData?.id, fetchOrdersData, fetchHousekeepingData]);

  // Housekeeping Submission Handler
  const handleConfirmHousekeepingRequest = async () => {
    if (!selectedHkService || isSubmittingHk) return;
    setIsSubmittingHk(true);
    setHkFeedback(null);
    try {
      const res = await createGuestHousekeepingRequest({
        requestType: selectedHkService.type,
        guestNote: hkGuestNote.trim() || undefined,
      });
      if (res.success) {
        setHousekeepingRequests((prev) => [res.request, ...prev.filter((r) => r.id !== res.request.id)]);
        setSelectedHkService(null);
        setHkGuestNote("");
        setHkFeedback({
          type: "success",
          message: `Your request for "${res.request.title}" has been placed. Our housekeeping team will attend to Suite ${stayData?.room?.roomNumber || ""} shortly.`,
        });
        setTimeout(() => {
          setHkFeedback(null);
        }, 6000);
      }
    } catch (err: any) {
      setHkFeedback({
        type: "error",
        message: err.message || "Unable to submit request. Please try again or contact Reception.",
      });
    } finally {
      setIsSubmittingHk(false);
    }
  };

  // Cart Management & Item Details Modal Handlers
  const handleOpenItemDetails = (item: MenuItem) => {
    if (!item.available) return;
    setViewingItemDetails(item);

    // Initial variant selection
    if (item.variants && item.variants.length > 0) {
      const firstAvailable = item.variants.find((v) => v.available) || item.variants[0];
      setDetailSelectedVariant(firstAvailable || null);
    } else {
      setDetailSelectedVariant(null);
    }

    // Default modifiers
    const defaults: Record<string, ItemModifier> = {};
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((m) => {
        if (m.isDefault) defaults[m.groupName] = m;
      });
    }
    setDetailSelectedMods(defaults);
    setDetailNotes("");
    setDetailQuantity(1);
  };

  const handleOpenCustomizer = (item: MenuItem) => {
    handleOpenItemDetails(item);
  };

  const addToCart = (
    item: MenuItem,
    variant?: MenuItemVariant | null,
    modifiers: ItemModifier[] = [],
    notes = "",
    qty = 1
  ) => {
    const basePrice = variant ? Number(variant.price) : Number(item.price);
    const modTotal = modifiers.reduce((acc, m) => acc + Number(m.priceDelta), 0);
    const unitPrice = basePrice + modTotal;
    const variantKey = variant?.id ? `v${variant.id}` : "base";
    const modKey = modifiers.map((m) => m.id).sort().join("_");
    const cartItemId = `${item.id}-${variantKey}-${modKey}-${notes.trim()}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.cartItemId === cartItemId);
      if (existing) {
        return prev.map((c) =>
          c.cartItemId === cartItemId
            ? { ...c, quantity: c.quantity + qty, lineTotal: (c.quantity + qty) * unitPrice }
            : c
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          item,
          variantId: variant?.id || null,
          variantName: variant?.name || null,
          quantity: qty,
          selectedModifiers: modifiers,
          notes: notes.trim() || undefined,
          unitPrice,
          lineTotal: unitPrice * qty,
        },
      ];
    });

    if (viewingItemDetails) {
      setViewingItemDetails(null);
    }
    if (customizingItem) {
      setCustomizingItem(null);
    }
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((line) => {
          if (line.cartItemId === cartItemId) {
            const nextQty = line.quantity + delta;
            return nextQty > 0
              ? { ...line, quantity: nextQty, lineTotal: nextQty * line.unitPrice }
              : null;
          }
          return line;
        })
        .filter(Boolean) as CartLineItem[];
    });
  };

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, c) => acc + c.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, c) => acc + c.lineTotal, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    const rate = property?.taxRatePercent ? Number(property.taxRatePercent) / 100 : 0.1;
    return subtotal * rate;
  }, [subtotal, property?.taxRatePercent]);

  const serviceCharge = useMemo(() => {
    const rate = property?.serviceChargePercent
      ? Number(property.serviceChargePercent) / 100
      : 0.05;
    return subtotal * rate;
  }, [subtotal, property?.serviceChargePercent]);

  const totalAmount = useMemo(() => {
    return subtotal + taxAmount + serviceCharge;
  }, [subtotal, taxAmount, serviceCharge]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    try {
      const itemsPayload = cart.map((c) => ({
        menuItemId: c.item.id,
        variantId: c.variantId || undefined,
        quantity: c.quantity,
        modifierIds: c.selectedModifiers.map((m) => m.id),
        notes: c.notes,
      }));

      await placeOrder({
        items: itemsPayload,
        specialInstructions: deliveryNotes.trim() || undefined,
      });

      setCart([]);
      setDeliveryNotes("");
      setIsCartOpen(false);
      setActiveTab("orders");
      await fetchOrdersData();
    } catch (err: any) {
      alert("Failed to submit in-room dining request: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm("Cancel this in-room dining order?")) return;
    setCancellingOrderId(orderId);
    try {
      await cancelGuestOrder(orderId);
      await fetchOrdersData();
    } catch (err: any) {
      alert("Cancellation failed: " + err.message);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getItemCartQuantity = (itemId: number) => {
    return cart
      .filter((c) => c.item.id === itemId)
      .reduce((acc, c) => acc + c.quantity, 0);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== "all" && item.categoryId !== selectedCategory) {
        return false;
      }
      if (dietaryFilter !== "all") {
        const flags = item.dietaryFlags || [];
        if (dietaryFilter === "veg" && !flags.includes("veg") && !flags.includes("vegetarian")) {
          return false;
        }
        if (dietaryFilter === "non_veg" && !flags.includes("non_veg") && !flags.includes("non-veg") && !flags.includes("nonveg")) {
          return false;
        }
        if (dietaryFilter === "vegan" && !flags.includes("vegan")) {
          return false;
        }
        if (
          dietaryFilter === "gluten_free" &&
          !flags.includes("gluten_free") &&
          !flags.includes("gluten-free")
        ) {
          return false;
        }
        if (dietaryFilter === "spicy" && !flags.includes("spicy")) {
          return false;
        }
        if (
          dietaryFilter === "chef_special" &&
          !flags.includes("chef_special") &&
          !flags.includes("signature")
        ) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        return matchName || matchDesc;
      }
      return true;
    });
  }, [items, selectedCategory, dietaryFilter, searchQuery]).sort((a, b) => {
    if (menuSort === "price_low") return Number(a.price) - Number(b.price);
    if (menuSort === "price_high") return Number(b.price) - Number(a.price);
    if (menuSort === "quickest") return Number(a.prepTimeMinutes) - Number(b.prepTimeMinutes);
    return 0;
  });

  const itemSections = useMemo(() => {
    if (selectedCategory === "all" && !searchQuery.trim()) {
      return categories
        .map((category) => ({
          id: category.id,
          title: category.name,
          items: filteredItems.filter((item) => item.categoryId === category.id),
        }))
        .filter((section) => section.items.length > 0);
    }
    const category = categories.find((entry) => entry.id === selectedCategory);
    return [{ id: category?.id ?? "search-results", title: category?.name ?? "", items: filteredItems }];
  }, [categories, filteredItems, searchQuery, selectedCategory]);

  const { activeOrders, pastOrders } = useMemo(() => {
    const active = orders.filter((o) =>
      ["pending", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.status)
    );
    const past = orders.filter((o) =>
      ["delivered", "cancelled", "rejected"].includes(o.status)
    );
    return { activeOrders: active, pastOrders: past };
  }, [orders]);

  const { activeHkRequests, pastHkRequests } = useMemo(() => {
    const active = housekeepingRequests.filter((r) =>
      ["pending", "accepted", "in_progress"].includes(r.status)
    );
    const past = housekeepingRequests.filter((r) =>
      ["completed", "declined"].includes(r.status)
    );
    return { activeHkRequests: active, pastHkRequests: past };
  }, [housekeepingRequests]);

  const billableOrdersTotal = useMemo(
    () => orders
      .filter((order) => !["cancelled", "rejected"].includes(order.status))
      .reduce((total, order) => total + Number(order.total_amount || 0), 0),
    [orders]
  );

  // ── Render Case 1: Initial Loading ──
  if (authLoading) {
    return (
      <div className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#302015] px-6 py-10 text-center" role="status" aria-live="polite">
        <img src="/suite-loader-scene.jpg" alt="" aria-hidden="true" className="suite-loader-scene pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[58%_center]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(30,19,12,0.42)_0%,rgba(33,21,14,0.34)_48%,rgba(30,18,11,0.52)_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_49%,rgba(34,21,14,0.38)_0%,rgba(34,21,14,0.1)_48%,transparent_72%)]" />
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
          <div className="suite-loader-piece suite-loader-piece-dining absolute left-[5%] top-[8%] h-[76px] w-[108px] overflow-hidden rounded-2xl border-2 border-[#F5EAD5]/80 shadow-2xl sm:left-[14%] sm:top-[10%] sm:h-28 sm:w-40">
            <img src="/in-room-dining-card.jpg" alt="" className="h-full w-full object-cover object-[68%_center]" />
          </div>
          <div className="suite-loader-piece suite-loader-piece-room absolute right-[5%] top-[12%] h-[84px] w-[72px] overflow-hidden rounded-2xl border-2 border-[#F5EAD5]/80 shadow-2xl sm:right-[14%] sm:top-[13%] sm:h-32 sm:w-28">
            <img src="/room-service-card.jpg" alt="" className="h-full w-full object-cover object-[68%_center]" />
          </div>
          <div className="suite-loader-piece suite-loader-piece-suite absolute bottom-[8%] left-[7%] h-[68px] w-[104px] overflow-hidden rounded-2xl border-2 border-[#F5EAD5]/80 shadow-2xl sm:bottom-[10%] sm:left-[18%] sm:h-20 sm:w-32">
            <img src="/suite-welcome-card.jpg" alt="" className="h-full w-full object-cover object-[68%_center]" />
          </div>
          <div className="suite-loader-piece suite-loader-piece-amenities absolute bottom-[19%] right-[6%] h-[76px] w-[108px] overflow-hidden rounded-2xl border-2 border-[#F5EAD5]/80 shadow-2xl sm:bottom-[18%] sm:right-[18%] sm:h-24 sm:w-36">
            <img src="/suite-loader-amenities.jpg" alt="" className="h-full w-full object-cover object-center" />
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-center">
        <div className="suite-loader-mark relative mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border border-[#E2C98F] bg-[#FFFDF9] p-3 shadow-[0_8px_28px_rgba(20,12,8,0.38)]" aria-hidden="true">
            <img src={loadingLogo || "/kusum-kunja-cafe-logo.png"} alt="" className="h-full w-full object-contain" />
        </div>
        <h2 className="suite-loader-copy font-serif text-3xl font-semibold tracking-tight text-[#FFF9EF] sm:text-4xl">Preparing your suite</h2>
        <p className="suite-loader-copy mt-2 max-w-[90vw] font-script text-lg text-[#E9C77D]">Your stay is almost ready</p>
        <p className="suite-loader-copy mt-3 text-xs tracking-wide text-[#F3E9DB]">Connecting to your stay</p>
        <span className="suite-loader-trace mt-7 h-px w-36 overflow-hidden rounded-full bg-[#F3E9DB]/30" aria-hidden="true">
          <span className="block h-full w-1/2 rounded-full bg-[#E9C77D]" />
        </span>
        </div>
      </div>
    );
  }

  // ── Render Case 2: No Active Stay / Invalid Room QR ──
  if (!stayData) {
    return (
      <div className="min-h-[100dvh] bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-sm bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 sm:p-8 shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
          <img src={property?.logoUrl || "/kusum-kunja-cafe-logo.png"} alt={`${property?.name || "Property"} logo`} className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-[#ECD7A9] bg-[#FFFDF9] p-1 object-contain shadow-xs" />

          <h1 className="font-serif text-2xl font-bold text-[#1E150F] mb-1">
            In-Room Dining
          </h1>
          <p className="font-script text-base text-[#73685C] mb-6">
            Curated culinary experiences delivered to your suite
          </p>

          <div className="mb-6 rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] p-4 text-left flex items-start gap-3">
            <QrCode className="w-5 h-5 text-[#B88223] shrink-0 mt-0.5" />
            <p className="text-xs text-[#73685C] leading-relaxed">
              Please scan the permanent QR code placed on your suite desk or bedside table. Ordering is activated upon guest check-in.
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#E5DDD1] text-[11px] text-[#73685C]">
            Need assistance? Dial <span className="font-bold text-[#1E150F]">Extension 0</span> from your in-suite phone for Reception.
          </div>
        </div>
      </div>
    );
  }

  // ── Render Case 3: Authenticated In-Room Dining Experience ──
  return (
    <div className="min-h-[100dvh] bg-[#F8F5EF] text-[#29231F] flex flex-col pb-[max(7rem,calc(6rem+env(safe-area-inset-bottom)))]">
      {/* ── Guest Luxury Mobile Header ── */}
      <header className="sticky top-0 z-40 bg-[#F8F5EF]/95 backdrop-blur-md border-b border-[#E5DDD1] shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={property?.logoUrl || "/kusum-kunja-cafe-logo.png"} alt={`${property?.name || "Property"} logo`} className="w-8 h-8 rounded-xl border border-[#ECD7A9] bg-[#FFFDF9] p-0.5 object-contain shadow-2xs" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-[17px] font-bold leading-tight tracking-tight text-[#29231F] sm:text-[19px]">
                  {property?.name || "In-Room Dining"}
                </span>
                <span className="hidden rounded-full border border-[#ECD7A9] bg-[#FAF3E6] px-2 py-0.5 text-[9px] font-bold text-[#766B61] sm:inline-flex">Digital Menu</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#73685C]">
                <span className="font-semibold text-[#29231F]">Suite {stayData.room?.roomNumber}</span>
                <span>·</span>
                <span className="truncate max-w-[120px]">{stayData.guestName}</span>
              </div>
            </div>
          </div>

          {/* Quick actions adapted for in-room dining and suite services */}
          <div className="flex items-center gap-2">
            {serviceMode !== "hub" && (
              <button
                onClick={() => setServiceMode("hub")}
                className="inline-flex items-center gap-1 rounded-full border border-[#ECD7A9] bg-[#FAF3E6] px-2.5 py-1 text-xs font-semibold text-[#8E6314] transition-colors hover:bg-[#F3E7CC]"
              >
                <ChevronLeft size={14} /> Services
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#FAF8F5] border border-[#E5DDD1] text-[#73685C]">
              {connStatus === "connected" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[#1E150F]">Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-amber-800">Syncing</span>
                </>
              )}
            </div>
            {serviceMode === "room-service" && (
              <>
                <button onClick={() => document.getElementById("ird-menu-search")?.focus()} aria-label="Search menu" className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#E5DDD1] bg-[#FFFDF9] text-[#29231F] shadow-2xs sm:flex"><Search className="h-4 w-4" /></button>
                <button onClick={() => setIsCartOpen(true)} aria-label="Open order cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E5DDD1] bg-[#FFFDF9] text-[#29231F] shadow-2xs"><ShoppingBag className="h-4 w-4" />{totalCartCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7C4D32] px-1 text-[9px] font-bold text-white">{totalCartCount}</span>}</button>
                <button onClick={() => setActiveTab("orders")} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5DDD1] bg-[#FFFDF9] px-3 py-2 text-xs font-semibold text-[#29231F] shadow-2xs"><Clock className="h-4 w-4 text-[#7C4D32]" /><span className="hidden sm:inline">Order</span></button>
              </>
            )}
          </div>
        </div>

      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4 sm:space-y-5">
        {/* ──────────────── MODE 1: SERVICE HUB HOME ──────────────── */}
        {serviceMode === "hub" && (
          <div className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-4 sm:space-y-6">
            {/* Suite Welcome Banner */}
            <div className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] border border-[#7A5A3D] bg-[#302015] p-6 shadow-md sm:min-h-[270px] sm:p-8">
              <img
                src="/suite-welcome-card.jpg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[62%_center]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(39,25,17,0.94)_0%,rgba(47,31,20,0.84)_48%,rgba(43,29,20,0.4)_100%)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(0deg,rgba(30,19,13,0.42)_0%,transparent_58%)]"
              />
              <div className="relative z-10 max-w-xl">
                <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E4C889]/55 bg-[#2D2118]/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F2D99F]">
                  <Sparkles className="w-3.5 h-3.5" /> In-Suite Guest Portal
                </div>
                <h2 className="font-serif text-2xl font-bold leading-tight text-[#FFF9EF] sm:text-4xl">
                  Welcome to Suite {stayData.room?.roomNumber}
                </h2>
                <p className="mt-1 font-script text-lg text-[#E9C77D] sm:text-xl">
                  Tailored luxury resort services for {stayData.guestName}
                </p>
                <p className="mt-3 max-w-lg text-xs leading-relaxed text-[#F3E9DB] sm:text-sm">
                  Choose an in-suite service below. Dining orders and room-service requests are sent to our team in real time.
                </p>
              </div>
            </div>

            {/* Active Requests Tracker Banner (if any active order or housekeeping request) */}
            {(activeOrders.length > 0 || activeHkRequests.length > 0) && (
              <div className="bg-[#FAF3E6] border border-[#ECD7A9] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E6314] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-[#8E6314]" /> Active In-Suite Requests
                  </div>
                  <div className="text-xs text-[#29231F] flex flex-wrap gap-2">
                    {activeOrders.length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-[#FFFDF9] px-2.5 py-1 rounded-xl border border-[#ECD7A9] font-semibold text-xs">
                        🍽️ In Room Dining: <span className="capitalize">{activeOrders[0].status.replace(/_/g, " ")}</span> ({activeOrders.length})
                      </span>
                    )}
                    {activeHkRequests.length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-[#FFFDF9] px-2.5 py-1 rounded-xl border border-[#ECD7A9] font-semibold text-xs">
                        ✨ Room Service: <span className="capitalize">{activeHkRequests[0].status.replace(/_/g, " ")}</span> ({activeHkRequests.length})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {activeOrders.length > 0 && (
                    <button
                      onClick={() => {
                        setServiceMode("room-service");
                        setActiveTab("orders");
                      }}
                      className="text-xs font-bold text-[#8E6314] hover:underline"
                    >
                      View Order →
                    </button>
                  )}
                  {activeHkRequests.length > 0 && (
                    <button
                      onClick={() => setServiceMode("housekeeping")}
                      className="text-xs font-bold text-[#8E6314] hover:underline"
                    >
                      View Room Service →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Two Clear Primary Service Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Option 1: In Room Dining */}
              <div
                onClick={() => setServiceMode("room-service")}
                className="group relative isolate flex min-h-[300px] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-[#E5DDD1] bg-[#FFFDF9] p-6 shadow-sm transition-all hover:border-[#B88223] hover:shadow-md"
              >
                <img
                  src="/in-room-dining-card.jpg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[62%_center] transition-transform duration-700 group-hover:scale-[1.025]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(255,253,249,0.97)_0%,rgba(255,253,249,0.91)_42%,rgba(255,253,249,0.48)_72%,rgba(255,253,249,0.08)_100%)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(0deg,rgba(255,253,249,0.7)_0%,transparent_42%)]"
                />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#54321E] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <ChefHat className="w-6 h-6 text-[#ECD7A9]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                      IN-ROOM DINING
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1E150F] group-hover:text-[#8E6314] transition-colors">
                      In Room Dining
                    </h3>
                    <p className="font-script text-base text-[#8E6314]">
                      Artisanal Culinary Service
                    </p>
                    <p className="text-xs text-[#73685C] mt-2 leading-relaxed">
                      Freshly prepared delicacies, chef specials, artisanal coffees, snacks, and private suite dining delivered to your door.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-6 flex items-center justify-between border-t border-[#8E725D]/25 pt-4">
                  <span className="text-xs font-bold text-[#54321E] group-hover:text-[#8E6314] flex items-center gap-1">
                    Browse Menu & Order <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  {totalCartCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8E6314] text-white">
                      {totalCartCount} in cart
                    </span>
                  )}
                </div>
              </div>

              {/* Option 2: Room Service */}
              <div
                onClick={() => setServiceMode("housekeeping")}
                className="group relative isolate flex min-h-[300px] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-[#E5DDD1] bg-[#FFFDF9] p-6 shadow-sm transition-all hover:border-[#B88223] hover:shadow-md"
              >
                <img
                  src="/room-service-card.jpg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[62%_center] transition-transform duration-700 group-hover:scale-[1.025]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(255,253,249,0.97)_0%,rgba(255,253,249,0.91)_42%,rgba(255,253,249,0.48)_72%,rgba(255,253,249,0.08)_100%)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(0deg,rgba(255,253,249,0.7)_0%,transparent_42%)]"
                />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#29231F] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Sparkles className="w-6 h-6 text-[#ECD7A9]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                      ROOM SERVICE
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1E150F] group-hover:text-[#8E6314] transition-colors">
                      Room Service
                    </h3>
                    <p className="font-script text-base text-[#8E6314]">
                      Suite Refresh & Amenities
                    </p>
                    <p className="text-xs text-[#73685C] mt-2 leading-relaxed">
                      Request room cleaning, fresh towels, luxury toiletries, fresh bed linen, extra pillows, evening turndown, or luggage assistance.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-6 flex items-center justify-between border-t border-[#8E725D]/25 pt-4">
                  <span className="text-xs font-bold text-[#29231F] group-hover:text-[#8E6314] flex items-center gap-1">
                    Request Room Service <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  {activeHkRequests.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                      {activeHkRequests.length} active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Front Desk Extension Card */}
            <div className="rounded-2xl border border-[#E5DDD1] bg-[#FFFDF9] p-4 flex items-center justify-between gap-3 text-xs text-[#73685C] shadow-2xs">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-[#8E6314] shrink-0" />
                <div>
                  <span className="font-bold text-[#1E150F] block">Need Special Concierge Assistance?</span>
                  <span>Dial <strong className="text-[#1E150F]">Extension 0</strong> from your in-suite telephone. Available 24 hours.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── MODE 2: HOUSEKEEPING EXPERIENCE ──────────────── */}
        {serviceMode === "housekeeping" && (
          <div className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-4 sm:space-y-6">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setServiceMode("hub")}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#8E6314] hover:text-[#54321E] px-3 py-1.5 rounded-xl bg-[#FAF3E6] border border-[#ECD7A9] shadow-2xs"
              >
                <ChevronLeft size={16} /> All Services
              </button>
              <div className="text-[11px] text-[#73685C]">
                Suite <strong className="text-[#29231F]">{stayData.room?.roomNumber}</strong>
              </div>
            </div>

            {/* Housekeeping Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-[#DED4C7] bg-[#FFFDF9] p-6 sm:p-8 shadow-sm">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9] mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Suite Replenishment
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E150F]">
                  Room Service & In-Suite Care
                </h2>
                <p className="text-xs sm:text-sm text-[#73685C] mt-2 leading-relaxed">
                  Select an item below to place a request. Our room-service team is ready to assist Suite {stayData.room?.roomNumber}.
                </p>
              </div>
            </div>

            {/* Feedback Alert */}
            {hkFeedback && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-sm animate-in fade-in ${
                  hkFeedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {hkFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{hkFeedback.message}</span>
              </div>
            )}

            {/* Services Grid */}
            <div>
              <h3 className="font-serif text-lg font-bold text-[#29231F] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8E6314]" /> Request a Service
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {HOUSEKEEPING_SERVICES.map((srv) => {
                  const Icon = srv.icon;
                  return (
                    <div
                      key={srv.type}
                      onClick={() => setSelectedHkService(srv)}
                      className="group cursor-pointer bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl p-4 shadow-2xs hover:border-[#B88223] hover:shadow-md transition-all flex flex-col justify-between text-left"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FAF3E6] border border-[#ECD7A9] text-[#8E6314] flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#73685C] bg-[#FAF8F5] border border-[#E5DDD1] px-2 py-0.5 rounded-full">
                            {srv.badge}
                          </span>
                        </div>
                        <h4 className="font-serif text-sm font-bold text-[#1E150F] group-hover:text-[#8E6314] transition-colors leading-snug">
                          {srv.title}
                        </h4>
                        <p className="text-[11px] text-[#73685C] mt-1 line-clamp-2 leading-relaxed">
                          {srv.desc}
                        </p>
                      </div>
                      <div className="mt-4 pt-2.5 border-t border-[#E5DDD1]/70 flex items-center justify-between text-[11px] font-bold text-[#8E6314]">
                        <span>Request Service</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current & Recent Requests List */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg font-bold text-[#29231F] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8E6314]" /> Current & Recent Requests
                </h3>
                {housekeepingRequests.length > 0 && (
                  <span className="text-[11px] text-[#73685C]">
                    {housekeepingRequests.length} request{housekeepingRequests.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {housekeepingRequests.length === 0 ? (
                <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl p-8 text-center shadow-xs">
                  <Sparkles className="w-8 h-8 text-[#D4C3A3] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#29231F]">No housekeeping requests placed yet</p>
                  <p className="text-[11px] text-[#73685C] mt-0.5">
                    Select a service above to request amenities or in-suite care.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {housekeepingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl p-4 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#73685C] block">
                            Suite {req.room_number} · #{req.id}
                          </span>
                          <h4 className="font-serif text-sm font-bold text-[#29231F]">
                            {req.title}
                          </h4>
                        </div>
                        <div>
                          {req.status === "pending" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Received
                            </span>
                          )}
                          {req.status === "accepted" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCircle2 className="w-3 h-3" /> Accepted
                            </span>
                          )}
                          {req.status === "in_progress" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Sparkles className="w-3 h-3 animate-spin" /> In Progress
                            </span>
                          )}
                          {req.status === "completed" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          )}
                          {req.status === "declined" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                              Declined
                            </span>
                          )}
                        </div>
                      </div>

                      {req.guest_note && (
                        <p className="text-[11px] text-[#73685C] italic bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E5DDD1] mb-2">
                          "{req.guest_note}"
                        </p>
                      )}

                      {req.staff_notes && (
                        <p className="text-[11px] text-[#8E6314] bg-[#FAF3E6] p-2.5 rounded-xl border border-[#ECD7A9] mb-2">
                          <strong>Staff Note:</strong> {req.staff_notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-[#73685C] pt-2 border-t border-[#E5DDD1]/70">
                        <span>Requested at {new Date(req.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {req.completed_at && (
                          <span className="text-emerald-700 font-semibold">
                            Completed at {new Date(req.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────────────── MODE 3: ROOM SERVICE (IN-ROOM DINING) ──────────────── */}
        {serviceMode === "room-service" && (
          <>
            <div className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl flex items-center justify-between gap-2">
              <button
                onClick={() => setServiceMode("hub")}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#8E6314] hover:text-[#54321E] px-3 py-1.5 rounded-xl bg-[#FAF3E6] border border-[#ECD7A9] shadow-2xs"
              >
                <ChevronLeft size={16} /> All Services
              </button>
              <button
                onClick={() => setServiceMode("housekeeping")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#766B61] hover:text-[#29231F] px-2.5 py-1 rounded-xl bg-[#FFFDF9] border border-[#E5DDD1]"
              >
                <Sparkles size={13} className="text-[#8E6314]" /> Room Service
              </button>
            </div>

            {/* ──────────────── TAB 1: MENU VIEW ──────────────── */}
            {activeTab === "menu" && (
          <div className="mx-auto max-w-md space-y-3.5 sm:max-w-2xl sm:space-y-5 lg:max-w-4xl">
            {/* Hero Banner Section (styled to match cafe reference with resort room service adaptation) */}
            <section className="relative flex min-h-[300px] items-center overflow-hidden rounded-[22px] border border-[#DED4C7] bg-[#F7F3EB] shadow-[0_4px_20px_rgba(70,48,34,0.05)] sm:min-h-[340px] sm:rounded-[28px] md:min-h-[380px]">
              {/* Background Banner Image from public/banner.png */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img
                  src="/banner.png"
                  alt="Artisanal In-Room Dining"
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover object-right sm:object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/hero-cafe-banner.jpg";
                  }}
                />
                {/* Soft gradient fade on left for maximum text contrast and readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#F8F5EF]/95 via-[#F8F5EF]/70 to-transparent sm:via-[#F8F5EF]/50 sm:to-transparent" />
              </div>

              {/* Foreground Hero Content (Left Aligned - High Contrast) */}
              <div className="relative z-10 max-w-[250px] space-y-2.5 px-5 py-5 sm:max-w-[340px] sm:space-y-3.5 sm:px-8 sm:py-7 md:max-w-[440px]">
                {/* Tagline */}
                <p className="text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#524135] sm:text-[11px]">
                  SUITE CULINARY SERVICE
                </p>

                {/* Main Heading */}
                <h2 className="font-serif text-[30px] font-bold leading-[1.02] tracking-tight text-[#191410] sm:text-[40px] md:text-[48px]">
                  Artisanal In-Room Dining
                </h2>

                {/* Subtitle */}
                <p className="max-w-[220px] text-[12px] font-medium leading-snug text-[#3D322A] sm:max-w-xs sm:text-[13.5px] sm:leading-relaxed">
                  Freshly prepared and plated by our chefs for in-suite enjoyment
                </p>

                <button onClick={() => document.getElementById("ird-menu-items")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-full bg-[#54321E] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#3D2314] sm:px-6 sm:py-3 sm:text-sm">
                  Explore Menu <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <div className="space-y-0.5 pt-1">
                  <div className="h-0.5 w-7 bg-[#6B4226]" />
                  <p className="font-script text-[18px] font-bold leading-snug text-[#54321E] sm:text-[22px]">Food Tastes Better<br />Together</p>
                </div>

                {/* Operating Hours Note */}
                {property?.openingTime?.trim() && property?.closingTime?.trim() && (
                  <div className="pt-0.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-[#73685C]">
                    <Clock className="w-3 h-3 text-[#B88223]" />
                    <span>Service: {property.openingTime} – {property.closingTime}</span>
                  </div>
                )}

                {!property?.irdEnabled && (
                  <div className="mt-1.5 p-1.5 bg-rose-50/90 border border-rose-200 rounded-lg text-rose-800 text-[10px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>In-room ordering paused by front desk.</span>
                  </div>
                )}
              </div>
            </section>

            {/* Mobile Search Bar matching cafe */}
            <div className="relative" id="ird-menu-items">
              <Search className="w-4 h-4 text-[#73685C] absolute left-3.5 top-3 pointer-events-none" />
              <input
                id="ird-menu-search"
                type="text"
                placeholder="Search food, coffee, desserts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-[#E5DDD1] bg-[#FFFDF9] py-2.5 pl-10 pr-9 text-xs text-[#29231F] shadow-2xs placeholder:text-[#766B61]/70 focus:border-[#7B4E35] focus:outline-none sm:py-3 sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 p-0.5 text-[#73685C] hover:text-[#1E150F]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Café-style category tiles */}
            <div className="flex gap-2.5 overflow-x-auto py-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "flex h-[86px] w-[84px] min-w-[84px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 text-[11px] font-semibold leading-tight transition-all sm:h-20 sm:w-20 sm:min-w-20 sm:text-xs",
                  selectedCategory === "all"
                    ? "border-[#7B4E35] bg-[#7B4E35] text-white shadow-sm"
                    : "border-[#E5DDD1] bg-[#FFFDF9] text-[#51473F] hover:border-[#B89577]"
                )}
              >
                <Coffee className="h-5 w-5 shrink-0" /><span className="line-clamp-2 text-center">All</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex h-[86px] w-[84px] min-w-[84px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 text-[11px] font-semibold leading-tight transition-all sm:h-20 sm:w-20 sm:min-w-20 sm:text-xs",
                    selectedCategory === cat.id
                      ? "border-[#7B4E35] bg-[#7B4E35] text-white shadow-sm"
                      : "border-[#E5DDD1] bg-[#FFFDF9] text-[#51473F] hover:border-[#B89577]"
                  )}
                >
                  {cat.name.toLowerCase().includes("dessert") || cat.name.toLowerCase().includes("sweet") ? <Cake className="h-5 w-5 shrink-0" /> : cat.name.toLowerCase().includes("drink") || cat.name.toLowerCase().includes("coffee") ? <Coffee className="h-5 w-5 shrink-0" /> : <Utensils className="h-5 w-5 shrink-0" />}
                  <span className="line-clamp-2 max-w-full text-center leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: "all", label: "All" },
                  { id: "veg", label: "Veg" },
                  { id: "non_veg", label: "Non-Veg" },
                ].map((diet) => (
                  <button key={diet.id} onClick={() => setDietaryFilter(diet.id)} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", dietaryFilter === diet.id ? "border-[#7B4E35] bg-[#7B4E35] text-white" : "border-[#E5DDD1] bg-[#FFFDF9] text-[#766B61] hover:border-[#B89577]")}>{diet.label}</button>
                ))}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-[#766B61]">Sort
                <select value={menuSort} onChange={(e) => setMenuSort(e.target.value)} className="max-w-[150px] rounded-lg border border-[#E5DDD1] bg-[#FFFDF9] px-2 py-1.5 text-xs text-[#29231F]">
                  <option value="recommended">Recommended</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option><option value="quickest">Quickest</option>
                </select>
              </label>
            </div>

            {dietaryFilter === "all" && selectedCategory === "all" && !searchQuery && (
              <section className="relative flex min-h-[150px] items-center overflow-hidden rounded-2xl bg-[#2A3828] px-5 py-5 text-white shadow-md sm:min-h-[190px] sm:px-6">
                <div className="relative z-10 max-w-[70%] space-y-2">
                  <h2 className="font-serif text-2xl font-bold sm:text-3xl">Seasonal Specials</h2>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D7E2CF] sm:text-[11px]">Handpicked flavours for a limited time</p>
                  <button onClick={() => setDietaryFilter("chef_special")} className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] px-4 py-2 text-xs font-semibold text-[#29231F]">Discover Now <ArrowRight className="h-4 w-4" /></button>
                </div>
                <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=320&q=80" alt="Fresh seasonal salad" className="absolute right-4 h-24 w-24 rounded-full border-4 border-white/20 object-cover sm:right-8 sm:h-36 sm:w-36" />
                <span className="absolute right-5 top-3 font-script text-sm text-[#E2EAD8] sm:right-10 sm:text-lg">Fresh Seasonal Local</span>
              </section>
            )}

            {dietaryFilter === "all" && selectedCategory === "all" && !searchQuery && items.some((item) => item.available && item.dietaryFlags?.some((flag) => ["chef_special", "signature"].includes(flag.toLowerCase()))) && (
              <section>
                <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-2xl font-bold text-[#29231F]">Chef’s Picks</h2><span className="text-xs text-[#7C4D32]">Handpicked</span></div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {items.filter((item) => item.available && item.dietaryFlags?.some((flag) => ["chef_special", "signature"].includes(flag.toLowerCase()))).slice(0, 3).map((item) => {
                    const minPrice = item.variants && item.variants.length > 0
                      ? Math.min(...item.variants.map((v) => Number(v.price)))
                      : Number(item.price);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleOpenItemDetails(item)}
                        className="group overflow-hidden rounded-[20px] border border-[#E5DDD1] bg-[#FFFDF9] text-left shadow-sm transition hover:-translate-y-0.5 cursor-pointer"
                      >
                        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="aspect-[1.15/1] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />}
                        <span className="block p-4">
                          <strong className="font-serif text-base sm:text-lg text-[#1E150F] block break-words whitespace-normal leading-snug">{item.name}</strong>
                          {item.description && <span className="mt-1 block text-xs text-[#766B61] line-clamp-2">{item.description}</span>}
                          <span className="mt-3 block font-bold text-sm text-[#1E150F]">
                            {item.variants && item.variants.length > 0 ? (
                              <span><span className="text-xs font-normal text-[#766B61] mr-1">From</span>{formatINR(minPrice)}</span>
                            ) : (
                              formatINR(item.price)
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Dish Cards List */}
            {menuLoading ? (
              <div className="py-12 text-center text-xs text-[#73685C]">
                <div className="w-7 h-7 rounded-full border-2 border-[#B88223] border-t-transparent animate-spin mx-auto mb-2.5"></div>
                Loading seasonal culinary creations...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-8 text-center my-6 shadow-xs">
                <span className="text-3xl block mb-2">🍽️</span>
                <h3 className="font-serif text-base font-bold text-[#1E150F]">No items match your filter</h3>
                <p className="text-xs text-[#73685C] mt-1">
                  Try adjusting your search query or dietary preferences.
                </p>
              </div>
            ) : (
              <div className="space-y-8 pt-1">
                {itemSections.map((section) => (
                  <section key={section.id} className="space-y-3">
                    {section.title && <div className="flex items-baseline justify-between border-b border-[#E5DDD1] pb-2"><h2 className="font-serif text-[20px] font-bold text-[#29231F] sm:text-2xl">{section.title}</h2><button onClick={() => { if (typeof section.id === "number") setSelectedCategory(section.id); }} className="text-xs font-semibold text-[#7B4E35]">View ({section.items.length}) →</button></div>}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {section.items.map((item) => {
                  const qtyInCart = getItemCartQuantity(item.id);
                  const isAvailable = item.available;
                  const hasVariants = Boolean(item.variants && item.variants.length > 0);
                  const minPrice = hasVariants
                    ? Math.min(...item.variants!.map((v) => Number(v.price)))
                    : Number(item.price);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenItemDetails(item)}
                      className={cn(
                        "bg-[#FFFDF9] border rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(41,35,31,0.03)] card-smooth-press cursor-pointer flex flex-col justify-between transition-all",
                        !isAvailable ? "border-stone-300 opacity-60 bg-stone-50 cursor-not-allowed" : "border-[#E5DDD1] hover:border-[#B89577]"
                      )}
                    >
                      {/* Photo Header */}
                      <div>
                        {item.imageUrl && (
                          <div className="relative aspect-[1.15/1] bg-[#EAE2D5] overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className={cn(
                                "w-full h-full object-cover transition-transform duration-500 hover:scale-105",
                                !isAvailable && "grayscale"
                              )}
                              loading="lazy"
                            />
                            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                              {item.dietaryFlags.map((f) => (
                                <DietaryBadge key={f} tag={f} className="bg-white/95 text-[10px] shadow-sm" />
                              ))}
                            </div>
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-[#1E150F]/65 backdrop-blur-2xs flex items-center justify-center">
                                <span className="px-3.5 py-1 bg-stone-900/90 text-white text-[11px] font-bold rounded-full uppercase tracking-wider border border-white/20">
                                  Sold Out Today
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content Section */}
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              {/* Complete Menu Item Name with natural wrapping and no truncation */}
                              <h3 className="font-serif text-[14px] sm:text-base font-bold leading-snug text-[#29231F] break-words whitespace-normal">
                                {item.name}
                              </h3>
                              {item.dietaryFlags?.length > 0 && !item.imageUrl && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.dietaryFlags.map((f) => (
                                    <DietaryBadge key={f} tag={f} />
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 font-sans text-[14px] sm:text-[15px] font-extrabold text-[#29231F] text-right">
                              {hasVariants ? (
                                <span className="flex flex-col items-end">
                                  <span className="text-[10px] font-normal text-[#766B61] leading-none">From</span>
                                  <span>{formatINR(minPrice)}</span>
                                </span>
                              ) : (
                                formatINR(item.price)
                              )}
                            </span>
                          </div>

                          {item.description && (
                            <p className="mb-2 line-clamp-2 text-[11px] leading-tight text-[#766B61] sm:text-xs sm:leading-snug break-words">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer with Details / Add Controls */}
                      <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1">
                        <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#E5DDD1]/50">
                          <span className="flex items-center gap-1 text-[9px] text-[#766B61] sm:text-[10px]">
                            <Clock className="h-3 w-3 text-[#7B4E35]" />~{item.prepTimeMinutes} min
                          </span>

                          {/* Quick 1-Hand Action Button with stopPropagation */}
                          <div onClick={(e) => e.stopPropagation()}>
                            {!isAvailable ? (
                              <button
                                disabled
                                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-200 text-stone-500 cursor-not-allowed"
                              >
                                Unavailable
                              </button>
                            ) : hasVariants || (item.modifiers && item.modifiers.length > 0) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenItemDetails(item);
                                }}
                                className="flex min-h-8 items-center gap-1.5 rounded-full bg-[#7B4E35] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-[#633D28] btn-smooth-press cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-white" />
                                <span>{hasVariants ? "Options" : "Customize"}</span>
                                {qtyInCart > 0 && (
                                  <span className="w-4 h-4 rounded-full bg-[#B88223] text-white text-[10px] flex items-center justify-center font-mono ml-0.5">
                                    {qtyInCart}
                                  </span>
                                )}
                              </button>
                            ) : qtyInCart > 0 ? (
                              /* In-card quick stepper */
                              <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#E5DDD1]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const match = cart.find((c) => c.item.id === item.id);
                                    if (match) updateCartQuantity(match.cartItemId, -1);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-95 cursor-pointer shadow-2xs"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono text-xs font-bold w-5 text-center">
                                  {qtyInCart}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(item, null, [], "", 1);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-95 cursor-pointer shadow-2xs"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item, null, [], "", 1);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7B4E35] text-sm font-bold text-white shadow-2xs transition-colors hover:bg-[#633D28] cursor-pointer"
                                title="Add to cart"
                              >
                                <Plus className="h-4 w-4 text-white" />
                                <span className="sr-only">Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────────────── TAB 2: MY ORDERS TRACKING ──────────────── */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DDD1]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E6314]">
                  Suite {stayData.room?.roomNumber}
                </span>
                <h2 className="font-serif text-xl font-bold text-[#1E150F]">
                  Order History & Status
                </h2>
              </div>
              <button
                onClick={() => fetchOrdersData()}
                className="text-xs text-[#73685C] hover:text-[#1E150F] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] btn-smooth-press"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Active Orders Section */}
            {activeOrders.length === 0 ? (
              <div className="p-8 bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E5DDD1] text-[#B88223] flex items-center justify-center mx-auto mb-3">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#1E150F]">No Active Orders</h3>
                <p className="text-xs text-[#73685C] mt-1 mb-4">
                  You have no pending culinary tickets in preparation.
                </p>
                <button
                  onClick={() => setActiveTab("menu")}
                  className="px-5 py-2.5 bg-[#1E150F] text-white text-xs font-bold rounded-xl btn-smooth-press shadow-xs"
                >
                  Explore In-Room Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E6314] block">
                  Active in Kitchen ({activeOrders.length})
                </span>

                {activeOrders.map((ord) => {
                  const currentStageIdx = ORDER_STAGES.findIndex((s) => s.key === ord.status);
                  const isPending = ord.status === "pending";

                  return (
                    <div
                      key={ord.id}
                      className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-5 shadow-xs space-y-4"
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#B88223]">
                            {ord.order_number}
                          </span>
                          <span className="block text-[11px] text-[#73685C] mt-0.5">
                            Placed {new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <StatusBadge status={ord.status} />
                      </div>

                      {/* 5-Stage Stepper matching cafe order tracker */}
                      <div className="py-2">
                        <div className="relative flex items-center justify-between">
                          <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-[#EAE2D5] -z-0">
                            <div
                              className="h-full bg-[#B88223] transition-all duration-500"
                              style={{
                                width: `${(Math.max(0, currentStageIdx) / (ORDER_STAGES.length - 1)) * 100}%`,
                              }}
                            />
                          </div>

                          {ORDER_STAGES.map((stg, i) => {
                            const isDone = currentStageIdx > i;
                            const isCurr = currentStageIdx === i;

                            return (
                              <div key={stg.key} className="flex flex-col items-center relative z-10">
                                <div
                                  className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shadow-2xs",
                                    isDone
                                      ? "bg-[#B88223] text-white"
                                      : isCurr
                                      ? "bg-[#1E150F] text-[#B88223] ring-3 ring-[#B88223]/25"
                                      : "bg-[#FAF8F5] text-[#73685C] border border-[#E5DDD1]"
                                  )}
                                >
                                  {isDone ? "✓" : i + 1}
                                </div>
                                <span
                                  className={cn(
                                    "text-[9px] font-semibold mt-1 text-center max-w-[50px] truncate",
                                    isCurr ? "text-[#1E150F]" : "text-[#73685C]"
                                  )}
                                >
                                  {stg.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Current Status Explainer */}
                      <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1]/70 text-xs text-[#1E150F] flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#B88223] animate-ping shrink-0" />
                        <span className="font-medium text-[11px]">
                          {ORDER_STAGES[currentStageIdx]?.desc || "Preparing your culinary order."}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-[#E5DDD1]/70 text-xs">
                        {ord.items?.map((it: any, idx: number) => (
                          <div key={idx} className="py-2.5 flex justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[#1E150F]">
                                  {it.quantity}× {it.itemName}
                                </span>
                                {it.variantName && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                                    {it.variantName}
                                  </span>
                                )}
                              </div>
                              {it.selectedModifiers && it.selectedModifiers.length > 0 && (
                                <p className="text-[10px] text-[#73685C]">
                                  {it.selectedModifiers.map((m: any) => m.name).join(", ")}
                                </p>
                              )}
                              {it.notes && (
                                <p className="text-[10px] text-[#825C15] italic">Note: {it.notes}</p>
                              )}
                            </div>
                            <span className="font-sans text-[11px] font-extrabold text-[#29231F]">
                              {formatINR(it.lineTotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Delivery Instructions */}
                      {ord.special_instructions && (
                        <div className="text-[11px] text-[#73685C] bg-[#FAF8F5] p-3 rounded-2xl border border-[#E5DDD1]/60">
                          <span className="font-bold text-[#1E150F]">Delivery Note: </span>
                          {ord.special_instructions}
                        </div>
                      )}

                      {/* Folio Total & Cancel Action */}
                      <div className="pt-3 border-t border-[#E5DDD1] flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-[#73685C] block">Folio Charge</span>
                          <span className="font-sans text-[14px] font-extrabold text-[#29231F] sm:text-[15px]">
                            {formatINR(ord.total_amount)}
                          </span>
                        </div>

                        {isPending && (
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            disabled={cancellingOrderId === ord.id}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 btn-smooth-press cursor-pointer"
                          >
                            {cancellingOrderId === ord.id ? "Cancelling..." : "Cancel Order"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Past Orders Section */}
            {pastOrders.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#E5DDD1]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73685C] block">
                  Delivered & Completed ({pastOrders.length})
                </span>

                <div className="space-y-3">
                  {pastOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl text-xs space-y-2 opacity-90 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-semibold text-[#73685C]">
                          {ord.order_number}
                        </span>
                        <StatusBadge status={ord.status} />
                      </div>

                      <p className="text-[11px] text-[#73685C]">
                        {ord.items?.map((it: any) => `${it.quantity}× ${it.itemName}${it.variantName ? ` (${it.variantName})` : ""}`).join(", ")}
                      </p>

                      <div className="flex justify-between items-center pt-2 border-t border-[#E5DDD1]/60 text-[11px]">
                        <span className="text-[#73685C]">
                          {new Date(ord.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="font-sans text-[14px] font-extrabold text-[#29231F] sm:text-[15px]">
                          {formatINR(ord.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orders.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-[#E5DDD1] bg-[#FAF3E6] px-4 py-3.5">
                <span className="text-sm font-semibold text-[#51473F]">Total for this stay</span>
                <span className="font-sans text-[14px] font-extrabold text-[#29231F] sm:text-[15px]">
                  {formatINR(billableOrdersTotal)}
                </span>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>

      <nav aria-label="Guest navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5DDD1] bg-[#FFFDF9]/95 px-4 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <button
            onClick={() => {
              setServiceMode("hub");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn("flex flex-col items-center gap-0.5 py-1.5 text-[11px]", serviceMode === "hub" ? "font-semibold text-[#7C4D32]" : "text-[#766B61]")}
          >
            <Home className="h-5 w-5" />
            Services
            {serviceMode === "hub" && <span className="h-1 w-1 rounded-full bg-[#7C4D32]" />}
          </button>
          <button
            onClick={() => {
              setServiceMode("room-service");
              setActiveTab("menu");
            }}
            className={cn("flex flex-col items-center gap-0.5 py-1.5 text-[11px]", serviceMode === "room-service" && activeTab === "menu" ? "font-semibold text-[#7C4D32]" : "text-[#766B61]")}
          >
            <Utensils className="h-5 w-5" />
            In Room Dining
            {serviceMode === "room-service" && activeTab === "menu" && <span className="h-1 w-1 rounded-full bg-[#7C4D32]" />}
          </button>
          <button
            onClick={() => {
              setServiceMode("housekeeping");
            }}
            className={cn("flex flex-col items-center gap-0.5 py-1.5 text-[11px]", serviceMode === "housekeeping" ? "font-semibold text-[#7C4D32]" : "text-[#766B61]")}
          >
            <Sparkles className="h-5 w-5" />
            Room Service
            {serviceMode === "housekeeping" && <span className="h-1 w-1 rounded-full bg-[#7C4D32]" />}
          </button>
        </div>
      </nav>

      {/* ── Floating Mobile Cart Bar (Sticky Bottom) ── */}
      {cart.length > 0 && serviceMode === "room-service" && activeTab === "menu" && (
        <div className="fixed bottom-[5.2rem] inset-x-0 z-30 px-4 max-w-md mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#7C4D32] text-white p-3.5 rounded-full shadow-2xl flex items-center justify-between border border-[#B89577] hover:bg-[#5D3825] transition-all cursor-pointer btn-smooth-press"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#B88223] text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">
                {totalCartCount}
              </div>
              <div className="text-left">
                <span className="block text-[10px] uppercase tracking-wider text-[#D5C9B8] font-bold">
                  Suite {stayData.room?.roomNumber} Cart
                </span>
                <span className="font-serif text-sm font-bold">Review Order</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-bold">{formatINR(subtotal)}</span>
              <ArrowRight className="w-4 h-4 text-[#B88223]" />
            </div>
          </button>
        </div>
      )}

      {/* ── Rich Details View & Item Customizer Modal ── */}
      <Modal
        isOpen={Boolean(viewingItemDetails)}
        onClose={() => setViewingItemDetails(null)}
        title=""
      >
        {viewingItemDetails && (() => {
          const item = viewingItemDetails;
          const currentBasePrice = detailSelectedVariant ? Number(detailSelectedVariant.price) : Number(item.price);
          const modTotal = Object.values(detailSelectedMods).reduce((acc, m) => acc + Number(m.priceDelta), 0);
          const singleUnitPrice = currentBasePrice + modTotal;
          const currentLineTotal = singleUnitPrice * detailQuantity;

          const modGroups: Record<string, ItemModifier[]> = {};
          if (item.modifiers) {
            item.modifiers.forEach((m) => {
              if (!modGroups[m.groupName]) modGroups[m.groupName] = [];
              modGroups[m.groupName].push(m);
            });
          }

          return (
            <div className="space-y-4 text-xs">
              {/* Full Image */}
              {item.imageUrl && (
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#EAE2D5] -mt-2 shadow-xs">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    {item.dietaryFlags?.map((f) => (
                      <DietaryBadge key={f} tag={f} className="bg-white/95 text-[10px] shadow-sm" />
                    ))}
                  </div>
                </div>
              )}

              {/* Title, Badges, Prep Time & Price */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold leading-snug text-[#1E150F] break-words whitespace-normal">
                    {item.name}
                  </h2>
                  <div className="shrink-0 text-right">
                    <span className="font-serif text-lg sm:text-xl font-bold text-[#1E150F]">
                      {formatINR(singleUnitPrice)}
                    </span>
                    {detailSelectedVariant && (
                      <span className="block text-[10px] font-medium text-[#766B61]">
                        {detailSelectedVariant.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#766B61] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#E5DDD1]">
                    <Clock className="w-3 h-3 text-[#B88223]" />
                    ~{item.prepTimeMinutes} mins prep
                  </span>
                  {item.dietaryFlags?.map((f) => (
                    <DietaryBadge key={f} tag={f} />
                  ))}
                </div>

                {item.description && (
                  <p className="mt-2.5 text-xs text-[#73685C] leading-relaxed break-words whitespace-normal">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Sizes / Variants Selection */}
              {item.variants && item.variants.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#E5DDD1]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                      Select Portion / Size
                    </label>
                    <span className="text-[10px] text-[#8E6314] font-semibold">Required</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {item.variants.map((v) => {
                      const isSelected = detailSelectedVariant?.id === v.id || (!detailSelectedVariant && v.id === item.variants![0].id);
                      return (
                        <button
                          key={v.id || v.name}
                          type="button"
                          disabled={!v.available}
                          onClick={() => setDetailSelectedVariant(v)}
                          className={cn(
                            "flex flex-col p-3 rounded-2xl border text-left transition-all btn-smooth-press cursor-pointer",
                            !v.available && "opacity-50 cursor-not-allowed bg-stone-100 border-stone-200",
                            isSelected
                              ? "bg-[#FAF3E6] border-[#B88223] text-[#1E150F] shadow-2xs ring-1 ring-[#B88223]/40"
                              : "bg-[#FAF8F5] border-[#E5DDD1] text-[#73685C] hover:bg-[#F2ECE1]"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-serif font-bold text-xs text-[#1E150F]">{v.name}</span>
                            <span className="font-mono text-xs font-bold text-[#8E6314]">
                              {formatINR(v.price)}
                            </span>
                          </div>
                          {!v.available && (
                            <span className="text-[9px] text-red-600 font-semibold mt-0.5">Sold Out</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifiers / Add-ons */}
              {Object.entries(modGroups).map(([groupName, mods]) => (
                <div key={groupName} className="space-y-2 pt-3 border-t border-[#E5DDD1]">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                    {groupName}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {mods.map((mod) => {
                      const isSelected = detailSelectedMods[groupName]?.id === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() =>
                            setDetailSelectedMods((prev) => ({
                              ...prev,
                              [groupName]: mod,
                            }))
                          }
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border text-xs font-medium transition-all text-left btn-smooth-press min-h-[44px] cursor-pointer",
                            isSelected
                              ? "bg-[#FAF3E6] border-[#ECD7A9] text-[#8E6314] shadow-2xs"
                              : "bg-[#FAF8F5] border-[#E5DDD1] text-[#73685C] hover:bg-[#F0ECE1]"
                          )}
                        >
                          <span className="font-semibold text-[#1E150F]">{mod.name}</span>
                          <span className="font-mono text-xs font-bold text-[#8E6314]">
                            {Number(mod.priceDelta) > 0 ? `+${formatINR(mod.priceDelta)}` : "Included"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Special Requests */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                  Special Requests / In-Suite Preparation Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra hot, dressing on the side, no onions..."
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                />
              </div>

              {/* Quantity Stepper & Add Button */}
              <div className="pt-3 border-t border-[#E5DDD1] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-2xl border border-[#E5DDD1]">
                  <button
                    type="button"
                    onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-xl bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-95 cursor-pointer shadow-2xs"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-sm font-bold w-6 text-center">
                    {detailQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-xl bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-95 cursor-pointer shadow-2xs"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(
                      item,
                      detailSelectedVariant,
                      Object.values(detailSelectedMods),
                      detailNotes,
                      detailQuantity
                    );
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] shadow-md flex items-center justify-between min-h-[46px] btn-smooth-press cursor-pointer"
                >
                  <span>Add to Order</span>
                  <span className="font-mono font-bold text-sm text-[#ECD7A9]">
                    {formatINR(currentLineTotal)}
                  </span>
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Cart Review & Order Placement Modal ── */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title={`Suite ${stayData.room?.roomNumber} Cart`}
        description="Review your culinary order and delivery requests"
      >
        <div className="space-y-5 text-xs">
          {/* Cart Items List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {cart.map((line) => (
              <div
                key={line.cartItemId}
                className="p-3.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-serif font-bold text-sm text-[#1E150F]">
                        {line.item.name}
                      </span>
                      {line.variantName && (
                        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                          {line.variantName}
                        </span>
                      )}
                    </div>
                    <span className="font-serif font-bold text-xs text-[#1E150F] shrink-0 ml-1">
                      {formatINR(line.lineTotal)}
                    </span>
                  </div>
                  {line.selectedModifiers.length > 0 && (
                    <p className="text-[10px] text-[#73685C] truncate mt-0.5">
                      {line.selectedModifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {line.notes && (
                    <p className="text-[10px] text-[#825C15] italic truncate mt-0.5">Note: {line.notes}</p>
                  )}
                </div>

                {/* Steppers */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateCartQuantity(line.cartItemId, -1)}
                    className="w-7 h-7 rounded-lg bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-90 cursor-pointer shadow-2xs"
                    aria-label="Decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs font-bold w-4 text-center">
                    {line.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(line.cartItemId, 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-90 cursor-pointer shadow-2xs"
                    aria-label="Increase"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Special Instructions */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Suite Delivery Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Please leave on the balcony table, knock softly..."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          {/* Bill Breakdown */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl space-y-2 text-[11px]">
            <div className="flex justify-between text-[#73685C]">
              <span>Culinary Subtotal</span>
              <span className="font-mono font-medium">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#73685C]">
              <span>Resort Tax ({property?.taxRatePercent || 10}%)</span>
              <span className="font-mono font-medium">{formatINR(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-[#73685C]">
              <span>In-Room Service Charge ({property?.serviceChargePercent || 5}%)</span>
              <span className="font-mono font-medium">{formatINR(serviceCharge)}</span>
            </div>
            <div className="pt-2.5 border-t border-[#E5DDD1] flex justify-between font-bold text-sm text-[#1E150F]">
              <span className="font-serif">Total to Room Folio</span>
              <span className="font-serif text-lg font-bold text-[#1E150F]">
                {formatINR(totalAmount)}
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmittingOrder || cart.length === 0}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[46px] btn-smooth-press"
          >
            {isSubmittingOrder ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Transmitting to Kitchen...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#B88223]" />
                Confirm Order to Suite {stayData.room?.roomNumber}
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* ── Housekeeping Request Confirmation Modal ── */}
      <Modal
        isOpen={Boolean(selectedHkService)}
        onClose={() => {
          if (!isSubmittingHk) {
            setSelectedHkService(null);
            setHkGuestNote("");
          }
        }}
        title=""
      >
        {selectedHkService && (
          <div className="space-y-4 text-xs">
            <div className="text-center pt-1 pb-2 border-b border-[#E5DDD1]">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF3E6] border border-[#ECD7A9] text-[#8E6314] flex items-center justify-center mx-auto mb-2 shadow-2xs">
                {React.createElement(selectedHkService.icon, { className: "w-6 h-6" })}
              </div>
              <h3 className="font-serif text-lg font-bold text-[#1E150F]">
                {selectedHkService.title}
              </h3>
              <p className="text-xs text-[#73685C] mt-0.5">
                {selectedHkService.desc}
              </p>
            </div>

            <div className="bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#73685C]">Destination Suite:</span>
                <span className="font-bold text-[#1E150F]">Suite {stayData.room?.roomNumber}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#73685C]">Guest Name:</span>
                <span className="font-semibold text-[#1E150F]">{stayData.guestName}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#73685C]">Service Charge:</span>
                <span className="font-semibold text-emerald-700">Complimentary In-Suite Care</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Special Instructions or Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Please leave fresh towels on bathroom vanity, or deliver in 20 minutes..."
                value={hkGuestNote}
                onChange={(e) => setHkGuestNote(e.target.value)}
                className="w-full p-3 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30 placeholder-[#73685C]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingHk}
                onClick={() => {
                  setSelectedHkService(null);
                  setHkGuestNote("");
                }}
                className="flex-1 py-3 rounded-2xl border border-[#E5DDD1] text-xs font-semibold text-[#73685C] hover:bg-[#FAF8F5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingHk}
                onClick={handleConfirmHousekeepingRequest}
                className="flex-1 py-3 rounded-2xl bg-[#54321E] hover:bg-[#3D2314] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingHk ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-[#ECD7A9]" />
                    <span>Transmitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#ECD7A9]" />
                    <span>Confirm Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
