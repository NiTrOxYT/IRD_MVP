import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { Navbar } from "./components/Navbar";

// Pages
import { GuestStayLanding } from "./pages/GuestStayLanding";
import { GuestMenu } from "./pages/GuestMenu";
import { GuestOrdersList } from "./pages/GuestOrdersList";
import { GuestOrderTracking } from "./pages/GuestOrderTracking";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminOrders } from "./pages/AdminOrders";
import { AdminStays } from "./pages/AdminStays";
import { AdminMenu } from "./pages/AdminMenu";
import { AdminSettings } from "./pages/AdminSettings";
import { KitchenKOT } from "./pages/KitchenKOT";

export function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5EF] text-[#29231F]">
      <Navbar />
      <div className="flex-1">
        <Switch>
          {/* Guest Experience */}
          <Route path="/" component={GuestStayLanding} />
          <Route path="/stay" component={GuestStayLanding} />
          <Route path="/stay/menu" component={GuestMenu} />
          <Route path="/stay/orders" component={GuestOrdersList} />
          <Route path="/order/:id" component={GuestOrderTracking} />

          {/* Staff & Admin Experience */}
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/stays" component={AdminStays} />
          <Route path="/admin/menu" component={AdminMenu} />
          <Route path="/admin/settings" component={AdminSettings} />

          {/* Kitchen KOT Experience */}
          <Route path="/kitchen" component={KitchenKOT} />

          {/* Fallback */}
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default App;
