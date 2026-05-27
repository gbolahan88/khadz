import { supabase } from "./supabase";

export interface Customer {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data as Customer[] | null, error };
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  return { data: data as Customer | null, error };
}

export async function updateCustomer(
  id: string,
  updates: Partial<Omit<Customer, "id" | "created_at">>
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .single();

  return { data: data as Customer | null, error };
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);

  return { error };
}
