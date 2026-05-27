import { supabase } from "./supabase";

export async function getUserRole() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  if (!user) return null;

  const { data, error } = await supabase
    .from("admins")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    console.log(error);
    return null;
  }

  return data.role;
}