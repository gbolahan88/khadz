import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  LogOut,
  Bike,
  Bell,
  X,
  Menu,
} from "lucide-react";

import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

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

const links = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Riders", href: "/admin/riders", icon: Bike },
  { name: "Customers", href: "/admin/customers", icon: Users },
];

// ✅ Moved OUTSIDE the component — fixes "Components created during render" error
function NotifDropdown({
  notifications,
  unread,
  onClose,
  onMarkOne,
  onMarkAll,
  onNavigate,
}: {
  notifications: Notification[];
  unread: number;
  onClose: () => void;
  onMarkOne: (id: string) => void;
  onMarkAll: () => void;
  onNavigate: (orderId: string) => void;
}) {
  return (
    <div className="absolute left-0 top-12 z-50 w-80 rounded-2xl border bg-white shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-black">Notifications</h3>
          {unread > 0 && (
            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unread} new
            </span>
          )}
        </div>
        <button onClick={onClose}>
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Bell size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onMarkOne(n.id);
                if (n.order_id) {
                  onNavigate(n.order_id);
                  onClose();
                }
              }}
              className={`cursor-pointer border-b px-4 py-3 hover:bg-gray-50 ${
                !n.read ? "bg-orange-50" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                )}
                <div className={!n.read ? "" : "ml-4"}>
                  <p className="text-sm font-semibold text-black">{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(n.created_at).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {unread > 0 && (
        <div className="border-t px-4 py-2.5 text-center">
          <button
            onClick={onMarkAll}
            className="text-xs font-semibold text-orange-500 hover:opacity-70"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const showToast = useCallback((id: string, title: string, body: string) => {
    setToasts((prev) => [...prev, { id, title, body }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch notifications ───────────────────────────────────────────────────
  // ✅ Wrapped in useCallback — fixes "setState in effect" warning
  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_role", "admin")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }, []);

  const markAllRead = useCallback(async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_role", "admin")
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const out1 = dropdownRef.current && !dropdownRef.current.contains(e.target as Node);
      const out2 = dropdownRef2.current && !dropdownRef2.current.contains(e.target as Node);
      if (out1 && out2) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Init + Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    // ✅ Call inside async IIFE — avoids calling setState synchronously
    (async () => { await fetchNotifications(); })();

    const channel = supabase
      .channel("admin-notifications", {
        config: {
          broadcast: {self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "recipient_role=eq.admin",
        },
        (payload) => {
          console.log("ADMIN NOTIFICATION RICIEVED", payload);
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev]);
          showToast(n.id, n.title, n.body);
        }
      )
      .subscribe((status) => {
        console.log("ADMIN REALTIME STATUS:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, showToast]);

  async function handleLogout() {
    try {
      await signOut();
      router.push("/admin/login");
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <>
      {/* ── Toast popups ─────────────────────────────────────────────────── */}
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
              onClick={() => dismissToast(toast.id)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={14} color="#999" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* MOBILE NAVBAR */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-25">
          <button onClick={() => setMobileSidebar(true)}>
            <Menu size={24} className="text-black" />
          </button>
          <h1 className="text-lg font-bold text-black text-center">Khadz Admin</h1>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setOpen((prev) => !prev);
                if (!open && unread > 0) markAllRead();
              }}
              className="relative"
            >
              <Bell size={22} className="text-black" />
              {unread > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {open && (
              <NotifDropdown
                notifications={notifications}
                unread={unread}
                onClose={() => setOpen(false)}
                onMarkOne={markOneRead}
                onMarkAll={markAllRead}
                onNavigate={(id) => router.push(`/admin/orders/${id}`)}
              />
            )}
          </div>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {mobileSidebar && (
        <div
          onClick={() => setMobileSidebar(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 bg-white transition-transform duration-300 md:hidden ${
          mobileSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b p-5">
          <h1 className="text-xl font-bold text-black">Management System</h1>
          <button onClick={() => setMobileSidebar(false)}>
            <X size={22} color="black" />
          </button>
        </div>
        <nav className="space-y-2 p-4">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileSidebar(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-500 hover:bg-red-50"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:sticky md:top-0 md:flex h-screen w-64 flex-col border-r bg-white">
        <div className="border-b p-6">
          <h1 className="text-2xl font-bold text-black">Khadz Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Management System</p>
          <div className="absolute right-4 top-8" ref={dropdownRef2}>
            <button
              onClick={() => {
                setOpen((prev) => !prev);
                if (!open && unread > 0) markAllRead();
              }}
              className="relative"
            >
              <Bell size={22} className="text-black" />
              {unread > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {open && (
              <NotifDropdown
                notifications={notifications}
                unread={unread}
                onClose={() => setOpen(false)}
                onMarkOne={markOneRead}
                onMarkAll={markAllRead}
                onNavigate={(id) => router.push(`/admin/orders/${id}`)}
              />
            )}
          </div>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-500 hover:bg-red-50"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}