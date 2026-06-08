import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: Request) {
  const { riderId } = await req.json();

  if (!riderId) {
    return NextResponse.json(
      { error: "Rider ID is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Delete from riders table
    const { error: riderError } = await supabaseAdmin
      .from("riders")
      .delete()
      .eq("id", riderId);

    if (riderError) throw riderError;

    // 2. Delete from admins table
    const { error: adminError } = await supabaseAdmin
      .from("admins")
      .delete()
      .eq("id", riderId);

    if (adminError) throw adminError;

    // 3. Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      riderId
    );

    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete rider error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
