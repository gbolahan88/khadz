import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: object
) {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: "default",
        priority: "high",
        channelId: "default",
        badge: 1,
      }),
    });
  } catch (e) {
    console.warn("Push send failed:", e);
  }
}

async function writeNotification(params: {
  recipientRole: "admin" | "rider" | "customer";
  title: string;
  body: string;
  orderId: string;
  riderId?: string;
  userId?: string;
}) {
  await supabaseAdmin.from("notifications").insert({
    recipient_role: params.recipientRole,
    title: params.title,
    body: params.body,
    order_id: params.orderId,
    rider_id: params.riderId ?? null,
    user_id: params.userId ?? null,
    read: false,
  });
}

export async function POST(req: Request) {
  const { event, order_id } = await req.json();

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // ── NEW ORDER → notify admin ──────────────────────────────────────────
  if (event === "new_order") {
    await writeNotification({
      recipientRole: "admin",
      title: "New Order Received 🛍️",
      body: `${order.customer_name || "A customer"} placed an order for ₦${Number(order.total_amount).toLocaleString()}`,
      orderId: order_id,
    });

    // Also send push to customer confirming order
    const { data: tokenRow } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("user_id", order.user_id)
      .single();

    if (tokenRow?.token) {
      await sendExpoPush(
        tokenRow.token,
        "Order Confirmed! 🎉",
        `Your order of ₦${Number(order.total_amount).toLocaleString()} has been received.`,
        { order_id }
      );
    }

    return NextResponse.json({ success: true });
  }

  // ── STATUS CHANGED (admin updates order_status) → notify customer ──────
  if (event === "status_changed") {
    const statusMessages: Record<string, { title: string; body: string }> = {
      preparing: {
        title: "We're preparing your order 👨‍🍳",
        body: "Your order is being freshly prepared. Sit tight!",
      },
      "on the way": {
        title: "Your order is on its way! 🛵",
        body: "Your rider has picked up your order and is heading to you.",
      },
      delivered: {
        title: "Order delivered! 🎉",
        body: "Your order has been delivered. Enjoy your meal!",
      },
      cancelled: {
        title: "Order cancelled ❌",
        body: "Your order has been cancelled. Contact support if this was a mistake.",
      },
    };

    const content =
      statusMessages[order.order_status?.toLowerCase()] || {
        title: "Order Update",
        body: `Your order status: ${order.order_status}`,
      };

    // Write to customer notifications page
    await writeNotification({
      recipientRole: "customer",
      title: content.title,
      body: content.body,
      orderId: order_id,
      userId: order.user_id,
    });

    // Send push to customer
    const { data: tokenRow } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("user_id", order.user_id)
      .single();

    if (tokenRow?.token) {
      await sendExpoPush(tokenRow.token, content.title, content.body, { order_id });
    }

    return NextResponse.json({ success: true });
  }

  // ── RIDER ASSIGNED → notify rider via bell ─────────────────────────────
  if (event === "rider_assigned") {
    await writeNotification({
      recipientRole: "rider",
      riderId: order.rider_id,
      title: "New Delivery Assigned 🛵",
      body: `Deliver to ${order.address?.street}, ${order.address?.city}. Customer: ${order.customer_name}`,
      orderId: order_id,
    });

    return NextResponse.json({ success: true });
  }

  // ── DELIVERY UPDATE (rider updates status) → notify customer ───────────
  if (event === "delivery_update") {
    const deliveryMessages: Record<string, { title: string; body: string }> = {
      "picked up": {
        title: "Order picked up! 📦",
        body: "Your rider has picked up your order and is on the way.",
      },
      arriving: {
        title: "Almost there! 🏃",
        body: "Your rider is almost at your location.",
      },
      delivered: {
        title: "Order delivered! 🎉",
        body: "Your order has been delivered. Enjoy your meal!",
      },
    };

    const content = deliveryMessages[order.delivery_status?.toLowerCase()] || {
      title: "Delivery Update",
      body: `Delivery status: ${order.delivery_status}`,
    };

    // Write to customer notifications page
    await writeNotification({
      recipientRole: "customer",
      title: content.title,
      body: content.body,
      orderId: order_id,
      userId: order.user_id,
    });

    // Send push to customer
    const { data: tokenRow } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("user_id", order.user_id)
      .single();

    if (tokenRow?.token) {
      await sendExpoPush(tokenRow.token, content.title, content.body, { order_id });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown event" }, { status: 400 });
}