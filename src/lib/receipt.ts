// ─────────────────────────────────────────────────────────────
// Fee payment receipt → downloadable PDF (jsPDF)
// ─────────────────────────────────────────────────────────────
// Beautiful, self-contained A4 receipt: school header (ehs.png logo),
// student + parent details, fee-head breakdown, amount paid, balance,
// amount in words, and payment mode/txn id. One click downloads a PDF.
// ─────────────────────────────────────────────────────────────

import type { Payment, Invoice, Student } from "./types";

const ISSUER = "The Elden Heights School";
const TAGLINE = "Towards Eternal Glory";
const WEBSITE = "www.eldenheights.org";

// Palette (RGB)
const NAVY: [number, number, number] = [31, 45, 90];
const ACCENT: [number, number, number] = [29, 64, 245];
const DARK: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const ZEBRA: [number, number, number] = [247, 249, 252];

const money = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

function numberToWordsIndian(input: number): string {
  let n = Math.round(input);
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number): string => (x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : ""));
  const three = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    return (h ? ones[h] + " Hundred" + (r ? " " : "") : "") + (r ? two(r) : "");
  };
  let out = "";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) out += two(crore) + " Crore ";
  if (lakh) out += two(lakh) + " Lakh ";
  if (thousand) out += two(thousand) + " Thousand ";
  if (n) out += three(n);
  return out.trim();
}

async function loadLogo(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

const fmtDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export interface ReceiptData {
  payment: Payment;
  invoice?: Invoice;
  student?: Student;
  className?: string;
  collectedByName?: string;
}

export async function downloadReceipt(data: ReceiptData): Promise<void> {
  const { payment, invoice, student, className, collectedByName } = data;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 42;
  const CW = PW - 2 * M;

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  // ── Header ──────────────────────────────────────────────
  const logo = await loadLogo("/ehs.png");
  let nameX = M;
  if (logo) {
    const box = 54;
    const ratio = logo.w / logo.h;
    const w = ratio >= 1 ? box : box * ratio;
    const h = ratio >= 1 ? box / ratio : box;
    doc.addImage(logo.dataUrl, "PNG", M, M, w, h);
    nameX = M + box + 14;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  setColor(NAVY);
  doc.text(ISSUER, nameX, M + 6, { baseline: "top" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  setColor(GRAY);
  doc.text(TAGLINE, nameX, M + 28, { baseline: "top" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(WEBSITE, nameX, M + 42, { baseline: "top" });

  // Receipt meta box (right)
  const boxW = 150, boxH = 54, boxX = PW - M - boxW, boxY = M;
  fill([245, 247, 250]);
  stroke(LINE);
  doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(NAVY);
  doc.text("FEE RECEIPT", boxX + boxW / 2, boxY + 12, { align: "center", baseline: "top" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(DARK);
  doc.text(`No: ${payment.receiptNo}`, boxX + 10, boxY + 28, { baseline: "top" });
  doc.text(`Date: ${fmtDate(payment.date)}`, boxX + 10, boxY + 40, { baseline: "top" });

  let y = M + 78;
  stroke(NAVY);
  doc.setLineWidth(1.5);
  doc.line(M, y, PW - M, y);
  doc.setLineWidth(1);
  y += 18;

  // ── Received from ───────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(GRAY);
  doc.text("RECEIVED WITH THANKS FROM", M, y, { baseline: "top" });
  y += 16;

  const colR = M + CW / 2 + 8;
  const cell = (x: number, yy: number, label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(GRAY);
    doc.text(label.toUpperCase(), x, yy, { baseline: "top" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    setColor(DARK);
    doc.text(value || "—", x, yy + 10, { baseline: "top", maxWidth: CW / 2 - 12 });
  };

  const parent = student ? [student.fatherName, student.motherName].filter(Boolean).join(" / ") : "";
  cell(M, y, "Student Name", student ? `${student.firstName} ${student.lastName}` : "—");
  cell(colR, y, "Parent Name", parent);
  y += 34;
  cell(M, y, "Admission No", student?.admissionNo ?? "—");
  cell(colR, y, "Contact", student?.primaryContact ?? "—");
  y += 34;
  cell(M, y, "Class", className || "—");
  cell(colR, y, "Invoice / Period", invoice ? `${invoice.invoiceNo} · ${invoice.period}` : "—");
  y += 40;

  // ── Fee particulars table ───────────────────────────────
  const amtX = PW - M - 8;
  const rowH = 22;
  // header
  fill(NAVY);
  doc.rect(M, y, CW, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColor([255, 255, 255]);
  doc.text("PARTICULARS", M + 8, y + 7, { baseline: "top" });
  doc.text("AMOUNT", amtX, y + 7, { align: "right", baseline: "top" });
  y += rowH;

  const lines = invoice?.lines?.length ? invoice.lines : [{ feeHeadId: "x", name: "Fee Payment", amount: payment.amount }];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  lines.forEach((l, i) => {
    if (i % 2 === 1) { fill(ZEBRA); doc.rect(M, y, CW, rowH, "F"); }
    setColor(DARK);
    doc.text(l.name, M + 8, y + 7, { baseline: "top", maxWidth: CW - 110 });
    doc.text(money(l.amount), amtX, y + 7, { align: "right", baseline: "top" });
    y += rowH;
  });

  const drawSummary = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number]; fillBg?: [number, number, number] }) => {
    if (opts?.fillBg) { fill(opts.fillBg); doc.rect(M, y, CW, rowH, "F"); }
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(10);
    setColor(opts?.color ?? DARK);
    doc.text(label, M + 8, y + 7, { baseline: "top" });
    doc.text(value, amtX, y + 7, { align: "right", baseline: "top" });
    y += rowH;
  };

  stroke(LINE);
  doc.line(M, y, PW - M, y);

  if (invoice && invoice.discount > 0) drawSummary("Concession / Discount", `- ${money(invoice.discount)}`, { color: [16, 185, 129] });
  if (invoice) drawSummary("Total Fee", money(invoice.total), { bold: true });
  drawSummary("Amount Paid", money(payment.amount), { bold: true, color: NAVY, fillBg: [235, 240, 255] });
  if (invoice) {
    const balance = Math.max(0, invoice.total - invoice.paid);
    drawSummary("Balance Due", balance > 0 ? money(balance) : "Nil", { color: balance > 0 ? [225, 29, 72] : [16, 185, 129] });
  }

  // outer border of table body
  y += 6;

  // ── Amount in words ─────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  setColor(DARK);
  doc.text(`Amount in words: Rupees ${numberToWordsIndian(payment.amount)} only.`, M, y, { baseline: "top", maxWidth: CW });
  y += 24;

  // ── Payment details box ─────────────────────────────────
  const pdH = 52;
  fill([249, 250, 251]);
  stroke(LINE);
  doc.roundedRect(M, y, CW, pdH, 6, 6, "FD");
  const pd = (x: number, label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(GRAY);
    doc.text(label.toUpperCase(), x, y + 12, { baseline: "top" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(DARK);
    doc.text(value || "—", x, y + 24, { baseline: "top" });
  };
  const collector = collectedByName || (payment.collectedBy === "online" ? "Online Payment" : payment.collectedBy);
  pd(M + 14, "Payment Mode", payment.method.toUpperCase());
  pd(M + CW / 3 + 8, "Transaction ID", payment.reference || "—");
  pd(M + (2 * CW) / 3, "Received By", collector);
  y += pdH + 24;

  // ── Footer ──────────────────────────────────────────────
  const footY = PH - 78;
  stroke(ACCENT);
  doc.setLineWidth(2);
  doc.line(M, footY, PW - M, footY);
  doc.setLineWidth(1);

  // signature (right)
  stroke(GRAY);
  doc.line(PW - M - 150, footY + 40, PW - M, footY + 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(GRAY);
  doc.text("Authorised Signatory", PW - M - 75, footY + 46, { align: "center", baseline: "top" });

  doc.setFontSize(8);
  setColor(GRAY);
  doc.text("This is a computer-generated receipt and does not require a physical signature.", M, footY + 14, { baseline: "top" });
  doc.text(`Generated on ${new Date().toLocaleString("en-IN")}`, M, footY + 26, { baseline: "top" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(NAVY);
  doc.text(`${ISSUER} · ${WEBSITE}`, PW / 2, PH - 24, { align: "center", baseline: "top" });

  doc.save(`Receipt-${payment.receiptNo}.pdf`);
}
