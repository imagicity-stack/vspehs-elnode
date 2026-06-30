import { NextResponse } from "next/server";
import crypto from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifies a completed Razorpay payment by recomputing the HMAC-SHA256
// signature of `order_id|payment_id` with the secret key. On success, and when
// Firebase Admin is configured, it ALSO records the payment + updates the
// invoice server-side — parents can't write payments/invoices directly under
// the Firestore rules, so this is what persists an online payment.
export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    invoiceId?: string;
    studentId?: string;
    amount?: number;
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

  if (!verified) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  // Record the payment server-side (bypasses client rules) when possible.
  let receiptNo: string | undefined;
  const app = getAdminApp();
  if (app && body.invoiceId && body.studentId && body.amount && body.amount > 0) {
    try {
      const db = getFirestore(app);
      receiptNo = `RC-${5000 + Math.floor(Math.random() * 4000)}`;
      const paymentId = `pay-${razorpay_payment_id}`;
      await db.collection("payments").doc(paymentId).set({
        id: paymentId,
        receiptNo,
        invoiceId: body.invoiceId,
        studentId: body.studentId,
        amount: body.amount,
        method: "upi",
        date: new Date().toISOString().slice(0, 10),
        collectedBy: "online",
        reference: razorpay_payment_id,
      });
      // Update the invoice's paid amount + status.
      const invRef = db.collection("invoices").doc(body.invoiceId);
      const snap = await invRef.get();
      if (snap.exists) {
        const inv = snap.data() as { total: number; paid: number; status: string };
        const paid = (inv.paid ?? 0) + body.amount;
        const status = paid >= inv.total ? "paid" : paid > 0 ? "partial" : inv.status;
        await invRef.set({ paid, status }, { merge: true });
      }
    } catch (e) {
      // Verification still succeeded; report that recording failed.
      return NextResponse.json({ verified: true, recorded: false, error: (e as Error)?.message });
    }
  }

  return NextResponse.json({ verified: true, recorded: Boolean(receiptNo), receiptNo });
}
