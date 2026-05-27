import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Sends an Expo push notification to a specific user
async function sendExpoPush(token: string, title: string, body: string, data?: object) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data: data || {},
      sound: "default",
      priority: "high",
    }),
  });

  return response.json();
}

export async function POST(req: Request) {
  const { user_id, title, body, data } = await req.json();

  if (!user_id || !title || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get the user's push token
  const { data: tokenRow, error } = await supabaseAdmin
    .from("push_tokens")
    .select("token")
    .eq("user_id", user_id)
    .single();

  if (error || !tokenRow) {
    return NextResponse.json({ error: "No push token found for user" }, { status: 404 });
  }

  const result = await sendExpoPush(tokenRow.token, title, body, data);

  return NextResponse.json({ success: true, result });
}