"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Bike, PackageSearch } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

type Rider = {
  id: string;
  full_name: string;
  phone: string;
  status: string;
};

type OrderItem = {
  image: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  user_id: string;
  user_email: string;
  customer_name: string;
  customer_phone: number;
  total_amount: number;
  delivery_fee: number;
  payment_status: string;
  payment_method: string;
  payment_reference: string;
  order_status: string;
  delivery_status?: string;
  rider_id?: string;
  created_at: string;
  items: OrderItem[];
  address: {
    street?: string;
    city?: string;
    country?: string;
    landmark?: string;
  };
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [assignedRider, setAssignedRider] = useState<Rider | null>(null);
  const [assigning, setAssigning] = useState(false);

  async function fetchOrder() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;

      setOrder(data);

      // If order already has a rider, fetch that rider's details
      if (data?.rider_id) {
        const { data: riderData } = await supabase
          .from("riders")
          .select("id, full_name, phone, status")
          .eq("id", data.rider_id)
          .single();

        if (riderData) setAssignedRider(riderData);
      } else {
        setAssignedRider(null);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRiders() {
    try {
      const { data, error } = await supabase
        .from("riders")
        .select("id, full_name, phone, status")
        .eq("status", "available");

      if (error) throw error;

      setRiders(data || []);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (!orderId) return;

    async function loadData() {
      await fetchOrder();
      await fetchRiders();
    }
    loadData();
  }, [orderId]);

  async function assignRider(riderId: string) {
    try {
      setAssigning(true);

      // 1. Update order with rider and set delivery_status to "waiting for rider"
      //    (rider dashboard will update this as they progress)
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          rider_id: riderId,
          delivery_status: "waiting for rider",
          order_status: "on the way",
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      await fetch("/api/notify-order-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "rider_assigned", order_id: orderId }),
      });

      // 2. Mark rider as busy
      const { error: riderError } = await supabase
        .from("riders")
        .update({ status: "busy" })
        .eq("id", riderId);

      if (riderError) throw riderError;

      toast.success("Rider assigned successfully");

      // Refresh both order and rider list
      await fetchOrder();
      await fetchRiders();
    } catch (error) {
      console.log(error);
      toast.error("Failed to assign rider");
    } finally {
      setAssigning(false);
    }
  }

  async function unassignRider() {
    if (!order?.rider_id) return;

    try {
      setAssigning(true);

      // 1. Free up the rider
      await supabase
        .from("riders")
        .update({ status: "available" })
        .eq("id", order.rider_id);

      // 2. Reset order back to no rider
      const { error } = await supabase
        .from("orders")
        .update({
          rider_id: null,
          delivery_status: "waiting for rider",
          order_status: "preparing",
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Rider unassigned");
      setAssignedRider(null);
      await fetchOrder();
      await fetchRiders();
    } catch (error) {
      console.log(error);
      toast.error("Failed to unassign rider");
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg font-semibold text-gray-500">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <PackageSearch size={50} className="mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-semibold">Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <Toaster richColors position="top-right" />
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          {/* HEADER */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">
                Order #{order.id.slice(0, 8)}
              </h1>
              <p className="mt-2 text-gray-500">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                order.order_status === "delivered"
                  ? "bg-green-100 text-green-700"
                  : order.order_status === "cancelled"
                  ? "bg-red-100 text-red-700"
                  : order.order_status === "on the way"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {order.order_status}
            </span>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {/* CUSTOMER */}
            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold text-black">
                Customer Information
              </h2>
              <div className="mt-4 space-y-3 text-gray-700">
                <p>
                  <span className="font-semibold">Name:</span>{" "}
                  {order.customer_name || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {order.customer_phone || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  {order.user_email || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">User ID:</span>{" "}
                  {order.user_id}
                </p>
              </div>
            </div>

            {/* ADDRESS */}
            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold text-black">
                Delivery Address
              </h2>
              <div className="mt-4 space-y-3 text-gray-700">
                <p>{order.address?.street}</p>
                <p>
                  {order.address?.city}, {order.address?.country}
                </p>
                <p>Landmark: {order.address?.landmark || "N/A"}</p>
              </div>
            </div>

            {/* PAYMENT */}
            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold text-black">
                Payment Details
              </h2>
              <div className="mt-4 space-y-3 text-gray-700">
                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  {order.payment_status}
                </p>
                <p>
                  <span className="font-semibold">Method:</span>{" "}
                  {order.payment_method || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">Reference:</span>{" "}
                  {order.payment_reference || "N/A"}
                </p>
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold text-black">
                Order Summary
              </h2>
              <div className="mt-4 space-y-3 text-gray-700">
                <p>
                  <span className="font-semibold">Delivery Fee:</span>{" "}
                  ₦{Number(order.delivery_fee || 0).toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold">Total Amount:</span>{" "}
                  ₦{Number(order.total_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* RIDER ASSIGNMENT */}
            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold text-black mb-4">
                Assign Delivery Rider
              </h2>

              {/* Already assigned */}
              {assignedRider ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-xl bg-green-50 border border-green-200 p-4">
                    <div className="rounded-full bg-green-100 p-3">
                      <Bike size={20} className="text-green-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-black">
                        {assignedRider.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {assignedRider.phone}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                        {assignedRider.status}
                      </span>
                    </div>
                  </div>

                  {/* Only allow unassign if not yet delivered */}
                  {order.delivery_status !== "delivered" && (
                    <button
                      disabled={assigning}
                      onClick={unassignRider}
                      className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {assigning ? "Unassigning..." : "Unassign Rider"}
                    </button>
                  )}
                </div>
              ) : (
                // No rider assigned yet
                <div>
                  {riders.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No available riders at the moment.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {riders.map((rider) => (
                        <button
                          key={rider.id}
                          disabled={assigning}
                          onClick={() => assignRider(rider.id)}
                          className="flex flex-col text-black items-start rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:border-black hover:bg-black hover:text-white disabled:opacity-50 transition-colors"
                        >
                          <span className="text-sm  font-semibold">
                            {rider.full_name}
                          </span>
                          <span className="text-xs text-gray-400 hover:text-gray-300">
                            {rider.phone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DELIVERY PROGRESS */}
            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold text-black mb-4">
                Delivery Progress
              </h2>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Delivery Status:</span>{" "}
                  <span
                    className={`font-semibold ${
                      order.delivery_status === "delivered"
                        ? "text-green-600"
                        : order.delivery_status === "arriving"
                        ? "text-blue-600"
                        : order.delivery_status === "picked up"
                        ? "text-yellow-600"
                        : "text-gray-500"
                    }`}
                  >
                    {order.delivery_status || "waiting for rider"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Assigned Rider:</span>{" "}
                  {assignedRider ? assignedRider.full_name : "No rider assigned"}
                </p>
              </div>
            </div>
          </div>

          {/* ORDERED ITEMS */}
          <div className="mt-10 rounded-2xl border p-6">
            <h2 className="text-xl font-semibold text-black">Ordered Items</h2>
            <div className="mt-6 space-y-4">
              {order.items?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-xl border p-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-black">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity}
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
      </main>
    </div>
  );
}