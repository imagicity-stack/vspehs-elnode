import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifies a completed Razorpay payment by recomputing the HMAC-SHA256
// signature of `order_id|payment_id` with the secret key.
export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);
  const verified = a.length === b.length && crypto.timingSafeEqual(a, b);

  return NextResponse.json({ verified }, { status: verified ? 200 : 400 });
}
