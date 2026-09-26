// ─────────────────────────────────────────────────────────────
// Report card → downloadable PDF (jsPDF)
// ─────────────────────────────────────────────────────────────
// A formal A4 report card in the school's own livery: crest, maroon and gold
// rule work, a watermarked badge and a typeset marks table. One page per
// student, so a single file can hold one child, a class or a whole
// examination.
//
// Everything printed comes from the published snapshot — nothing is
// re-derived — so a card reissued next year is identical to the one issued
// today.
// ─────────────────────────────────────────────────────────────

import type { StudentExamResult } from "./types";
import { MARK_STATUS_META } from "./exams";
import {
  SCHOOL_CREST, SCHOOL_LOCATION, SCHOOL_NAME, SCHOOL_TAGLINE, SCHOOL_WEBSITE,
  BRAND_MAROON_RGB, BRAND_GOLD_RGB,
} from "./branding";

type RGB = [number, number, number];

// Crest palette, plus the neutrals and status colours around it.
const MAROON: RGB = BRAND_MAROON_RGB;
const MAROON_DEEP: RGB = [108, 16, 16];
const GOLD: RGB = BRAND_GOLD_RGB;
const GOLD_DEEP: RGB = [176, 142, 56];
const INK: RGB = [26, 26, 28];
const GRAY: RGB = [110, 114, 122];
const LINE: RGB = [222, 224, 228];
const TINT: RGB = [250, 246, 246];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [21, 128, 61];
const RED: RGB = [180, 28, 40];

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Fetches an image and re-encodes it at the size it will actually be printed.
 * jsPDF embeds the decoded bitmap, so handing it a 300 KB source crest costs
 * megabytes *per page* — downscaling first keeps a class set to a sane size.
 * `alpha` renders the artwork faded onto white, for the page watermark.
 */
async function loadImage(
  url: string,
  maxEdge = 220,
  alpha = 1,
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const sourceUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = sourceUrl;
    });

    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale >= 1 && alpha >= 1) {
      return { dataUrl: sourceUrl, w: img.naturalWidth, h: img.naturalHeight };
    }

    const w = Math.max(1, Math.round(img.naturalWidth * Math.min(scale, 1)));
    const h = Math.max(1, Math.round(img.naturalHeight * Math.min(scale, 1)));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { dataUrl: sourceUrl, w: img.naturalWidth, h: img.naturalHeight };
    // A white backdrop keeps a transparent PNG from turning black in the PDF,
    // and is what the faded watermark is blended against.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), w, h };
  } catch {
    return null;
  }
}

/** Format detection from a data URL, so PNG photos aren't mislabelled as JPEG. */
const imageFormat = (dataUrl: string) => (dataUrl.slice(0, 24).includes("png") ? "PNG" : "JPEG");

export interface ReportCardOptions {
  /** Shown under the marks table when the school records it. */
  showAttendance?: boolean;
  /** Filename without the extension. */
  filename?: string;
}

/**
 * Builds the PDF and hands it to the browser. One page per result, in the
 * order given — callers sort first.
 */
export async function downloadReportCards(
  results: StudentExamResult[],
  options: ReportCardOptions = {},
): Promise<void> {
  if (results.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 46;                    // content margin
  const CW = PW - 2 * M;           // content width

  // ── Drawing helpers ───────────────────────────────────────
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (family: "times" | "helvetica" | "courier", style: string, size: number) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
  };
  const charSpace = (n: number) => {
    // Letter-spacing is cosmetic; older builds without it must not throw.
    try { (doc as unknown as { setCharSpace: (v: number) => void }).setCharSpace(n); } catch { /* ignore */ }
  };
  const box = (x: number, y: number, w: number, h: number, r: number, mode: "F" | "S" | "FD") => {
    doc.roundedRect(x, y, w, h, r, r, mode);
  };
  /** Small rounded chip with centred text — used for grades. */
  const chip = (cx: number, cy: number, text: string, bg: RGB, fg: RGB) => {
    font("helvetica", "bold", 8.5);
    const w = Math.max(24, doc.getTextWidth(text) + 12);
    const h = 13;
    fill(bg);
    box(cx - w / 2, cy - h / 2, w, h, 3.5, "F");
    ink(fg);
    doc.text(text, cx, cy + 3, { align: "center" });
  };
  /** Proportional track bar, used for the per-subject performance column. */
  const meter = (x: number, y: number, w: number, pct: number, tone: RGB) => {
    const h = 4.5;
    fill([238, 238, 240]);
    box(x, y, w, h, 2.25, "F");
    const filled = Math.max(0, Math.min(1, pct / 100)) * w;
    if (filled > 0.5) {
      fill(tone);
      box(x, y, filled, h, 2.25, "F");
    }
  };

  const crest = await loadImage(SCHOOL_CREST, 260);
  const watermark = await loadImage(SCHOOL_CREST, 360, 0.05);
  const photoCache = new Map<string, { dataUrl: string; w: number; h: number } | null>();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (i > 0) doc.addPage();

    // ── Watermark ───────────────────────────────────────────
    if (watermark) {
      const size = 330;
      const ratio = watermark.w / watermark.h;
      const w = ratio >= 1 ? size : size * ratio;
      const h = ratio >= 1 ? size / ratio : size;
      try {
        // Centred on the marks table rather than the page, so it sits behind
        // the body copy instead of the grade legend.
        doc.addImage(
          watermark.dataUrl, imageFormat(watermark.dataUrl),
          (PW - w) / 2, (PH - h) / 2 - 24, w, h, "crest-wash", "FAST",
        );
      } catch { /* decoration only */ }
    }

    // ── Page frame: maroon rule with a gold hairline inside ──
    stroke(MAROON);
    doc.setLineWidth(1.6);
    doc.rect(20, 20, PW - 40, PH - 40, "S");
    stroke(GOLD_DEEP);
    doc.setLineWidth(0.5);
    doc.rect(25.5, 25.5, PW - 51, PH - 51, "S");
    doc.setLineWidth(1);

    // ── Masthead ────────────────────────────────────────────
    let y = 44;
    if (crest) {
      const ch = 52;
      const cw = (crest.w / crest.h) * ch;
      try {
        doc.addImage(crest.dataUrl, imageFormat(crest.dataUrl), (PW - cw) / 2, y, cw, ch, "crest", "FAST");
      } catch { /* fall through to the wordmark */ }
      y += ch + 10;
    }

    font("times", "bold", 19);
    ink(MAROON_DEEP);
    charSpace(1.4);
    doc.text(SCHOOL_NAME.toUpperCase(), PW / 2, y, { align: "center", baseline: "top" });
    charSpace(0);
    y += 23;

    font("helvetica", "normal", 8.5);
    ink(GRAY);
    charSpace(0.8);
    doc.text(`${SCHOOL_LOCATION.toUpperCase()}  ·  ${SCHOOL_WEBSITE}`, PW / 2, y, {
      align: "center", baseline: "top",
    });
    charSpace(0);
    y += 14;

    font("times", "italic", 8.5);
    ink(GOLD_DEEP);
    doc.text(SCHOOL_TAGLINE, PW / 2, y, { align: "center", baseline: "top" });
    y += 16;

    // Gold rule with a centred diamond.
    stroke(GOLD_DEEP);
    doc.setLineWidth(0.7);
    doc.line(M, y, PW / 2 - 12, y);
    doc.line(PW / 2 + 12, y, PW - M, y);
    fill(GOLD_DEEP);
    doc.triangle(PW / 2, y - 3.5, PW / 2 + 3.5, y, PW / 2, y + 3.5, "F");
    doc.triangle(PW / 2, y - 3.5, PW / 2 - 3.5, y, PW / 2, y + 3.5, "F");
    doc.setLineWidth(1);
    y += 16;

    // ── Title band ──────────────────────────────────────────
    const bandH = 30;
    fill(MAROON);
    box(M, y, CW, bandH, 4, "F");
    font("helvetica", "bold", 11);
    ink(WHITE);
    charSpace(1.6);
    doc.text(r.groupName.toUpperCase(), M + 14, y + bandH / 2 + 3.6);
    charSpace(0);
    font("helvetica", "normal", 9);
    doc.text(`SESSION ${r.sessionName}`, PW - M - 14, y + bandH / 2 + 3.2, { align: "right" });
    y += bandH + 14;

    // ── Student panel ───────────────────────────────────────
    const photoW = 62, photoH = 74;
    let photo: { dataUrl: string; w: number; h: number } | null | undefined;
    if (r.photoUrl) {
      if (!photoCache.has(r.photoUrl)) photoCache.set(r.photoUrl, await loadImage(r.photoUrl, 260));
      photo = photoCache.get(r.photoUrl);
    }

    const panelH = 78;
    fill(TINT);
    stroke(LINE);
    box(M, y, CW, panelH, 5, "FD");

    if (photo) {
      const px = PW - M - 12 - photoW;
      fill(WHITE);
      stroke(LINE);
      box(px, y + (panelH - photoH) / 2, photoW, photoH, 3, "FD");
      try {
        doc.addImage(
          photo.dataUrl, imageFormat(photo.dataUrl),
          px + 2.5, y + (panelH - photoH) / 2 + 2.5, photoW - 5, photoH - 5,
          `photo-${r.studentId}`, "FAST",
        );
      } catch { /* an unsupported image must not abort the run */ }
    }

    const fieldsW = (photo ? CW - photoW - 30 : CW - 24);
    const colW = fieldsW / 3;
    const field = (col: number, row: number, label: string, value: string) => {
      const fx = M + 14 + col * colW;
      const fy = y + 14 + row * 30;
      font("helvetica", "normal", 6.8);
      ink(GRAY);
      charSpace(0.5);
      doc.text(label.toUpperCase(), fx, fy, { baseline: "top" });
      charSpace(0);
      font("helvetica", "bold", 10);
      ink(INK);
      doc.text(value || "—", fx, fy + 9.5, { baseline: "top", maxWidth: colW - 10 });
    };
    field(0, 0, "Student Name", r.studentName);
    field(1, 0, "Class", r.className);
    field(2, 0, "Roll No", String(r.rollNo));
    field(0, 1, "Admission No", r.admissionNo);
    field(1, 1, "Father's Name", r.fatherName);
    field(2, 1, "Mother's Name", r.motherName);
    y += panelH + 16;

    // ── Marks table ─────────────────────────────────────────
    font("helvetica", "bold", 9);
    ink(MAROON_DEEP);
    charSpace(1.2);
    doc.text("ACADEMIC PERFORMANCE", M, y, { baseline: "top" });
    charSpace(0);
    y += 14;

    type Col = { label: string; w: number; align: "left" | "right" | "center" };
    const cols: Col[] = [
      { label: "SUBJECT", w: CW * 0.30, align: "left" },
      { label: "MAX", w: CW * 0.08, align: "right" },
      { label: "OBTAINED", w: CW * 0.11, align: "right" },
      { label: "%", w: CW * 0.08, align: "right" },
      { label: "PERFORMANCE", w: CW * 0.17, align: "center" },
      { label: "GRADE", w: CW * 0.11, align: "center" },
      { label: "REMARKS", w: CW * 0.15, align: "left" },
    ];
    const colX = (idx: number) => M + cols.slice(0, idx).reduce((s, c) => s + c.w, 0);
    const cellX = (idx: number) => {
      const c = cols[idx];
      return c.align === "right" ? colX(idx) + c.w - 7
        : c.align === "center" ? colX(idx) + c.w / 2
        : colX(idx) + 7;
    };

    // Tighten the rows when a class sits many papers, so the card stays on
    // one page instead of spilling into a second.
    const rowH = r.lines.length > 9 ? 17 : r.lines.length > 6 ? 19 : 21;
    const headH = 21;

    fill(MAROON);
    box(M, y, CW, headH, 3, "F");
    // Square off the bottom corners so the band meets the rows cleanly.
    fill(MAROON);
    doc.rect(M, y + headH - 4, CW, 4, "F");
    font("helvetica", "bold", 7.2);
    ink(WHITE);
    charSpace(0.5);
    cols.forEach((c, idx) => doc.text(c.label, cellX(idx), y + headH / 2 + 2.6, { align: c.align }));
    charSpace(0);
    y += headH;

    const tableTop = y;
    r.lines.forEach((line, idx) => {
      if (idx % 2 === 1) {
        fill(TINT);
        doc.rect(M, y, CW, rowH, "F");
      }
      const mid = y + rowH / 2 + 3;

      font("helvetica", "bold", 9);
      ink(INK);
      doc.text(line.subjectName, cellX(0), mid, { align: "left", maxWidth: cols[0].w - 14 });

      font("helvetica", "normal", 9);
      ink(GRAY);
      doc.text(String(line.maxMarks), cellX(1), mid, { align: "right" });

      // A non-numeric status prints its own short code (AB / ML / EX / NA)
      // where the mark would be — not the grade, which still shows in its own
      // column and would otherwise read as if the paper had been sat.
      font("helvetica", "bold", 9.5);
      ink(line.passed ? INK : RED);
      const obtained = line.obtained === null
        ? MARK_STATUS_META[line.status]?.short ?? "—"
        : String(line.obtained);
      doc.text(obtained, cellX(2), mid, { align: "right" });

      font("helvetica", "normal", 9);
      ink(GRAY);
      doc.text(line.obtained === null ? "—" : `${line.percent}%`, cellX(3), mid, { align: "right" });

      if (line.obtained !== null) {
        const barW = cols[4].w - 24;
        meter(colX(4) + 12, y + rowH / 2 - 2.25, barW, line.percent, line.passed ? MAROON : RED);
      }

      chip(cellX(5), y + rowH / 2, line.grade, line.passed ? [246, 240, 224] : [253, 235, 236],
        line.passed ? GOLD_DEEP : RED);

      font("helvetica", "normal", 7.5);
      ink(GRAY);
      doc.text(line.remarks ?? "", cellX(6), mid, { align: "left", maxWidth: cols[6].w - 12 });

      y += rowH;
    });

    // Totals row
    fill([246, 240, 224]);
    doc.rect(M, y, CW, rowH, "F");
    font("helvetica", "bold", 9.5);
    ink(MAROON_DEEP);
    doc.text("TOTAL", cellX(0), y + rowH / 2 + 3.2, { align: "left" });
    doc.text(String(r.totalMax), cellX(1), y + rowH / 2 + 3.2, { align: "right" });
    doc.text(String(r.totalObtained), cellX(2), y + rowH / 2 + 3.2, { align: "right" });
    doc.text(`${r.percentage}%`, cellX(3), y + rowH / 2 + 3.2, { align: "right" });
    y += rowH;

    // Table outline + column rules
    stroke(LINE);
    doc.setLineWidth(0.6);
    doc.rect(M, tableTop - headH, CW, y - tableTop + headH, "S");
    for (let c = 1; c < cols.length; c++) {
      doc.line(colX(c), tableTop, colX(c), y);
    }
    doc.setLineWidth(1);
    y += 16;

    // ── Summary cards ───────────────────────────────────────
    const summary: { label: string; value: string; tone: RGB }[] = [
      { label: "Marks Obtained", value: `${r.totalObtained} / ${r.totalMax}`, tone: INK },
      { label: "Percentage", value: `${r.percentage}%`, tone: MAROON_DEEP },
      { label: "Overall Grade", value: r.overallGrade, tone: MAROON_DEEP },
      ...(r.rank ? [{ label: "Class Rank", value: `#${r.rank}`, tone: MAROON_DEEP }] : []),
      { label: "Result", value: r.passed ? "PASS" : "FAIL", tone: r.passed ? GREEN : RED },
    ];
    const gap = 9;
    const cardW = (CW - gap * (summary.length - 1)) / summary.length;
    const cardH = 50;
    summary.forEach((s, idx) => {
      const x = M + idx * (cardW + gap);
      fill(WHITE);
      stroke(LINE);
      box(x, y, cardW, cardH, 4, "FD");
      // Gold cap on the card, tying the strip to the crest.
      fill(GOLD);
      doc.rect(x + 4, y, cardW - 8, 2.4, "F");
      font("helvetica", "normal", 6.8);
      ink(GRAY);
      charSpace(0.4);
      doc.text(s.label.toUpperCase(), x + cardW / 2, y + 14, { align: "center", baseline: "top" });
      charSpace(0);
      font("helvetica", "bold", 15);
      ink(s.tone);
      doc.text(s.value, x + cardW / 2, y + 26, { align: "center", baseline: "top" });
    });
    y += cardH + 16;

    // ── Attendance + remarks ────────────────────────────────
    const remarkText = r.classTeacherRemark || (r.passed
      ? "A consistent and sincere performance this term. Keep it up."
      : "Needs focused support in the subjects below the passing mark.");

    const attendanceLine =
      options.showAttendance !== false && typeof r.attendanceRate === "number"
        ? `Attendance ${r.attendanceRate}%`
        : "";
    const failLine = r.failedCount > 0
      ? `${r.failedCount} subject${r.failedCount === 1 ? "" : "s"} below the passing mark`
      : "";

    if (attendanceLine || failLine) {
      font("helvetica", "normal", 8.5);
      ink(GRAY);
      doc.text(attendanceLine, M, y, { baseline: "top" });
      if (failLine) {
        ink(RED);
        doc.text(failLine, PW - M, y, { align: "right", baseline: "top" });
      }
      y += 15;
    }

    const remarkBox = (label: string, text: string) => {
      const h = 42;
      fill(TINT);
      stroke(LINE);
      box(M, y, CW, h, 4, "FD");
      fill(MAROON);
      doc.rect(M, y + 5, 2.6, h - 10, "F");
      font("helvetica", "bold", 6.8);
      ink(MAROON_DEEP);
      charSpace(0.5);
      doc.text(label.toUpperCase(), M + 12, y + 10, { baseline: "top" });
      charSpace(0);
      font("times", "italic", 10);
      ink(INK);
      doc.text(text, M + 12, y + 22, { baseline: "top", maxWidth: CW - 24 });
      y += h + 9;
    };
    remarkBox("Class Teacher's Remark", remarkText);
    if (r.principalRemark) remarkBox("Principal's Remark", r.principalRemark);

    // ── Grade legend ────────────────────────────────────────
    if (r.gradeScaleSnapshot.length > 0) {
      font("helvetica", "bold", 6.8);
      ink(GRAY);
      charSpace(0.5);
      doc.text(r.gradeScaleName.toUpperCase(), M, y, { baseline: "top" });
      charSpace(0);
      y += 10;

      const bands = [...r.gradeScaleSnapshot].sort((a, b) => b.minPercent - a.minPercent);
      const bw = CW / bands.length;
      bands.forEach((b, idx) => {
        const x = M + idx * bw;
        fill([246, 240, 224]);
        box(x, y, bw - 3, 16, 3, "F");
        font("helvetica", "bold", 7.5);
        ink(MAROON_DEEP);
        doc.text(b.grade, x + 6, y + 11);
        font("helvetica", "normal", 6.8);
        ink(GRAY);
        doc.text(`${b.minPercent}–${b.maxPercent}`, x + bw - 9, y + 11, { align: "right" });
      });
      y += 24;
    }

    // ── Signatures ──────────────────────────────────────────
    // They follow the content rather than pinning to the bottom, so a class
    // sitting five papers doesn't leave a hole in the middle of the card.
    const sigY = Math.min(y + 46, PH - 112);
    const sigs = ["Class Teacher", "Examination In-charge", "Principal"];
    const sigW = 124;
    stroke(GRAY);
    doc.setLineWidth(0.6);
    sigs.forEach((label, idx) => {
      const x = M + idx * ((CW - sigW) / (sigs.length - 1));
      doc.line(x, sigY, x + sigW, sigY);
      font("helvetica", "normal", 7.5);
      ink(GRAY);
      doc.text(label, x + sigW / 2, sigY + 9, { align: "center", baseline: "top" });
    });
    doc.setLineWidth(1);

    // ── Footer ──────────────────────────────────────────────
    const footY = PH - 80;
    stroke(GOLD_DEEP);
    doc.setLineWidth(0.7);
    doc.line(M, footY, PW - M, footY);
    doc.setLineWidth(1);

    font("courier", "bold", 7.5);
    ink(MAROON_DEEP);
    doc.text(`VERIFICATION ID  ${r.verificationId}`, M, footY + 10, { baseline: "top" });

    font("helvetica", "normal", 7);
    ink(GRAY);
    doc.text(
      `Published ${fmtDate(r.publishedAt)}  ·  Generated ${new Date().toLocaleString("en-IN")}`,
      PW - M, footY + 10, { align: "right", baseline: "top" },
    );
    doc.text(
      "Computer-generated report card. Quote the verification ID when confirming its authenticity with the school office.",
      M, footY + 24, { baseline: "top", maxWidth: CW },
    );

    font("times", "bold", 8.5);
    ink(MAROON_DEEP);
    charSpace(0.6);
    doc.text(`${SCHOOL_NAME.toUpperCase()}  ·  ${SCHOOL_LOCATION.toUpperCase()}`, PW / 2, footY + 40, {
      align: "center", baseline: "top",
    });
    charSpace(0);
  }

  const name = options.filename
    ?? (results.length === 1
      ? `Report-Card-${results[0].admissionNo}-${results[0].groupName}`
      : `Report-Cards-${results[0].groupName}`);
  doc.save(`${name.replace(/[^\w\-]+/g, "-")}.pdf`);
}
