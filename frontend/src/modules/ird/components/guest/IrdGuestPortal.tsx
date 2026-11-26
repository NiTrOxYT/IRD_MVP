import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { SuiteCareBellIcon } from "../../../../core/ui/CustomResortIcons";
import { useIrdAdapter } from "../../adapter";
import { PageTransition } from "../../../../core/ui/MotionPrimitives";
import type {
  CartLineItem,
  Category,
  IrdHeroCard,
  IrdPropertyConfig,
  ItemModifier,
  MenuItem,
  MenuItemVariant,
  Order,
} from "../../types";
import { IrdMenuBrowser } from "./IrdMenuBrowser";
import { IrdOrdersTracker } from "./IrdOrdersTracker";
import { IrdItemDetailsModal } from "./IrdItemDetailsModal";
import { IrdCartModal } from "./IrdCartModal";

export interface IrdGuestPortalProps {
  roomNumber?: string;
  property?: IrdPropertyConfig | null;
  activeTab?: "menu" | "orders";
  onTabChange?: (tab: "menu" | "orders") => void;
  cart?: CartLineItem[];
  onCartChange?: React.Dispatch<React.SetStateAction<CartLineItem[]>>;
  isCartOpen?: boolean;
  onCartOpenChange?: (open: boolean) => void;
  orders?: Order[];
  onOrdersRefresh?: () => Promise<void>;
  onBackToHub?: () => void;
  onSwitchToRoomService?: () => void;
}

export function IrdGuestPortal({
  roomNumber,
  property,
  activeTab: controlledTab,
  onTabChange,
  cart: controlledCart,
  onCartChange,
  isCartOpen: controlledCartOpen,
  onCartOpenChange,
  orders: controlledOrders,
  onOrdersRefresh,
  onBackToHub,
  onSwitchToRoomService,
}: IrdGuestPortalProps) {
  const { api, realtime, formatPrice, playChime } = useIrdAdapter();

  const [internalTab, setInternalTab] = useState<"menu" | "orders">("menu");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const [internalCart, setInternalCart] = useState<CartLineItem[]>([]);
  const cart = controlledCart ?? internalCart;
  const setCart = onCartChange ?? setInternalCart;

  const [internalCartOpen, setInternalCartOpen] = useState(false);
  const isCartOpen = controlledCartOpen ?? internalCartOpen;
  const setIsCartOpen = onCartOpenChange ?? setInternalCartOpen;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [heroCards, setHeroCards] = useState<IrdHeroCard[]>(() => property?.diningHeroCards ?? []);
  const [menuLoading, setMenuLoading] = useState(false);

  const [internalOrders, setInternalOrders] = useState<Order[]>([]);
  const orders = controlledOrders ?? internalOrders;

  const [viewingItemDetails, setViewingItemDetails] = useState<MenuItem | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (property?.diningHeroCards && property.diningHeroCards.length > 0 && heroCards.length === 0) {
      setHeroCards(property.diningHeroCards);
    }
  }, [property?.diningHeroCards, heroCards.length]);

  const fetchMenuData = useCallback(async () => {
    setMenuLoading(true);
    try {
      const res = await api.getGuestMenu();
      setCategories(res.categories);
      setItems(res.items);
      if (Array.isArray(res.heroCards)) {
        setHeroCards(res.heroCards);
      }
    } catch (err) {
      console.error("[IRD] Menu fetch error:", err);
    } finally {
      setMenuLoading(false);
    }
  }, [api]);

  const fetchOrdersData = useCallback(async () => {
    if (onOrdersRefresh) {
      await onOrdersRefresh();
      return;
    }
    try {
      const res = await api.getStayOrders();
      setInternalOrders(res.orders);
    } catch (err) {
      console.error("[IRD] Orders fetch error:", err);
    }
  }, [api, onOrdersRefresh]);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  // Standalone realtime subscription if orders are not controlled by a parent shell
  useEffect(() => {
    if (controlledOrders !== undefined) return;
    fetchOrdersData();
    const unsubCreated = realtime.onOrderCreated(() => fetchOrdersData());
    const unsubChanged = realtime.onOrderStatusChanged(() => {
      playChime();
      fetchOrdersData();
    });
    return () => {
      unsubCreated();
      unsubChanged();
    };
  }, [controlledOrders, fetchOrdersData, playChime, realtime]);

  const handleOpenItemDetails = (item: MenuItem) => {
    if (!item.available) return;
    setViewingItemDetails(item);
  };

  const addToCart = (
    item: MenuItem,
    variant: MenuItemVariant | null = null,
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

    setViewingItemDetails(null);
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.cartItemId === cartItemId) {
            const nextQty = line.quantity + delta;
            return nextQty > 0
              ? { ...line, quantity: nextQty, lineTotal: nextQty * line.unitPrice }
              : null;
          }
          return line;
        })
        .filter(Boolean) as CartLineItem[]
    );
  };

  const totalCartCount = useMemo(() => cart.reduce((acc, c) => acc + c.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((acc, c) => acc + c.lineTotal, 0), [cart]);
  const taxAmount = useMemo(() => {
    const rate = property?.taxRatePercent !== undefined ? Number(property.taxRatePercent) / 100 : 0.1;
    return subtotal * rate;
  }, [subtotal, property?.taxRatePercent]);
  const serviceCharge = useMemo(() => {
    const rate =
      property?.serviceChargePercent !== undefined ? Number(property.serviceChargePercent) / 100 : 0.05;
    return subtotal * rate;
  }, [subtotal, property?.serviceChargePercent]);
  const totalAmount = useMemo(() => subtotal + taxAmount + serviceCharge, [subtotal, taxAmount, serviceCharge]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    try {
      await api.placeOrder({
        items: cart.map((c) => ({
          menuItemId: c.item.id,
          variantId: c.variantId || undefined,
          quantity: c.quantity,
          modifierIds: c.selectedModifiers.map((m) => m.id),
          notes: c.notes,
        })),
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
      await api.cancelGuestOrder(orderId);
      await fetchOrdersData();
    } catch (err: any) {
      alert("Cancellation failed: " + err.message);
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <>
      {(onBackToHub || onSwitchToRoomService) && (
        <div className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl flex items-center justify-between gap-2 pb-1">
          {onBackToHub ? (
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#E5D7C6] bg-[#FFFBF6] text-[#3D1C11] hover:bg-[#F3E7DA] btn-smooth-press-sm"
            >
              <ChevronLeft size={16} /> All Services
            </button>
          ) : (
            <span />
          )}
          {onSwitchToRoomService && (
            <button
              type="button"
              onClick={onSwitchToRoomService}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[#E5D7C6] bg-[#FFFBF6] text-[#5B4137] hover:bg-[#F3E7DA] btn-smooth-press-sm"
            >
              <SuiteCareBellIcon className="w-3.5 h-3.5 text-[#C44D27]" /> Suite Care
            </button>
          )}
        </div>
      )}

      <PageTransition
        viewKey={activeTab}
        direction={activeTab === "orders" ? "forward" : "back"}
      >
        {activeTab === "menu" ? (
          <IrdMenuBrowser
            roomNumber={roomNumber}
            categories={categories}
            items={items}
            heroCards={heroCards}
            menuLoading={menuLoading}
            property={property}
            cart={cart}
            onOpenItemDetails={handleOpenItemDetails}
            onQuickAdd={(item) => addToCart(item, null, [], "", 1)}
            onUpdateCartQuantity={updateCartQuantity}
            onSwitchToRoomService={onSwitchToRoomService}
          />
        ) : (
          <IrdOrdersTracker
            roomNumber={roomNumber}
            orders={orders}
            property={property}
            cancellingOrderId={cancellingOrderId}
            onRefresh={fetchOrdersData}
            onCancelOrder={handleCancelOrder}
            onExploreMenu={() => setActiveTab("menu")}
          />
        )}
      </PageTransition>

      {cart.length > 0 && activeTab === "menu" && (
        <div className="fixed bottom-[calc(4.9rem+env(safe-area-inset-bottom))] inset-x-0 z-30 px-3.5 max-w-md mx-auto zomato-cart-enter">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full border border-[#E2D4C4] bg-[#3D1C11] text-white px-4 py-3 rounded-[22px] shadow-[0_14px_30px_-8px_rgba(61,28,17,0.45)] flex items-center justify-between cursor-pointer btn-smooth-press"
          >
            <div className="flex items-center gap-3">
              <div
                key={totalCartCount}
                className="h-9 min-w-9 px-2.5 rounded-full bg-[#C44D27] text-white flex items-center justify-center font-bold text-xs font-mono tabular-nums zomato-qty-pop"
              >
                {totalCartCount} {totalCartCount === 1 ? "item" : "items"}
              </div>
              <div className="text-left">
                <span className="block text-[10px] uppercase tracking-wider text-white/75 font-bold tabular-nums">
                  Suite {roomNumber} · {formatPrice(subtotal)}
                </span>
                <span className="font-sans text-xs font-semibold text-white">Tap to review order</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-[#FFFBF6] text-[#3D1C11] px-3.5 py-1.5 font-bold text-xs">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C44D27]" />
            </div>
          </button>
        </div>
      )}

      <IrdItemDetailsModal
        item={viewingItemDetails}
        onClose={() => setViewingItemDetails(null)}
        onAddToCart={addToCart}
      />

      <IrdCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        roomNumber={roomNumber}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        deliveryNotes={deliveryNotes}
        onDeliveryNotesChange={setDeliveryNotes}
        subtotal={subtotal}
        taxAmount={taxAmount}
        serviceCharge={serviceCharge}
        totalAmount={totalAmount}
        property={property}
        isSubmitting={isSubmittingOrder}
        onSubmitOrder={handlePlaceOrder}
      />
    </>
  );
}
