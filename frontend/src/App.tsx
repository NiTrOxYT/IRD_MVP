import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { Navbar } from "./components/Navbar";

// Guest Experience Page
import { GuestScreen } from "./pages/GuestScreen";
import { GuestOrderTracking } from "./pages/GuestOrderTracking";

// Staff Experience Pages
import { AdminLogin } from "./pages/AdminLogin";
import { AdminOrders } from "./pages/AdminOrders";
import { AdminStays } from "./pages/AdminStays";
import { AdminMenu } from "./pages/AdminMenu";
import { AdminInventory } from "./pages/AdminInventory";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminSettings } from "./pages/AdminSettings";
import { AdminRoomQR } from "./pages/AdminRoomQR";
import { AdminAnalytics } from "./pages/AdminAnalytics";
import { KitchenKOT } from "./pages/KitchenKOT";

export function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#29231F]">
      <Navbar />
      <div className="flex-1">
        <Switch>
          {/* 1. Guest Experience (https://ird.theaveniq.site/) */}
          <Route path="/" component={GuestScreen} />
          <Route path="/stay" component={GuestScreen} />
          <Route path="/stay/menu" component={GuestScreen} />
          <Route path="/order/:id" component={GuestOrderTracking} />
          <Route path="/orders" component={GuestScreen} />

          {/* 2. Reception Experience (https://ird.theaveniq.site/reception) */}
          <Route path="/reception" component={AdminOrders} />
          <Route path="/reception/stays" component={AdminStays} />

          {/* 3. Kitchen/KOT Experience (https://ird.theaveniq.site/kot) */}
          <Route path="/kot" component={KitchenKOT} />
          <Route path="/kitchen" component={KitchenKOT} />

          {/* 4. Admin Experience (https://ird.theaveniq.site/admin) */}
          <Route path="/admin" component={AdminOrders} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/stays" component={AdminStays} />
          <Route path="/admin/menu" component={AdminMenu} />
          <Route path="/admin/inventory" component={AdminInventory} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/qr" component={AdminRoomQR} />

          {/* Fallback to Guest Home */}
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default App;
