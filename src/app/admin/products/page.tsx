"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { Plus, PackageSearch, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

type Product = {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  rating: number;
  availability_status: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProducts() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.log(error);

      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id: string) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setProducts((prev) =>
        prev.filter((product) => product.id !== id)
      );

      toast.success("Product deleted");
    } catch (error) {
      console.log(error);

      toast.error("Failed to delete product");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProducts();
    }, 0);

    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <Toaster richColors position="top-right" />

      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">
              Products
            </h1>

            <p className="mt-2 text-gray-500">
              Manage burger products.
            </p>
          </div>

          <button 
            onClick={() => window.location.href = "/admin/products/create"}
            className="flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-300 hover:text-black transition-all duration-300">
            <Plus size={18} />

            Add Product
          </button>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <p className="text-lg font-semibold text-gray-500">
              Loading products...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-2xl bg-white">
            <PackageSearch size={50} className="text-gray-400" />

            <p className="mt-4 text-lg font-semibold text-gray-600">
              No products found
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-56 w-full object-cover"
                />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-black">
                        {product.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {product.category}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {product.availability_status}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        Price
                      </p>

                      <h3 className="text-2xl font-bold text-black">
                        ₦{Number(product.price).toLocaleString()}
                      </h3>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Rating
                      </p>

                      <p className="font-semibold text-black">
                        ⭐ {product.rating}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button 
                      onClick={() => window.location.href = `/admin/products/${product.id}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-300 hover:text-black transition-all duration-300">
                      <Pencil size={18} />

                      Edit
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="flex items-center justify-center rounded-xl bg-red-500 px-4 py-3 text-white hover:bg-white hover:text-black duration-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}