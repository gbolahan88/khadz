"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast, Toaster } from "sonner";

export default function CreateProductPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState("");
  const [availabilityStatus, setAvailabilityStatus] =
    useState("In Stock");

  async function handleCreateProduct(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);

      console.log("Submitting product...");

      const payload = {
        name,
        price: Number(price),
        image,
        category,
        description,
        rating: Number(rating),
        delivery_info: deliveryInfo,
        availability_status: availabilityStatus,
      };

      console.log("PAYLOAD:", payload)

      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select()
        .single();

      console.log("SUPABASE RESPONSE:", data);

      if (error) { 
        console.log("Supabase error:", error);
        
        toast.error(error.message);

        return;
      }

      toast.success("Product created successfully");

      router.push("/admin/products");
    } catch (error) {
      console.log(error);

      toast.error("Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <Toaster richColors position="top-right" />

      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        {/* HEADER */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/admin/products"
            className="rounded-xl bg-white p-3 shadow-sm"
          >
            <ArrowLeft size={20} color="black"/>
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-black">
              Add Product
            </h1>

            <p className="mt-1 text-gray-500">
              Create a new burger product.
            </p>
          </div>
        </div>

        {/* FORM */}
        <div className="max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <form
            onSubmit={handleCreateProduct}
            className="space-y-6"
          >
            {/* PRODUCT NAME */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Product Name
              </label>

              <input
                type="text"
                placeholder="Cheese Burger"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* PRICE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Price
              </label>

              <input
                type="number"
                placeholder="4500"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* IMAGE URL */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Image URL
              </label>

              <input
                type="text"
                placeholder="https://..."
                value={image}
                onChange={(e) =>
                  setImage(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Category
              </label>

              <input
                type="text"
                placeholder="Burger"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Description
              </label>

              <textarea
                placeholder="Product description..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                className="min-h-[120px] w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* RATING */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Rating
              </label>

              <input
                type="number"
                step="0.1"
                placeholder="4.5"
                value={rating}
                onChange={(e) =>
                  setRating(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* DELIVERY INFO */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Delivery Info
              </label>

              <input
                type="text"
                placeholder="20-30 mins"
                value={deliveryInfo}
                onChange={(e) =>
                  setDeliveryInfo(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* AVAILABILITY */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Availability Status
              </label>

              <select
                value={availabilityStatus}
                onChange={(e) =>
                  setAvailabilityStatus(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
              >
                <option value="In Stock">
                  In Stock
                </option>

                <option value="Out of Stock">
                  Out of Stock
                </option>
              </select>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-black font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Creating Product..."
                : "Create Product"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}