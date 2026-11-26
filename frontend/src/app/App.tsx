import React from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { Navbar } from "../core/ui/Navbar";
import { PageTransition } from "../core/ui/MotionPrimitives";

// Guest Portal Shell (composes Core Stay + IRD + Room Service)
import { GuestPortalShell } from "./GuestPortalShell";

// Core Platform Pages
import { AdminLogin } from "../core/auth/AdminLoginPage";
import { AdminUsers } from "../core/auth/AdminUsersPage";
import { AdminStays } from "../core/property/AdminStaysPage";
import { AdminSettings } from "../core/property/AdminSettingsPage";
import { AdminRoomQR } from "../core/property/AdminRoomQRPage";

// IRD Module Pages
import { GuestOrderTracking } from "../modules/ird/pages/GuestOrderTrackingPage";
import { AdminOrders } from "../modules/ird/pages/AdminOrdersPage";
import { AdminMenu } from "../modules/ird/pages/AdminMenuPage";
import { AdminInventory } from "../modules/ird/pages/AdminInventoryPage";
import { AdminAnalytics } from "../modules/ird/pages/AdminAnalyticsPage";
import { KitchenKOT } from "../modules/ird/pages/KitchenKOTPage";

// Room Service Module Pages
import { HousekeepingStaff } from "../modules/room-service/pages/HousekeepingStaffPage";

// Local Attractions Module Pages
import { AdminAttractions } from "../modules/attractions/pages/AdminAttractionsPage";

// FAQ Module Pages
import { AdminFaq } from "../modules/faq/pages/AdminFaqPage";

// Guest Inbox Module Pages
import { AdminInbox } from "../modules/inbox";

export function App() {
  const [location] = useLocation();
  const isStaffRoute =
    location.startsWith("/admin") ||
    location.startsWith("/reception") ||
    location.startsWith("/kot") ||
    location.startsWith("/kitchen") ||
    location.startsWith("/housekeeping");

  const routes = (
    <Switch>
      {/* 1. Guest Experience */}
      <Route path="/" component={GuestPortalShell} />
      <Route path="/stay" component={GuestPortalShell} />
      <Route path="/stay/menu" component={GuestPortalShell} />
      <Route path="/stay/housekeeping" component={GuestPortalShell} />
      <Route path="/stay/attractions" component={GuestPortalShell} />
      <Route path="/stay/inbox" component={GuestPortalShell} />
      <Route path="/order/:id" component={GuestOrderTracking} />
      <Route path="/orders" component={GuestPortalShell} />

      {/* 2. Reception Experience */}
      <Route path="/reception" component={AdminOrders} />
      <Route path="/reception/stays" component={AdminStays} />

      {/* 3. Kitchen/KOT Experience */}
      <Route path="/kot" component={KitchenKOT} />
      <Route path="/kitchen" component={KitchenKOT} />

      {/* 3b. Housekeeping / Room Service Console */}
      <Route path="/housekeeping" component={HousekeepingStaff} />

      {/* 4. Admin Experience */}
      <Route path="/admin" component={AdminOrders} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/stays" component={AdminStays} />
      <Route path="/admin/menu" component={AdminMenu} />
      <Route path="/admin/attractions" component={AdminAttractions} />
      <Route path="/admin/faq" component={AdminFaq} />
      <Route path="/admin/inbox" component={AdminInbox} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/qr" component={AdminRoomQR} />

      {/* Fallback to Guest Home */}
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#29231F]">
      <Navbar />
      {isStaffRoute ? (
        <PageTransition viewKey={location} direction="depth" className="flex-1">
          {routes}
        </PageTransition>
      ) : (
        <div className="flex-1">{routes}</div>
      )}
    </div>
  );
}

export default App;
