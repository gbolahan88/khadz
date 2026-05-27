import { supabase } from "./supabase";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (adminError || !admin) {
    await supabase.auth.signOut();

    throw new Error("Unauthorized access");
  }

  return {
    user: data.user,
    admin,
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) return null;

  //Verify if user is admin
  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("*")
    .eq("id", user.id)
    .single();

  if (adminError || !admin) {
    return null;
  }

  return {user, admin};
}
