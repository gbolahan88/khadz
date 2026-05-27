"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();

  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState("");
  const [availabilityStatus, setAvailabilityStatus] =
    useState("In Stock");

  async function fetchProduct() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;

      setName(data.name || "");
      setPrice(String(data.price || ""));
      setImage(data.image || "");
      setCategory(data.category || "");
      setDescription(data.description || "");
      setRating(String(data.rating || ""));
      setDeliveryInfo(data.delivery_info || "");
      setAvailabilityStatus(
        data.availability_status || "In Stock"
      );
    } catch (error) {
      console.log(error);

      toast.error("Failed to fetch product");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;

      await fetchProduct();
    }
    
    loadProduct();
  }, [productId]);

  async function handleUpdateProduct(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setSaving(true);

      const { error } = await supabase
        .from("products")
        .update({
          name,
          price: Number(price),
          image,
          category,
          description,
          rating: Number(rating),
          delivery_info: deliveryInfo,
          availability_status: availabilityStatus,
        })
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product updated");

      router.push("/admin/products");
    } catch (error) {
      console.log(error);

      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold">
          Loading product...
        </p>
      </div>
    );
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
            <ArrowLeft size={20} color="black" />
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-black">
              Edit Product
            </h1>

            <p className="mt-1 text-gray-500">
              Update burger product information.
            </p>
          </div>
        </div>

        {/* FORM */}
        <div className="max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <form
            onSubmit={handleUpdateProduct}
            className="space-y-6"
          >
            {/* NAME */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Product Name
              </label>

              <input
                type="text"
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
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* IMAGE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Image URL
              </label>

              <input
                type="text"
                value={image}
                onChange={(e) =>
                  setImage(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />

              {image && (
                <img
                  src={image}
                  alt="Preview"
                  className="mt-4 h-40 w-40 rounded-xl object-cover"
                />
              )}
            </div>

            {/* CATEGORY */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Category
              </label>

              <input
                type="text"
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
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                className="min-h-30 w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
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
                value={deliveryInfo}
                onChange={(e) =>
                  setDeliveryInfo(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 text-black outline-none focus:border-black"
                required
              />
            </div>

            {/* STATUS */}
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
              disabled={saving}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-black font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {saving
                ? "Updating Product..."
                : "Update Product"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}