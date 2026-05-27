import { supabase } from "./supabase";

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  created_at: string | null;
}

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function createProduct(product: {
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}) {
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        ...product,
      },
    ])
    .single();

  return { data, error };
}

export async function updateProduct(
  id: number,
  updates: {
    name?: string;
    description?: string;
    price?: number;
    image_url?: string;
  }
) {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .single();

  return { data, error };
}

export async function deleteProductById(id: number) {
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .single();

  return { data, error };
}
