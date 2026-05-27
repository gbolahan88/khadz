"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  image: string;
};

type Order = {
  id: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  address: {
    street?: string;
    city?: string;
    country?: string;
    landmark?: string;
  };
  items: OrderItem[];
};

export default function CustomerDetailsPage() {
  const params = useParams();

  const customerId = params.id as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchCustomerOrders() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadData() {
      await fetchCustomerOrders();
    }

    loadData();
  }, []);

  const customer = orders[0];

  const totalSpent = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            Loading customer...
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
              <h1 className="text-3xl font-bold text-black">
                Customer Details
              </h1>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-black">
                    Total Orders
                  </p>

                  <h2 className="text-2xl font-bold text-gray-500">
                    {orders.length}
                  </h2>
                </div>

                <div>
                  <p className="text-sm text-black">
                    Total Spent
                  </p>

                  <h2 className="text-2xl font-bold text-gray-500">
                    ₦{totalSpent.toLocaleString()}
                  </h2>
                </div>

                <div>
                  <p className="text-sm text-black">
                    Payment Method
                  </p>

                  <h2 className="text-xl font-semibold text-gray-500">
                    {customer?.payment_method || "N/A"}
                  </h2>
                </div>
              </div>
            </div>

            {/* ORDERS */}
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-black">
                        Order #{order.id.slice(0, 6)}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(
                          order.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          order.order_status === "delivered"
                            ? "bg-green-100 text-green-700"
                            : order.order_status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}>
                        {order.order_status}
                      </span>
                    </div>
                  </div>

                  {/* ADDRESS */}
                  <div className="mt-6 rounded-xl border p-4">
                    <h3 className="mb-2 font-semibold text-black">
                      Delivery Address
                    </h3>

                    <p className="text-gray-500">{order.address?.street}</p>
                    <p className="text-gray-500">
                      {order.address?.city},{" "}
                      {order.address?.country}
                    </p>
                    <p className="text-gray-500">{order.address?.landmark}</p>
                  </div>

                  {/* ITEMS */}
                  <div className="mt-6">
                    <h3 className="mb-4 font-semibold text-black">
                      Ordered Items
                    </h3>

                    <div className="space-y-3">
                      {order.items?.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-xl border p-4"
                          >
                            <div className="flex items-center gap-4">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-16 w-16 rounded-xl object-cover"
                              />

                              <div>
                                <p className="font-semibold text-black">
                                  {item.name}
                                </p>

                                <p className="text-sm text-gray-500">
                                  Qty: {item.quantity}
                                </p>
                              </div>
                            </div>

                            <p className="font-semibold text-black">
                              ₦
                              {Number(
                                item.price
                              ).toLocaleString()}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}