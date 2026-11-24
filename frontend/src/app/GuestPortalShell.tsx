import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import { StaySessionProvider, useStaySession } from "../core/stay/StaySessionContext";
import { SuiteLoader } from "../core/stay/SuiteLoader";
import { StayRequiredCard } from "../core/stay/StayRequiredCard";
import { GuestWelcomeLetter } from "../core/stay/GuestWelcomeLetter";
import { GuestHeader } from "../core/stay/GuestHeader";
import { GuestServiceHub, type GuestServiceTile } from "../core/stay/GuestServiceHub";
import { usePropertyLogo } from "../core/property/useProperty";
import { playOrderChime } from "../core/ui/audio";
import {
  ArchClocheIcon,
  ArchCompassIcon,
  ArchFolioIcon,
  ArchServicesIcon,
  ArchSuiteCareIcon,
  ArchTrayBagIcon,
} from "../core/ui/EnterpriseIcons";
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

function GuestPortalContent() {
  const loadingLogo = usePropertyLogo();
  const { stay, property, authLoading, authError, connStatus } = useStaySession();

  const [serviceMode, setServiceMode] = useState<
    "hub" | "room-service" | "housekeeping" | "attractions"
  >(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get("service");
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

  useEffect(() => {
    if (!stay?.id) return;

    fetchOrders();
    fetchHousekeeping();

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

    const pollInterval = setInterval(() => {
      fetchOrders();
      fetchHousekeeping();
    }, 5000);

    return () => {
      unsubOrderCreated();
      unsubOrderChanged();
      unsubHkCreated();
      unsubHkStatus();
      clearInterval(pollInterval);
    };
  }, [stay?.id, fetchOrders, fetchHousekeeping]);

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
        title: "In-Room Dining",
        description:
          "Chef-prepared regional dishes, light fare, and artisanal coffee delivered privately to your suite.",
        ctaLabel: "Open dining menu",
        imageSrc: "/in-room-dining-card.jpg",
        icon: <ArchClocheIcon className="h-[18px] w-[18px]" />,
        activeBadgeText: totalCartCount > 0 ? `${totalCartCount} in tray` : null,
        statusSummaryText:
          activeOrders.length > 0
            ? `Dining: ${activeOrders[0].status.replace(/_/g, " ")} (${activeOrders.length})`
            : null,
        statusActionLabel: activeOrders.length > 0 ? "View order" : null,
        onStatusAction: () => {
          setServiceMode("room-service");
          setIrdTab("orders");
        },
        onSelect: () => setServiceMode("room-service"),
      },
      {
        id: "room-service",
        title: "Suite Care",
        description:
          "Request suite refresh, fresh linen, bath amenities, evening turndown, or luggage assistance.",
        ctaLabel: "Request service",
        imageSrc: "/room-service-card.jpg",
        icon: <ArchSuiteCareIcon className="h-[18px] w-[18px]" />,
        activeBadgeText: activeHkRequests.length > 0 ? `${activeHkRequests.length} active` : null,
        statusSummaryText:
          activeHkRequests.length > 0
            ? `Suite Care: ${activeHkRequests[0].status.replace(/_/g, " ")} (${activeHkRequests.length})`
            : null,
        statusActionLabel: activeHkRequests.length > 0 ? "View requests" : null,
        onStatusAction: () => setServiceMode("housekeeping"),
        onSelect: () => setServiceMode("housekeeping"),
      },
      {
        id: "attractions",
        title: "Local Attractions",
        description:
          "Curated regional landmarks with video previews, transparent transfer fares, and verified guest ratings.",
        ctaLabel: "Explore directory",
        imageSrc: "/suite-welcome-card.jpg",
        icon: <ArchCompassIcon className="h-[18px] w-[18px]" />,
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
        "flex flex-col",
        isLockedViewport
          ? "h-[100dvh] overflow-hidden bg-[#0B0E16] text-white pb-[calc(4.1rem+env(safe-area-inset-bottom))]"
          : "min-h-[100dvh] bg-[#F6F4EF] text-[#141210] pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom)))]"
      )}
    >
      <GuestHeader
        property={property}
        stay={stay}
        connStatus={connStatus}
        showBackToHub={serviceMode !== "hub"}
        onBackToHub={() => setServiceMode("hub")}
        rightActions={
          serviceMode === "room-service" ? (
            <>
              <button
                type="button"
                onClick={() => document.getElementById("ird-menu-search")?.focus()}
                aria-label="Search menu"
                className="hidden h-8 w-8 items-center justify-center rounded-lg border border-[rgba(20,18,16,0.12)] bg-white text-[#141210] transition-colors hover:border-[rgba(20,18,16,0.26)] sm:flex btn-smooth-press-sm"
              >
                <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label="Open order tray"
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(20,18,16,0.12)] bg-white text-[#141210] transition-colors hover:border-[rgba(20,18,16,0.26)] btn-smooth-press-sm"
              >
                <ArchTrayBagIcon className="h-4 w-4" />
                {totalCartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-md bg-[#141210] px-1 text-[9px] font-semibold text-white tabular-nums">
                    {totalCartCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIrdTab("orders")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(20,18,16,0.12)] bg-white px-2.5 text-xs font-medium text-[#141210] transition-colors hover:border-[rgba(20,18,16,0.26)] btn-smooth-press-sm"
              >
                <ArchFolioIcon className="h-3.5 w-3.5 text-[#966F29]" />
                <span className="hidden sm:inline">Orders</span>
              </button>
            </>
          ) : null
        }
      />

      <main
        className={cn(
          "flex-1 w-full max-w-5xl mx-auto",
          isLockedViewport
            ? "max-w-7xl min-h-0 overflow-hidden px-2.5 sm:px-6 py-2 sm:py-3 flex flex-col"
            : "px-3.5 sm:px-6 py-4 sm:py-6 space-y-5"
        )}
      >
        <PageTransition
          viewKey={serviceMode}
          direction={serviceMode === "hub" ? "back" : serviceMode === "attractions" ? "depth" : "forward"}
          className={isLockedViewport ? "flex-1 min-h-0 flex flex-col" : undefined}
        >
          {serviceMode === "hub" && (
            <div className="space-y-6">
              <GuestServiceHub stay={stay} services={hubServices} />
              <FaqGuestSection />
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
              contactNumber={property?.contactNumber}
            />
          )}
        </PageTransition>
      </main>

      <nav
        aria-label="Guest navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(20,18,16,0.1)] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-8px_rgba(20,18,16,0.08)] backdrop-blur-lg"
      >
        <div className="mx-auto grid h-[60px] max-w-lg grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setServiceMode("hub");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 text-[11px] transition-colors btn-smooth-press-sm",
              serviceMode === "hub" ? "font-semibold text-[#141210]" : "font-normal text-[#847C73] hover:text-[#141210]"
            )}
          >
            {serviceMode === "hub" && (
              <span className="absolute top-0 h-[2px] w-8 bg-[#141210]" aria-hidden="true" />
            )}
            <ArchServicesIcon className="h-[19px] w-[19px]" strokeWidth={serviceMode === "hub" ? 1.65 : 1.35} />
            <span>Services</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setServiceMode("room-service");
              setIrdTab("menu");
            }}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 text-[11px] transition-colors btn-smooth-press-sm",
              serviceMode === "room-service"
                ? "font-semibold text-[#141210]"
                : "font-normal text-[#847C73] hover:text-[#141210]"
            )}
          >
            {serviceMode === "room-service" && (
              <span className="absolute top-0 h-[2px] w-8 bg-[#141210]" aria-hidden="true" />
            )}
            <ArchClocheIcon className="h-[19px] w-[19px]" strokeWidth={serviceMode === "room-service" ? 1.65 : 1.35} />
            <span>Dining</span>
          </button>

          <button
            type="button"
            onClick={() => setServiceMode("housekeeping")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 text-[11px] transition-colors btn-smooth-press-sm",
              serviceMode === "housekeeping" ? "font-semibold text-[#141210]" : "font-normal text-[#847C73] hover:text-[#141210]"
            )}
          >
            {serviceMode === "housekeeping" && (
              <span className="absolute top-0 h-[2px] w-8 bg-[#141210]" aria-hidden="true" />
            )}
            <ArchSuiteCareIcon className="h-[19px] w-[19px]" strokeWidth={serviceMode === "housekeeping" ? 1.65 : 1.35} />
            <span>Suite Care</span>
          </button>

          <button
            type="button"
            onClick={() => setServiceMode("attractions")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 text-[11px] transition-colors btn-smooth-press-sm",
              serviceMode === "attractions" ? "font-semibold text-[#141210]" : "font-normal text-[#847C73] hover:text-[#141210]"
            )}
          >
            {serviceMode === "attractions" && (
              <span className="absolute top-0 h-[2px] w-8 bg-[#141210]" aria-hidden="true" />
            )}
            <ArchCompassIcon className="h-[19px] w-[19px]" strokeWidth={serviceMode === "attractions" ? 1.65 : 1.35} />
            <span>Attractions</span>
          </button>
        </div>
      </nav>
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
