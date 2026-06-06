"use client";

import { signOut } from "@/lib/auth";
import { getUserRole } from "@/lib/get-user-role";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  Bike,
  CheckCircle,
  Clock,
  LogOut,
  MapPin,
  Package,
  Phone,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Order = {
  id: string;
  total_amount: number;
  delivery_fee: number;
  delivery_status: string;
  order_status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  address: {
    street: string;
    city: string;
    landmark?: string;
  };
  items: { name: string; quantity: number; price: number }[];
};

type Rider = {
  full_name: string;
  phone: string;
  email: string;
  status: string;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  order_id: string | null;
  read: boolean;
  created_at: string;
};

type Toast = {
  id: string;
  title: string;
  body: string;
};

const STATUS_FLOW = [
  { key: "waiting for rider", label: "Waiting", color: "#6b7280" },
  { key: "picked up", label: "Picked Up", color: "#f59e0b" },
  { key: "arriving", label: "Arriving", color: "#3b82f6" },
  { key: "delivered", label: "Delivered", color: "#22c55e" },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_FLOW.find((s) => s.key === status) || STATUS_FLOW[0];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: s.color + "22", color: s.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
}

export default function RiderDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "delivered">("active");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;
  const router = useRouter();

  const showToast = useCallback((id: string, title: string, body: string) => {
    setToasts((prev) => [...prev, { id, title, body }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  async function fetchRiderProfile(userId: string) {
    const { data } = await supabase
      .from("riders")
      .select("full_name, phone, email, status")
      .eq("id", userId)
      .single();
    if (data) setRider(data);
  }

  async function fetchOrders(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const fetchNotifications = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_role", "rider")
      .eq("rider_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { console.log("fetch rider notifications error:", error); return; }
    setNotifications(data || []);
  }, []);

  const markAllRead = useCallback(async (userId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_role", "rider")
      .eq("rider_id", userId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  async function updateDeliveryStatus(orderId: string, status: string) {
    try {
      setUpdatingId(orderId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("orders")
        .update({
          delivery_status: status,
          order_status: status === "delivered" ? "delivered" : "on the way",
        })
        .eq("id", orderId);

      if (error) throw error;

      if (status === "delivered") {
        await supabase.from("riders").update({ status: "available" }).eq("id", user.id);
      }

      await fetch("/api/notify-order-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "delivery_update", order_id: orderId }),
      });

      await fetchOrders(user.id);
    } catch (error) {
      console.log(error);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let ordersChannel: ReturnType<typeof supabase.channel> | null = null;
    let notifChannel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    async function init() {
      const role = await getUserRole();
      if (!mounted) return;
      if (role !== "rider") { router.push("/admin/login"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) { router.push("/admin/login"); return; }

      const userId = user.id;

      await Promise.all([
        fetchRiderProfile(userId),
        fetchOrders(userId),
        fetchNotifications(userId),
      ]);

      if (!mounted) return;

      // Orders channel — refreshes when any order with this rider_id changes
      // event: "*" covers INSERT (new assignment) + UPDATE (status change)
      ordersChannel = supabase
        .channel("rider-orders-" + userId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `rider_id=eq.${userId}`,
          },
          () => { if (mounted) fetchOrders(userId); }
        )
        .subscribe();

      // ✅ Notifications channel — filter by rider_id so only THIS rider gets notifs
      notifChannel = supabase
        .channel(`rider-notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `rider_id=eq.${userId}`, // ✅ fixed — was recipient_role=eq.rider
          },
          (payload) => {
            if (!mounted) return;
            const n = payload.new as Notification;
            setNotifications((prev) => {
              if (prev.some((p) => p.id === n.id)) return prev;
              return [n, ...prev];
            });
            showToast(n.id, n.title, n.body);
          }
        )
        .subscribe();
    }

    init();

    return () => {
      mounted = false;
      if (ordersChannel) supabase.removeChannel(ordersChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, [fetchNotifications, showToast]);

  async function handleLogout() {
    await signOut();
    router.push("/admin/login");
  }

  const activeOrders = orders.filter((o) => o.delivery_status !== "delivered");
  const deliveredOrders = orders.filter((o) => o.delivery_status === "delivered");
  const displayedOrders = activeTab === "active" ? activeOrders : deliveredOrders;

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .order-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .action-btn { transition: opacity 0.15s, transform 0.1s; }
        .action-btn:active { transform: scale(0.97); }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tab-btn { transition: all 0.2s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
        @keyframes slideInToast {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff6b2b]">
            <Bike size={18} color="#fff" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-black">Khadz Burger</p>
            <p className="mt-0.5 text-[11px] text-[#555]">Rider Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {rider && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-gray-100">
                <User size={14} color="#888" />
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-black">{rider.full_name}</p>
                <p className="text-[11px] text-[#555]">{rider.phone}</p>
              </div>
            </div>
          )}

          {/* NOTIFICATION BELL */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={async () => {
                const next = !notifOpen;
                setNotifOpen(next);
                if (next && unread > 0) {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) await markAllRead(user.id);
                }
              }}
              className="relative flex items-center justify-center rounded-lg border border-gray-300 bg-gray-100 p-2"
            >
              <Bell size={16} color="#000" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-black">Notifications</p>
                    {unread > 0 && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {unread} new
                      </span>
                    )}
                  </div>
                  <button onClick={() => setNotifOpen(false)} className="p-0.5">
                    <X size={14} color="#555" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Bell size={26} className="mb-2 opacity-30" />
                      <p className="text-xs">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { markOneRead(n.id); setNotifOpen(false); }}
                        className="flex cursor-pointer items-start gap-2 border-b px-4 py-3 hover:bg-gray-50"
                        style={{ background: !n.read ? "#fff7ed" : "transparent" }}
                      >
                        {!n.read && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b2b]" />
                        )}
                        <div className={!n.read ? "" : "ml-3"}>
                          <p className="text-xs font-semibold text-black">{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-gray-500">{n.body}</p>
                          <p className="mt-1 text-[10px] text-gray-400">
                            {new Date(n.created_at).toLocaleString("en-NG", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && unread > 0 && (
                  <div className="border-t px-4 py-2.5 text-center">
                    <button
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) markAllRead(user.id);
                      }}
                      className="text-xs font-semibold text-orange-500 hover:opacity-70"
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500"
            style={{ cursor: "pointer", fontFamily: "inherit" }}
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-black md:text-3xl">
            {rider ? `Hey, ${rider.full_name.split(" ")[0]} 👋` : "Rider Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-[#555]">Here&apos;s your delivery overview for today.</p>
        </div>

        {/* STAT CARDS */}
        <div className="mb-6 grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: "Total", value: orders.length, icon: <Package size={18} color="#ff6b2b" />, accent: "#ff6b2b" },
            { label: "Active", value: activeOrders.length, icon: <Bike size={18} color="#3b82f6" />, accent: "#3b82f6" },
            { label: "Delivered", value: deliveredOrders.length, icon: <CheckCircle size={18} color="#22c55e" />, accent: "#22c55e" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-300 bg-white p-4 md:p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: stat.accent + "18" }}>
                {stat.icon}
              </div>
              <p className="text-[11px] font-medium text-[#555] md:text-xs">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-black md:text-3xl">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="mb-4 flex w-fit gap-1 rounded-xl border border-gray-300 bg-white p-1">
          {(["active", "delivered"] as const).map((tab) => (
            <button
              key={tab}
              className="tab-btn rounded-lg px-4 py-2 text-xs font-semibold md:px-5 md:text-sm"
              onClick={() => setActiveTab(tab)}
              style={{
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                background: activeTab === tab ? "#ff6b2b" : "transparent",
                color: activeTab === tab ? "#fff" : "#555",
              }}
            >
              {tab === "active" ? `Active (${activeOrders.length})` : `Done (${deliveredOrders.length})`}
            </button>
          ))}
        </div>

        {/* ORDER LIST */}
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-[#555]">Loading deliveries...</div>
        ) : displayedOrders.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-gray-300 bg-white text-gray-400">
            <Clock size={36} className="mb-3" />
            <p className="text-sm font-semibold">
              {activeTab === "active" ? "No active deliveries" : "No delivered orders yet"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayedOrders.map((order) => (
              <div key={order.id} className="order-card rounded-2xl border border-gray-300 bg-white p-4 md:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-black" style={{ fontFamily: "'DM Mono', monospace", fontSize: "14px" }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <StatusBadge status={order.delivery_status} />
                    </div>
                    <p className="mt-1 text-[11px] text-[#555]">
                      {new Date(order.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <p className="text-base font-bold text-[#ff6b2b] md:text-lg">
                    ₦{Number(order.total_amount).toLocaleString()}
                  </p>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-300 bg-gray-100 p-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <User size={13} color="black" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-black">Customer</p>
                      <p className="text-xs font-semibold text-gray-500">{order.customer_name || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone size={13} color="black" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-black">Phone</p>
                      <a href={`tel:${order.customer_phone}`} className="text-xs font-semibold text-blue-500 no-underline">
                        {order.customer_phone || "—"}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin size={13} color="black" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-black">Delivery Address</p>
                      <p className="text-xs font-semibold text-gray-500">
                        {order.address?.street}, {order.address?.city}
                        {order.address?.landmark ? ` — ${order.address.landmark}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <Package size={13} color="black" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-black">Items</p>
                      <p className="text-xs font-semibold text-gray-500">
                        {Array.isArray(order.items)
                          ? order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {order.delivery_status !== "delivered" && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { status: "picked up", label: "Picked Up", color: "#f59e0b" },
                      { status: "arriving", label: "Arriving", color: "#3b82f6" },
                      { status: "delivered", label: "Delivered", color: "#22c55e" },
                    ].map((action) => {
                      const isActive = order.delivery_status === action.status;
                      return (
                        <button
                          key={action.status}
                          className="action-btn rounded-xl py-2.5 text-xs font-semibold md:py-3 md:text-sm"
                          disabled={updatingId === order.id || isActive}
                          onClick={() => updateDeliveryStatus(order.id, action.status)}
                          style={{
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            background: isActive ? action.color + "33" : action.color,
                            color: isActive ? action.color : "#fff",
                            outline: isActive ? `1px solid ${action.color}` : "none",
                          }}
                        >
                          {updatingId === order.id ? "..." : action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* TOAST POPUPS */}
      <div className="fixed right-4 top-4 z-9999 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-80 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
            style={{ animation: "slideInToast 0.3s ease" }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50">
              <Bell size={18} color="#f97316" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-black truncate">{toast.title}</p>
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{toast.body}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={14} color="#999" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}