"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

type OrderItem = {
  image: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  order_status: string;
  created_at: string;
  user_email?: string;
  customer_name?: string;
  items: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const ORDERS_PER_PAGE = 5;

  const router = useRouter();

  async function fetchOrders() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadOrders() {
      await fetchOrders();
    };
    loadOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    async function resetPage() {
      setCurrentPage(1);
    }
    resetPage();
  }, [search, statusFilter]);

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      setUpdatingId(orderId);

      const { error } = await supabase
        .from("orders")
        .update({ order_status: status })
        .eq("id", orderId);

      if (error) throw error;

      // Notify customer of status change
      await fetch("/api/notify-order-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "status_changed", order_id: orderId }),
      });

      toast.success("Order updated");
      fetchOrders();
    } catch (error) {
      console.log(error);
      toast.error("Failed to update order");
    } finally {
      setUpdatingId("");
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      order.order_status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <Toaster richColors position="top-right" />

      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Orders Management</h1>
          <p className="mt-2 text-gray-500">
            Manage customer orders and delivery statuses.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Search order by ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border text-black border-gray-300 bg-white px-4 py-3 outline-none focus:border-black md:max-w-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl text-black border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="on the way">On The Way</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <p className="text-lg font-semibold text-gray-500">
              Loading orders...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-2xl bg-white">
            <PackageSearch size={50} className="text-gray-400" />
            <p className="mt-4 text-lg font-semibold text-gray-600">
              No orders found
            </p>
          </div>
        ) : (
          <>
            {/* ORDER CARDS */}
            <div className="space-y-6">
              {paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* LEFT */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-black">
                          Order #{order.id.slice(0, 6)}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            order.order_status === "delivered"
                              ? "bg-green-100 text-green-700"
                              : order.order_status === "preparing"
                              ? "bg-yellow-100 text-yellow-700"
                              : order.order_status === "on the way"
                              ? "bg-blue-100 text-blue-700"
                              : order.order_status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.order_status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-black">Payment:</span>{" "}
                          {order.payment_status}
                        </p>
                        <p>
                          <span className="font-semibold text-black">Method:</span>{" "}
                          {order.payment_method || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-black">Total:</span>{" "}
                          ₦{Number(order.total_amount).toLocaleString()}
                        </p>
                        <p>
                          <span className="font-semibold text-black">Date:</span>{" "}
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* ITEMS */}
                      <div className="mt-6">
                        <h3 className="mb-3 font-semibold text-black">
                          Ordered Items
                        </h3>
                        <div className="space-y-3">
                          {order.items?.map((item: OrderItem, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-4 rounded-xl border p-3"
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-16 w-16 rounded-xl object-cover"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-black">
                                  {item.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Qty: {item.quantity}
                                </p>
                              </div>
                              <p className="font-semibold text-black">
                                ₦{Number(item.price).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT — status buttons */}
                    <div className="flex flex-col gap-3">
                      <button
                        disabled={updatingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, "preparing");
                        }}
                        className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Preparing
                      </button>
                      <button
                        disabled={updatingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, "on the way");
                        }}
                        className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        On The Way
                      </button>
                      <button
                        disabled={updatingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, "delivered");
                        }}
                        className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Delivered
                      </button>
                      <button
                        disabled={updatingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, "cancelled");
                        }}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION — outside the map, renders once */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`h-10 w-10 rounded-xl text-sm font-semibold ${
                        currentPage === index + 1
                          ? "bg-black text-white"
                          : "bg-white text-black border"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}