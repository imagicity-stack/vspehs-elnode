import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates a Razorpay order for an online fee payment.
// Requires server env: RAZORPAY_KEY_SECRET (+ a key id, public or private).
export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: { amount?: number; invoiceId?: string; studentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // Razorpay expects the smallest unit (paise)
      currency: "INR",
      receipt: body.invoiceId || `rcpt_${Date.now()}`,
      notes: { invoiceId: body.invoiceId || "", studentId: body.studentId || "" },
    }),
  });

  if (!rzpRes.ok) {
    const detail = await rzpRes.text().catch(() => "");
    return NextResponse.json({ error: "Order creation failed.", detail }, { status: 502 });
  }

  const order = await rzpRes.json();
  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
  });
}
