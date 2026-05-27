"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

type Customer = {
  user_id: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
};

type Order = {
  user_id: string;
  total_amount: number;
  created_at: string;
  user_email?: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  async function fetchCustomers() {
    try {
      setLoading(true);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const groupedCustomers: Record<string, Customer> = {};

      (orders || []).forEach((order: Order) => {
        if (!groupedCustomers[order.user_id]) {
          groupedCustomers[order.user_id] = {
            user_id: order.user_id,
            email: order.user_email || "No Email",
            totalOrders: 0,
            totalSpent: 0,
            lastOrder: order.created_at,
          };
        }

        groupedCustomers[order.user_id].totalOrders += 1;

        groupedCustomers[order.user_id].totalSpent += Number(
          order.total_amount || 0
        );

        if (
          new Date(order.created_at) >
          new Date(groupedCustomers[order.user_id].lastOrder)
        ) {
          groupedCustomers[order.user_id].lastOrder =
            order.created_at;
        }
      });

      setCustomers(Object.values(groupedCustomers));
    } catch (error) {
      console.log(error);

      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCustomers() {
      await fetchCustomers();
    }

    loadCustomers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <Toaster richColors position="top-right" />

      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">
            Customers
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor customer activity and spending.
          </p>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <p className="text-lg font-semibold text-gray-500">
              Loading customers...
            </p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-2xl bg-white">
            <Users size={50} className="text-gray-400" />

            <p className="mt-4 text-lg font-semibold text-gray-600">
              No customers found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="min-w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Orders
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Total Spent
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Last Order
                  </th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.user_id}
                    onClick={() => router.push(`/admin/customers/${customer.user_id}`)}
                    className="border-b hover:bg-gray-100 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-black">
                          {customer.email}
                        </p>

                        <p className="text-xs text-gray-400">
                          {customer.user_id.slice(0, 8)}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-black">
                      {customer.totalOrders}
                    </td>

                    <td className="px-6 py-4 font-semibold text-black">
                      ₦
                      {customer.totalSpent.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-gray-500">
                      {new Date(
                        customer.lastOrder
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}