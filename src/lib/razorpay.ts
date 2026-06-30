// ─────────────────────────────────────────────────────────────
// Razorpay — client helpers & configuration
// ─────────────────────────────────────────────────────────────
// Online fee payments (parent portal) are processed through Razorpay.
// • The public Key ID is exposed to the browser to open Checkout.
// • The Key Secret stays server-side (API routes) to create orders and
//   verify payment signatures — it is NEVER prefixed with NEXT_PUBLIC.
//
// When the public key is absent the app falls back to the simulated demo
// payment flow, so previews keep working without a Razorpay account.
// ─────────────────────────────────────────────────────────────

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
export const isRazorpayConfigured = Boolean(RAZORPAY_KEY_ID);

export interface RazorpayOrder {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

let scriptPromise: Promise<boolean> | null = null;

/** Lazily inject the Razorpay Checkout script. */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/** Create a Razorpay order on the server for the given invoice/amount. */
export async function createRazorpayOrder(args: {
  amount: number; invoiceId?: string; studentId?: string;
}): Promise<RazorpayOrder> {
  const res = await fetch("/api/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Order failed" }));
    throw new Error(error || "Could not start payment.");
  }
  return res.json();
}

/**
 * Verify a completed payment's signature on the server. Passing the invoice
 * context lets the server record the payment (and update the invoice) directly,
 * which is required in Firebase mode where parents can't write those docs.
 * `recorded` is true when the server persisted it.
 */
export async function verifyRazorpayPayment(
  payload: RazorpaySuccess,
  context?: { invoiceId: string; studentId: string; amount: number },
): Promise<{ verified: boolean; recorded: boolean; receiptNo?: string }> {
  const res = await fetch("/api/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, ...context }),
  });
  if (!res.ok) return { verified: false, recorded: false };
  const data = await res.json();
  return { verified: Boolean(data.verified), recorded: Boolean(data.recorded), receiptNo: data.receiptNo };
}
