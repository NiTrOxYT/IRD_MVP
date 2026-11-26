import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Mail, Search } from "lucide-react";
import { StaySessionProvider, useStaySession } from "../core/stay/StaySessionContext";
import { SuiteLoader } from "../core/stay/SuiteLoader";
import { StayRequiredCard } from "../core/stay/StayRequiredCard";
import { GuestWelcomeLetter } from "../core/stay/GuestWelcomeLetter";
import { GuestHeader } from "../core/stay/GuestHeader";
import { GuestServiceHub, type GuestServiceTile } from "../core/stay/GuestServiceHub";
import { usePropertyLogo } from "../core/property/useProperty";
import { playOrderChime } from "../core/ui/audio";
import {
  LandmarkCompassIcon,
  ResortVillaIcon,
  SilverClocheTrayIcon,
  SuiteCareBellIcon,
  SuiteOrderBagIcon,
} from "../core/ui/CustomResortIcons";
import { gsap, smoothScrollToTarget } from "../core/ui/gsap";
import { PageTransition } from "../core/ui/MotionPrimitives";
import { cn } from "../core/ui/utils";
import {
  IrdGuestPortal,
  irdApi,
  irdRealtime,
  type CartLineItem,
  type Order,
} from "../modules/ird";
import {
  RoomServiceGuestPortal,
  roomServiceApi,
  roomServiceRealtime,
  type HousekeepingRequest,
} from "../modules/room-service";
import { AttractionsGuestPortal } from "../modules/attractions";
import { FaqGuestSection } from "../modules/faq";
import {
  InboxGuestPortal,
  inboxApi,
  inboxRealtime,
  type GuestInboxMessage,
} from "../modules/inbox";

function GuestPortalContent() {
  const loadingLogo = usePropertyLogo();
  const { stay, property, authLoading, authError, connStatus } = useStaySession();

  const [serviceMode, setServiceMode] = useState<
    "hub" | "room-service" | "housekeeping" | "attractions" | "inbox"
  >(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get("service");
    if (serviceParam === "inbox" || window.location.pathname === "/stay/inbox") {
      return "inbox";
    }
    if (serviceParam === "attractions" || window.location.pathname === "/stay/attractions") {
      return "attractions";
    }
    if (serviceParam === "housekeeping" || window.location.pathname === "/stay/housekeeping") {
      return "housekeeping";
    }
    if (
      serviceParam === "menu" ||
      serviceParam === "room-service" ||
      window.location.pathname === "/stay/menu"
    ) {
      return "room-service";
    }
    return "hub";
  });

  const [irdTab, setIrdTab] = useState<"menu" | "orders">("menu");
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [housekeepingRequests, setHousekeepingRequests] = useState<HousekeepingRequest[]>([]);
  const [inboxMessages, setInboxMessages] = useState<GuestInboxMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  useEffect(() => {
    document.title = property?.name ? `${property.name} · In-Room Dining` : "In-Room Dining";
  }, [property?.name]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await irdApi.getStayOrders();
      setOrders(res.orders);
    } catch (err) {
      console.error("[Guest] Orders fetch error:", err);
    }
  }, []);

  const fetchHousekeeping = useCallback(async () => {
    try {
      const res = await roomServiceApi.getGuestHousekeepingRequests();
      if (res.success) {
        setHousekeepingRequests(res.requests);
      }
    } catch (err) {
      console.error("[Guest] Housekeeping fetch error:", err);
    }
  }, []);

  const fetchInbox = useCallback(async (showSpinner = false) => {
    if (showSpinner) setInboxLoading(true);
    try {
      const res = await inboxApi.getGuestMessages();
      if (res.success) {
        setInboxMessages(res.messages);
      }
    } catch (err) {
      console.error("[Guest] Inbox fetch error:", err);
    } finally {
      if (showSpinner) setInboxLoading(false);
    }
  }, []);

  const handleMarkInboxRead = useCallback(async (messageId: number) => {
    setInboxMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m))
    );
    try {
      await inboxApi.markMessageRead(messageId);
    } catch (err) {
      console.error("[Guest] Mark inbox read error:", err);
    }
  }, []);

  const handleMarkAllInboxRead = useCallback(async () => {
    setInboxMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    try {
      await inboxApi.markAllRead();
    } catch (err) {
      console.error("[Guest] Mark all inbox read error:", err);
    }
  }, []);

  useEffect(() => {
    if (!stay?.id) return;

    fetchOrders();
    fetchHousekeeping();
    fetchInbox(true);

    const unsubOrderCreated = irdRealtime.onOrderCreated(() => fetchOrders());
    const unsubOrderChanged = irdRealtime.onOrderStatusChanged(() => {
      playOrderChime();
      fetchOrders();
    });
    const unsubHkCreated = roomServiceRealtime.onHousekeepingCreated((req) => {
      setHousekeepingRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
    });
    const unsubHkStatus = roomServiceRealtime.onHousekeepingStatusChanged((data) => {
      const updated = data.request;
      setHousekeepingRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    });
    const unsubInbox = inboxRealtime.onMessageReceived((msg) => {
      playOrderChime();
      setInboxMessages((prev) => [msg, ...prev.filter((m) => m.id !== msg.id)]);
    });

    const pollInterval = setInterval(() => {
      fetchOrders();
      fetchHousekeeping();
      fetchInbox(false);
    }, 5000);

    return () => {
      unsubOrderCreated();
      unsubOrderChanged();
      unsubHkCreated();
      unsubHkStatus();
      unsubInbox();
      clearInterval(pollInterval);
    };
  }, [stay?.id, fetchOrders, fetchHousekeeping, fetchInbox]);

  const unreadInboxCount = useMemo(
    () => inboxMessages.filter((m) => !m.isRead).length,
    [inboxMessages]
  );

  const totalCartCount = useMemo(() => cart.reduce((acc, c) => acc + c.quantity, 0), [cart]);
  const activeOrders = useMemo(
    () =>
      orders.filter((o) =>
        ["pending", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.status)
      ),
    [orders]
  );
  const activeHkRequests = useMemo(
    () =>
      housekeepingRequests.filter((r) => ["pending", "accepted", "in_progress"].includes(r.status)),
    [housekeepingRequests]
  );

  const hubServices = useMemo<GuestServiceTile[]>(
    () => [
      {
        id: "ird",
        badge: "IN-ROOM DINING",
        title: "In Room Dining",
        subtitle: "Artisanal Culinary Service",
        description:
          "Freshly prepared delicacies, chef specials, artisanal coffees, snacks, and private suite dining delivered to your door.",
        ctaLabel: "Browse Menu & Order",
        imageSrc: "/in-room-dining-card.jpg",
        icon: <SilverClocheTrayIcon className="w-6 h-6 text-[#ECD7A9]" />,
        iconWrapperClassName:
          "w-12 h-12 rounded-2xl bg-[#54321E] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform",
        activeBadgeText: totalCartCount > 0 ? `${totalCartCount} in cart` : null,
        statusSummaryText:
          activeOrders.length > 0
            ? `In Room Dining: ${activeOrders[0].status.replace(/_/g, " ")} (${activeOrders.length})`
            : null,
        statusActionLabel: activeOrders.length > 0 ? "View Order →" : null,
        onStatusAction: () => {
          setServiceMode("room-service");
          setIrdTab("orders");
        },
        onSelect: () => setServiceMode("room-service"),
      },
      {
        id: "room-service",
        badge: "ROOM SERVICE",
        title: "Room Service",
        subtitle: "Suite Refresh & Amenities",
        description:
          "Request room cleaning, fresh towels, luxury toiletries, fresh bed linen, extra pillows, evening turndown, or luggage assistance.",
        ctaLabel: "Request Room Service",
        imageSrc: "/room-service-card.jpg",
        icon: <SuiteCareBellIcon className="w-6 h-6 text-[#ECD7A9]" />,
        iconWrapperClassName:
          "w-12 h-12 rounded-2xl bg-[#29231F] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform",
        activeBadgeText: activeHkRequests.length > 0 ? `${activeHkRequests.length} active` : null,
        statusSummaryText:
          activeHkRequests.length > 0
            ? `Room Service: ${activeHkRequests[0].status.replace(/_/g, " ")} (${activeHkRequests.length})`
            : null,
        statusActionLabel: activeHkRequests.length > 0 ? "View Room Service →" : null,
        onStatusAction: () => setServiceMode("housekeeping"),
        onSelect: () => setServiceMode("housekeeping"),
      },
      {
        id: "attractions",
        badge: "LOCAL ATTRACTIONS",
        title: "Local Attractions",
        subtitle: "Nearby Sightseeing & Experiences",
        description:
          "Discover scenic landmarks with photos, videos, 5-star ratings, cab fares, entry fees, and curated sightseeing packages.",
        ctaLabel: "Explore Attractions",
        imageSrc: "/suite-welcome-card.jpg",
        icon: <LandmarkCompassIcon className="w-6 h-6 text-[#F2B749]" />,
        iconWrapperClassName:
          "w-12 h-12 rounded-2xl bg-[#10141F] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform",
        onSelect: () => setServiceMode("attractions"),
      },
    ],
    [activeHkRequests, activeOrders, totalCartCount]
  );

  if (authLoading) {
    return <SuiteLoader logoUrl={loadingLogo} />;
  }

  if (!stay) {
    return <StayRequiredCard property={property} fallbackLogo={loadingLogo} authError={authError} />;
  }

  const welcomeMode = property?.welcomeMode || "every_time";
  const welcomeSeenKey = `ird_welcome_seen_${stay.id}`;
  const shouldShowWelcome =
    !welcomeDismissed &&
    welcomeMode !== "disabled" &&
    (welcomeMode === "every_time" || localStorage.getItem(welcomeSeenKey) !== "1");

  if (shouldShowWelcome) {
    return (
      <GuestWelcomeLetter
        stay={stay}
        property={property}
        fallbackLogo={loadingLogo}
        onContinue={() => {
          localStorage.setItem(welcomeSeenKey, "1");
          setWelcomeDismissed(true);
        }}
      />
    );
  }

  const isLockedViewport = serviceMode === "attractions";

  return (
    <div
      className={cn(
        "relative flex flex-col text-white",
        isLockedViewport
          ? "h-[100dvh] overflow-hidden bg-[#0B0E16] pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
          : "min-h-[100dvh] bg-[#1E1F18] pb-[max(6.5rem,calc(5.75rem+env(safe-area-inset-bottom)))]"
      )}
    >
      {!isLockedViewport && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden transform-gpu">
          <img
            src={property?.welcomeBgUrl || "/suite-welcome-card.jpg"}
            alt=""
            className="h-full w-full scale-105 object-cover object-center blur-sm brightness-[0.36] saturate-[0.82] transform-gpu"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/suite-welcome-card.jpg";
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(48,50,39,0.52)_0%,rgba(16,17,13,0.92)_100%)]" />
        </div>
      )}

      <GuestHeader
        property={property}
        stay={stay}
        connStatus={connStatus}
        showBackToHub={serviceMode !== "hub"}
        onBackToHub={() => {
          setServiceMode("hub");
          gsap.killTweensOf(window);
          window.scrollTo(0, 0);
        }}
        rightActions={
          <>
            {serviceMode === "room-service" && (
              <>
                <button
                  type="button"
                  onClick={() => document.getElementById("ird-menu-search")?.focus()}
                  aria-label="Search menu"
                  className="hidden h-8 w-8 items-center justify-center rounded-full frost-pill-chip text-white sm:flex btn-smooth-press-sm"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  aria-label="Open order cart"
                  className="relative flex h-8 w-8 items-center justify-center rounded-full frost-pill-chip text-white btn-smooth-press-sm"
                >
                  <SuiteOrderBagIcon className="h-3.5 w-3.5" />
                  {totalCartCount > 0 && (
                    <span
                      key={totalCartCount}
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F3F2EE] px-1 text-[9px] font-bold text-[#171714] tabular-nums zomato-qty-pop"
                    >
                      {totalCartCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIrdTab(irdTab === "orders" ? "menu" : "orders")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold btn-smooth-press-sm transition-colors",
                    irdTab === "orders" ? "frost-cta-white" : "frost-pill-chip text-white"
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{irdTab === "orders" ? "Menu" : "Orders"}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setServiceMode("inbox");
                gsap.killTweensOf(window);
                window.scrollTo(0, 0);
              }}
              aria-label="Open suite inbox"
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full btn-smooth-press-sm transition-colors",
                serviceMode === "inbox" ? "frost-cta-white" : "frost-pill-chip text-white"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              {unreadInboxCount > 0 && (
                <span
                  key={unreadInboxCount}
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white tabular-nums zomato-qty-pop"
                >
                  {unreadInboxCount}
                </span>
              )}
            </button>
          </>
        }
      />

      <main
        className={cn(
          "relative z-10 flex-1 w-full max-w-7xl mx-auto",
          isLockedViewport
            ? "min-h-0 overflow-hidden px-2.5 sm:px-6 py-2 sm:py-3 flex flex-col"
            : "px-3 sm:px-6 py-3 sm:py-5 space-y-4 sm:space-y-5"
        )}
      >
        <PageTransition
          viewKey={serviceMode}
          direction={serviceMode === "hub" ? "back" : serviceMode === "attractions" ? "depth" : "forward"}
          className={isLockedViewport ? "flex-1 min-h-0 flex flex-col" : undefined}
        >
          {serviceMode === "hub" && (
            <div className="space-y-6">
              <GuestServiceHub
                stay={stay}
                property={property}
                services={hubServices}
                unreadInboxCount={unreadInboxCount}
                onOpenMenu={() => {
                  setServiceMode("room-service");
                  setIrdTab("menu");
                }}
                onOpenOrders={() => {
                  setServiceMode("room-service");
                  setIrdTab("orders");
                }}
                onOpenHousekeeping={() => setServiceMode("housekeeping")}
                onOpenAttractions={() => setServiceMode("attractions")}
                onOpenInbox={() => {
                  setServiceMode("inbox");
                  gsap.killTweensOf(window);
                  window.scrollTo(0, 0);
                }}
                onScrollToFaq={() => smoothScrollToTarget("#guest-faq-section")}
              />
              <div className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl">
                <FaqGuestSection />
              </div>
            </div>
          )}

          {serviceMode === "housekeeping" && (
            <RoomServiceGuestPortal
              roomNumber={stay.room?.roomNumber}
              guestName={stay.guestName}
              requests={housekeepingRequests}
              onRequestsChange={setHousekeepingRequests}
              onBackToHub={() => setServiceMode("hub")}
            />
          )}

          {serviceMode === "room-service" && (
            <IrdGuestPortal
              roomNumber={stay.room?.roomNumber}
              property={property}
              activeTab={irdTab}
              onTabChange={setIrdTab}
              cart={cart}
              onCartChange={setCart}
              isCartOpen={isCartOpen}
              onCartOpenChange={setIsCartOpen}
              orders={orders}
              onOrdersRefresh={fetchOrders}
              onBackToHub={() => setServiceMode("hub")}
              onSwitchToRoomService={() => setServiceMode("housekeeping")}
            />
          )}

          {serviceMode === "attractions" && (
            <AttractionsGuestPortal
              roomNumber={stay.room?.roomNumber}
              guestName={stay.guestName}
              contactNumber={property?.contactNumber}
              whatsappNumber={property?.whatsappNumber}
              attractionBookingTemplate={property?.attractionBookingTemplate}
            />
          )}

          {serviceMode === "inbox" && (
            <InboxGuestPortal
              roomNumber={stay.room?.roomNumber}
              messages={inboxMessages}
              loading={inboxLoading}
              onMarkRead={handleMarkInboxRead}
              onMarkAllRead={handleMarkAllInboxRead}
              onRefresh={() => fetchInbox(true)}
              onBackToHub={() => setServiceMode("hub")}
            />
          )}
        </PageTransition>
      </main>

      {/* Compact Floating Frosted Dynamic Island Navigation */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
        <nav
          aria-label="Guest navigation"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/22 bg-[#1F2019]/88 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_36px_-8px_rgba(0,0,0,0.62)] backdrop-blur-md transform-gpu"
        >
          <button
            type="button"
            onClick={() => {
              setServiceMode("hub");
              gsap.killTweensOf(window);
              window.scrollTo(0, 0);
            }}
            aria-label="Services"
            className={cn(
              "relative flex items-center justify-center rounded-full transition-[transform,background-color,color,padding] duration-200 btn-smooth-press-sm",
              serviceMode === "hub"
                ? "gap-1.5 frost-cta-white px-3.5 py-2 zomato-island-pill"
                : "h-9 w-9 text-white/75 hover:bg-white/15 hover:text-white"
            )}
          >
            <ResortVillaIcon className="h-[18px] w-[18px] shrink-0" />
            {serviceMode === "hub" && (
              <span className="text-[11.5px] font-bold tracking-tight whitespace-nowrap">Guide</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setServiceMode("room-service");
              setIrdTab("menu");
              gsap.killTweensOf(window);
              window.scrollTo(0, 0);
            }}
            aria-label="Dining"
            className={cn(
              "relative flex items-center justify-center rounded-full transition-[transform,background-color,color,padding] duration-200 btn-smooth-press-sm",
              serviceMode === "room-service"
                ? "gap-1.5 frost-cta-white px-3.5 py-2 zomato-island-pill"
                : "h-9 w-9 text-white/75 hover:bg-white/15 hover:text-white"
            )}
          >
            <SilverClocheTrayIcon className="h-[18px] w-[18px] shrink-0" />
            {serviceMode === "room-service" && (
              <span className="text-[11.5px] font-bold tracking-tight whitespace-nowrap">Dining</span>
            )}
            {serviceMode !== "room-service" && (totalCartCount > 0 || activeOrders.length > 0) && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white ring-2 ring-[#1F2019]"
                aria-hidden="true"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setServiceMode("housekeeping");
              gsap.killTweensOf(window);
              window.scrollTo(0, 0);
            }}
            aria-label="Room Service"
            className={cn(
              "relative flex items-center justify-center rounded-full transition-[transform,background-color,color,padding] duration-200 btn-smooth-press-sm",
              serviceMode === "housekeeping"
                ? "gap-1.5 frost-cta-white px-3.5 py-2 zomato-island-pill"
                : "h-9 w-9 text-white/75 hover:bg-white/15 hover:text-white"
            )}
          >
            <SuiteCareBellIcon className="h-[18px] w-[18px] shrink-0" />
            {serviceMode === "housekeeping" && (
              <span className="text-[11.5px] font-bold tracking-tight whitespace-nowrap">Suite Care</span>
            )}
            {serviceMode !== "housekeeping" && activeHkRequests.length > 0 && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#1F2019]"
                aria-hidden="true"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setServiceMode("attractions");
              gsap.killTweensOf(window);
              window.scrollTo(0, 0);
            }}
            aria-label="Attractions"
            className={cn(
              "relative flex items-center justify-center rounded-full transition-[transform,background-color,color,padding] duration-200 btn-smooth-press-sm",
              serviceMode === "attractions"
                ? "gap-1.5 frost-cta-white px-3.5 py-2 zomato-island-pill"
                : "h-9 w-9 text-white/75 hover:bg-white/15 hover:text-white"
            )}
          >
            <LandmarkCompassIcon className="h-[18px] w-[18px] shrink-0" />
            {serviceMode === "attractions" && (
              <span className="text-[11.5px] font-bold tracking-tight whitespace-nowrap">Explore</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setServiceMode("inbox");
              gsap.killTweensOf(window);
              window.scrollTo(0, 0);
            }}
            aria-label="Inbox"
            className={cn(
              "relative flex items-center justify-center rounded-full transition-[transform,background-color,color,padding] duration-200 btn-smooth-press-sm",
              serviceMode === "inbox"
                ? "gap-1.5 frost-cta-white px-3.5 py-2 zomato-island-pill"
                : "h-9 w-9 text-white/75 hover:bg-white/15 hover:text-white"
            )}
          >
            <Mail className="h-[18px] w-[18px] shrink-0" />
            {serviceMode === "inbox" && (
              <span className="text-[11.5px] font-bold tracking-tight whitespace-nowrap">Inbox</span>
            )}
            {serviceMode !== "inbox" && unreadInboxCount > 0 && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#1F2019]"
                aria-hidden="true"
              />
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}

export function GuestPortalShell() {
  return (
    <StaySessionProvider>
      <GuestPortalContent />
    </StaySessionProvider>
  );
}
