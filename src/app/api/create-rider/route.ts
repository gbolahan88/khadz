import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { full_name, phone, email, password } = await req.json();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone_number: phone },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const userId = authData.user.id;

  // 2. Insert into admins with role = 'rider'
  const { error: adminError } = await supabaseAdmin
    .from("admins")
    .insert({ id: userId, email, role: "rider" });

  if (adminError) return NextResponse.json({ error: adminError.message }, { status: 400 });

  // 3. Insert into riders table
  const { error: riderError } = await supabaseAdmin
    .from("riders")
    .insert({ id: userId, full_name, phone, email, status: "offline" });

  if (riderError) return NextResponse.json({ error: riderError.message }, { status: 400 });

  return NextResponse.json({ success: true });
}