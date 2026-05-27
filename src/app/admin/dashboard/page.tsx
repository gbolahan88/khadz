"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Clock3,
} from "lucide-react";
import { 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar, 
} from "recharts";
import { useEffect, useState  } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/get-user-role";

type Order ={
  total_amount: number;
  order_status: string;
  created_at: string;
};

export default function DashboardPage() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [revenue, setRevenue] = useState(0);

  const [chartData, setChartData] = useState<{
    date: string;
    revenue: number;
    orders: number;
  }[]>([]);

  useEffect(() => {
    async function checkAccess() {
      const role = await getUserRole();

      if (
        role !== "admin" &&
        role !== "super_admin"
      ) {
        router.push("/rider/dashboard");
      }
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // FETCH ORDERS
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", {
            ascending: true,
          });

        if (ordersError) {
          console.log("Error fetching orders:", ordersError);
          throw ordersError;
        }
        
        // FETCH PRODUCTS
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("*");

        if (productsError) {
          console.log("Error fetching products:", productsError);
          throw productsError;
        }

        // TOTAL ORDERS
        setTotalOrders(orders?.length || 0);

        // TOTAL PRODUCTS
        setTotalProducts(products?.length || 0);

        // PENDING ORDERS
        const pending =
          orders?.filter(
            (order) =>
              order.order_status?.toLowerCase() === "preparing"
          ).length || 0;

        setPendingOrders(pending);

        // TOTAL REVENUE
        const totalRevenue =
          orders?.reduce(
            (sum, order) => sum + Number(order.total_amount || 0),
            0
          ) || 0;

        setRevenue(totalRevenue);

        // CHART DATA
        const grouped: Record<
        string,
        {
          revenue: number;
          orders: number;
        }> = {};

        orders?.forEach((order: Order) => {
          const date = new Date(
            order.created_at || ""
          ).toLocaleDateString();

          if (!grouped[date]) {
            grouped[date] = {
              revenue: 0,
              orders: 0,
            };
          }

          grouped[date].revenue += Number(
            order.total_amount || 0
          );

          grouped[date].orders += 1;
        });

        const formattedChartData = Object.entries(
          grouped
        ).map(([date, values]) => ({
          date,
          revenue: values.revenue,
          orders: values.orders,
        }));

        setChartData(formattedChartData);
      } catch (error) {
        console.log("Dashboard data fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
    fetchDashboardData();
  }, []);

  const cards = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: ShoppingBag,
      color: "red",
    },
    {
      title: "Products",
      value: totalProducts,
      icon: Package, 
      color: "blue",
    },
    {
      title: "Pending Orders",
      value: pendingOrders,
      icon: Clock3,
      color: "orange",
    },
    {
      title: "Revenue",
      value: `₦${revenue.toLocaleString()}`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 md:flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .order-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .action-btn { transition: opacity 0.15s, transform 0.1s; }
        .action-btn:active { transform: scale(0.97); }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tab-btn { transition: all 0.2s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      `}</style>
      
      {/* Header */}
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-black">
            Dashboard
          </h1>

          <p className="mt-1 text-gray-500">
            Monitor orders, revenue, and products.
          </p>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <p className="text-lg font-semibold text-gray-500">
              Loading dashboard...
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          {card.title}
                        </p>

                        <h2 className="mt-2 text-3xl font-bold text-black">
                          {card.value}
                        </h2>
                      </div>

                      <div className="rounded-xl bg-gray-100 p-3">
                        <Icon size={24} color={card.color || "green"} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CHARTS */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* REVENUE CHART */}
              <div className="rounded-2xl text-black bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-black">
                  Revenue Analytics
                </h2>

                <ResponsiveContainer
                  width="100%"
                  height={400}
                >
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="date" />

                    <YAxis />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="red"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* ORDERS CHART */}
              <div className="rounded-2xl text-black bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-black">
                  Orders Analytics
                </h2>

                <ResponsiveContainer
                  width="100%"
                  height={400}
                >
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="date" />

                    <YAxis allowDecimals={false} />

                    <Tooltip/>

                    <Bar
                      dataKey="orders"
                      fill="orange"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-black">
                Recent Activity
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border p-4">
                  <p className="font-medium text-black">
                    Orders are now being tracked live.
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Your dashboard analytics are connected to Supabase.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}