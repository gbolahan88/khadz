"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { Package, ShoppingBag, TrendingUp, Clock3, Bike, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/get-user-role";

type Order = {
  id: string;
  total_amount: number;
  order_status: string;
  created_at: string;
  customer_name: string;
  rider_id: string | null;
  riders?: { full_name: string } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const hasFetched = useRef(false);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      const [{ data: orders, error: ordersError }, { data: products, error: productsError }] =
        await Promise.all([
          supabase.from("orders").select("*").order("created_at", { ascending: true }),
          supabase.from("products").select("id"),
        ]);

      if (ordersError) { console.error("Orders error:", ordersError); }
      if (productsError) { console.error("Products error:", productsError); }

      const orderList = orders || [];
      const productList = products || [];

      setTotalOrders(orderList.length);
      setTotalProducts(productList.length);
      setPendingOrders(orderList.filter((o) => o.order_status?.toLowerCase() === "preparing").length);
      setRevenue(orderList.reduce((sum, o) => sum + Number(o.total_amount || 0), 0));

      const sorted = [...orderList].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentOrders(sorted.slice(0, 10));

      const grouped: Record<string, { revenue: number; orders: number }> = {};
      orderList.forEach((o) => {
        const date = new Date(o.created_at).toLocaleDateString();
        if (!grouped[date]) grouped[date] = { revenue: 0, orders: 0 };
        grouped[date].revenue += Number(o.total_amount || 0);
        grouped[date].orders += 1;
      });
      setChartData(Object.entries(grouped).map(([date, v]) => ({ date, ...v })));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function init() {
      const role = await getUserRole();
      if (role !== "admin" && role !== "super_admin") {
        router.push("/rider/dashboard");
        return;
      }
      await fetchDashboardData();
    }

    init();

    // Realtime auto-refresh
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "preparing": return { bg: "#fff3e0", text: "#f57c00" };
      case "on the way": return { bg: "#e3f2fd", text: "#1976d2" };
      case "delivered": return { bg: "#e8f5e9", text: "#388e3c" };
      case "cancelled": return { bg: "#ffebee", text: "#d32f2f" };
      default: return { bg: "#f5f5f5", text: "#666" };
    }
  };

  const cards = [
    { title: "Total Orders", value: totalOrders, icon: ShoppingBag, color: "red" },
    { title: "Products", value: totalProducts, icon: Package, color: "blue" },
    { title: "Pending Orders", value: pendingOrders, icon: Clock3, color: "orange" },
    { title: "Revenue", value: `₦${revenue.toLocaleString()}`, icon: TrendingUp, color: "green" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 md:flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .order-row { transition: background 0.15s; cursor: pointer; }
        .order-row:hover { background: #f9fafb; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
      `}</style>

      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-black">Dashboard</h1>
            <p className="mt-1 text-gray-500">Monitor orders, revenue, and products.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 border border-green-200">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-700">Live</span>
          </div>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <p className="text-lg font-semibold text-gray-500">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{card.title}</p>
                        <h2 className="mt-2 text-3xl font-bold text-black">{card.value}</h2>
                      </div>
                      <div className="rounded-xl bg-gray-100 p-3">
                        <Icon size={24} color={card.color} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CHARTS */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-black">Revenue Analytics</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="red" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-black">Orders Analytics</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="orange" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RECENT ORDERS */}
            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-black">Recent Orders</h2>
                <button
                  onClick={() => router.push("/admin/orders")}
                  className="flex items-center gap-1 text-sm font-semibold text-orange-500 hover:opacity-70"
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  View all <ChevronRight size={16} />
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="rounded-xl border p-6 text-center text-gray-400">
                  <p className="text-sm">No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-400 uppercase tracking-wide">
                        <th className="pb-3 pr-4">Order</th>
                        <th className="pb-3 pr-4">Customer</th>
                        <th className="pb-3 pr-4">Rider</th>
                        <th className="pb-3 pr-4">Amount</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const s = getStatusStyle(order.order_status);
                        return (
                          <tr
                            key={order.id}
                            className="order-row border-b last:border-0"
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                          >
                            <td className="py-3 pr-4 font-mono text-xs font-semibold text-black">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="py-3 pr-4 font-medium text-black">
                              {order.customer_name || "—"}
                            </td>
                            <td className="py-3 pr-4">
                              {order.riders?.full_name ? (
                                <span className="flex items-center gap-1.5 text-gray-600">
                                  <Bike size={13} color="#f97316" />
                                  {order.riders.full_name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Not assigned</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 font-semibold text-black">
                              ₦{Number(order.total_amount).toLocaleString()}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={{ background: s.bg, color: s.text }}
                              >
                                {order.order_status}
                              </span>
                            </td>
                            <td className="py-3 text-xs text-gray-400">
                              {new Date(order.created_at).toLocaleString("en-NG", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}