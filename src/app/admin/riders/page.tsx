"use client";

import AdminSidebar from "@/components/admin-sidebar";
import { supabase } from "@/lib/supabase";
import { Bike, Plus, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

type Rider = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
};

export default function RidersPage() {
  const [loading, setLoading] = useState(true);

  const [riders, setRiders] = useState<Rider[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function fetchRiders() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("riders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRiders(data || []);
    } catch (error) {
      console.log(error);

      toast.error("Failed to fetch riders");
    } finally {
      setLoading(false);
    }
  }

  async function createRider() {
    try {
      if (!name || !phone || !email || !password) {
        toast.error("Please fill all fields");

        return;
      }

      const res = await fetch("/api/create-rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          phone,
          email,
          password,
          status: "available",
        }),
      });

      const result = await res.json();
      if(!res.ok) throw new Error(result.error);

      toast.success("Rider created successfully");

      setName("");
      setPhone("");
      setEmail("");
      setPassword("");

      fetchRiders();
    } catch (error) {
      console.log(error);

      toast.error("Failed to add rider");
    }
  }

  async function deleteRider(riderId: string) {
    try {
      if (!confirm("Are you sure you want to remove this rider?")) {
        return;
      }

      const res = await fetch("/api/delete-rider", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success("Rider removed successfully");
      fetchRiders();
    } catch (error) {
      console.log(error);
      toast.error("Failed to remove rider");
    }
  }

  async function updateRiderStatus(
    riderId: string,
    status: string
  ) {
    try {
      const { error } = await supabase
        .from("riders")
        .update({
          status,
        })
        .eq("id", riderId);

      if (error) throw error;

      toast.success("Rider updated");

      fetchRiders();
    } catch (error) {
      console.log(error);

      toast.error("Failed to update rider");
    }
  }

  useEffect(() => {
    async function loadRiders(){
      await fetchRiders();
    }
    loadRiders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <Toaster richColors position="top-right" />

      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">
            Riders Management
          </h1>

          <p className="mt-2 text-gray-500">
            Manage delivery riders and assignments.
          </p>
        </div>

        {/* CREATE RIDER */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-black">
            Add New Rider
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="rounded-xl border border-gray-300 px-4 py-3 text-black outline-none focus:border-black"
            />

            <input
              type="text"
              placeholder="Phone"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              className="rounded-xl border border-gray-300 px-4 py-3 text-black outline-none focus:border-black"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="rounded-xl border border-gray-300 px-4 py-3 text-black outline-none focus:border-black"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="rounded-xl border border-gray-300 px-4 py-3 text-black outline-none focus:border-black"
            />
          </div>

          <button
            onClick={createRider}
            className="mt-6 flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-300 hover:text-black transition-all duration-200"
          >
            <Plus size={18} />

            Add Rider
          </button>
        </div>

        {/* RIDERS */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <p className="text-lg font-semibold text-gray-500">
              Loading riders...
            </p>
          </div>
        ) : riders.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-2xl bg-white">
            <Bike size={50} className="text-gray-400" />

            <p className="mt-4 text-lg font-semibold text-gray-600">
              No riders found
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {riders.map((rider) => (
              <div
                key={rider.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-gray-100 p-4">
                    <User size={24} color="grey"/>
                  </div>

                  <div>
                    <h2 className="font-bold text-black">
                      {rider.full_name}
                    </h2>

                    <p className="text-sm text-gray-500">
                      {rider.email}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-2 text-sm">
                  <p className="text-gray-600">
                    Phone:{" "}
                    <span className="font-semibold text-black">
                      {rider.phone}
                    </span>
                  </p>

                  <p className="text-gray-600">
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        rider.status === "available"
                          ? "text-green-600"
                          : rider.status === "busy"
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {rider.status}
                    </span>
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      updateRiderStatus(
                        rider.id,
                        "available"
                      )
                    }
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors"
                  >
                    Available
                  </button>

                  <button
                    onClick={() =>
                      updateRiderStatus(
                        rider.id,
                        "busy"
                      )
                    }
                    className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors"
                  >
                    Busy
                  </button>

                  <button
                    onClick={() =>
                      updateRiderStatus(
                        rider.id,
                        "offline"
                      )
                    }
                    className="rounded-xl bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors"
                  >
                    Offline
                  </button>

                  <button
                    onClick={() => deleteRider(rider.id)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}