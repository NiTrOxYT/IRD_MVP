import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { getStayOrders, Order } from "../lib/api";
import { formatINR } from "../lib/currency";
import { StatusBadge } from "../components/StatusBadge";
import { ArrowLeft, Clock, Eye, Utensils, AlertCircle } from "lucide-react";

export function GuestOrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStayOrders()
      .then((res) => {
        setOrders(res.orders);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#E5DDD1]">
        <div>
          <Link
            href="/stay/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73685C] hover:text-[#1E150F] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to In-Room Menu
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E150F]">
            Suite Order History
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#73685C]">Loading suite orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-12 text-center">
          <Utensils className="w-10 h-10 text-[#B88223] mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-[#1E150F] mb-1">No Orders Placed Yet</h3>
          <p className="text-xs text-[#73685C] mb-4">
            You haven't placed any in-room dining orders during this stay yet.
          </p>
          <Link
            href="/stay/menu"
            className="inline-block py-2.5 px-4 bg-[#1E150F] text-white text-xs font-semibold rounded-xl"
          >
            Browse In-Room Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold text-[#B88223]">
                    {order.order_number}
                  </span>
                  <span className="text-[#73685C]">·</span>
                  <StatusBadge status={order.status} />
                </div>

                <div className="text-xs text-[#73685C] space-y-0.5">
                  <p>
                    {order.items?.map((it: any) => `${it.quantity}× ${it.itemName}${it.variantName ? ` (${it.variantName})` : ""}`).join(", ")}
                  </p>
                  <p className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-[#E5DDD1]">
                <span className="font-sans text-[14px] font-extrabold text-[#29231F] sm:text-[15px]">
                  {formatINR(order.total_amount)}
                </span>
                <Link
                  href={`/order/${order.id}`}
                  className="py-2 px-3 bg-[#1E150F] hover:bg-[#29231F] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#B88223]" /> Track Order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
