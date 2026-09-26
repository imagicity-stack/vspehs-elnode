// ─────────────────────────────────────────────────────────────
// Report card → downloadable PDF (jsPDF)
// ─────────────────────────────────────────────────────────────
// Renders published result snapshots as A4 report cards, one page per student,
// so a single file can hold one child, a whole class or an entire examination.
// Everything printed comes from the snapshot — nothing is re-derived — so a
// card reissued next year is identical to the one issued today.
// ─────────────────────────────────────────────────────────────

import type { StudentExamResult } from "./types";

const ISSUER = "The Elden Heights School";
const TAGLINE = "Towards Eternal Glory";
const WEBSITE = "www.eldenheights.org";

// Palette (RGB), shared with the fee receipt.
const NAVY: [number, number, number] = [31, 45, 90];
const ACCENT: [number, number, number] = [29, 64, 245];
const DARK: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const ZEBRA: [number, number, number] = [247, 249, 252];
const GREEN: [number, number, number] = [16, 185, 129];
const RED: [number, number, number] = [225, 29, 72];

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Fetches an image and re-encodes it at the size it will actually be printed.
 * jsPDF embeds the decoded bitmap, so handing it a 300 KB source logo costs
 * megabytes *per page* — downscaling first keeps a class set to a sane size.
 */
async function loadImage(
  url: string,
  maxEdge = 220,
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
    if (scale >= 1) return { dataUrl: sourceUrl, w: img.naturalWidth, h: img.naturalHeight };

    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { dataUrl: sourceUrl, w: img.naturalWidth, h: img.naturalHeight };
    // A white backdrop keeps a transparent PNG from turning black in the PDF.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), w, h };
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
 * Builds the PDF and hands it to the browser. One page per result; results are
 * emitted in the order given, so callers sort first.
 */
export async function downloadReportCards(
  results: StudentExamResult[],
  options: ReportCardOptions = {},
): Promise<void> {
  if (results.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = PW - 2 * M;

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  const logo = await loadImage("/ehs.png", 200);
  // Photos are fetched once per distinct URL — a class of 40 often shares none,
  // but a re-run of the same student shouldn't refetch.
  const photoCache = new Map<string, { dataUrl: string; w: number; h: number } | null>();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (i > 0) doc.addPage();

    // ── Header ────────────────────────────────────────────
    let nameX = M;
    if (logo) {
      const box = 50;
      const ratio = logo.w / logo.h;
      const w = ratio >= 1 ? box : box * ratio;
      const h = ratio >= 1 ? box / ratio : box;
      // The alias makes jsPDF store the bitmap once and reference it from
      // every later page instead of re-embedding it per student.
      doc.addImage(logo.dataUrl, imageFormat(logo.dataUrl), M, M, w, h, "school-logo", "FAST");
      nameX = M + box + 12;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setColor(NAVY);
    doc.text(ISSUER, nameX, M + 4, { baseline: "top" });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setColor(GRAY);
    doc.text(TAGLINE, nameX, M + 25, { baseline: "top" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(WEBSITE, nameX, M + 38, { baseline: "top" });

    // Examination badge (right)
    const badgeW = 160, badgeH = 50, badgeX = PW - M - badgeW;
    fill([245, 247, 250]);
    stroke(LINE);
    doc.roundedRect(badgeX, M, badgeW, badgeH, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(NAVY);
    doc.text("REPORT CARD", badgeX + badgeW / 2, M + 9, { align: "center", baseline: "top" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(DARK);
    doc.text(r.groupName, badgeX + badgeW / 2, M + 24, {
      align: "center", baseline: "top", maxWidth: badgeW - 12,
    });
    doc.text(`Session ${r.sessionName}`, badgeX + badgeW / 2, M + 36, { align: "center", baseline: "top" });

    let y = M + 70;
    stroke(NAVY);
    doc.setLineWidth(1.5);
    doc.line(M, y, PW - M, y);
    doc.setLineWidth(1);
    y += 14;

    // ── Student block ─────────────────────────────────────
    const photoBox = 66;
    let infoX = M;
    if (r.photoUrl) {
      if (!photoCache.has(r.photoUrl)) photoCache.set(r.photoUrl, await loadImage(r.photoUrl, 240));
      const photo = photoCache.get(r.photoUrl);
      if (photo) {
        stroke(LINE);
        doc.roundedRect(M, y, photoBox, photoBox + 8, 4, 4, "S");
        try {
          doc.addImage(
            photo.dataUrl, imageFormat(photo.dataUrl),
            M + 3, y + 3, photoBox - 6, photoBox + 2,
            `photo-${r.studentId}`, "FAST",
          );
        } catch {
          /* an unsupported image must not abort the whole run */
        }
        infoX = M + photoBox + 16;
      }
    }

    const colW = (PW - M - infoX) / 3;
    const cell = (col: number, row: number, label: string, value: string) => {
      const x = infoX + col * colW;
      const yy = y + row * 26;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(GRAY);
      doc.text(label.toUpperCase(), x, yy, { baseline: "top" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setColor(DARK);
      doc.text(value || "—", x, yy + 9, { baseline: "top", maxWidth: colW - 8 });
    };
    cell(0, 0, "Student", r.studentName);
    cell(1, 0, "Class", r.className);
    cell(2, 0, "Roll No", String(r.rollNo));
    cell(0, 1, "Admission No", r.admissionNo);
    cell(1, 1, "Father's Name", r.fatherName);
    cell(2, 1, "Mother's Name", r.motherName);
    y += Math.max(photoBox + 16, 60);

    // ── Marks table ───────────────────────────────────────
    const rowH = 20;
    const cols = [
      { key: "subject", label: "SUBJECT", w: CW * 0.34, align: "left" as const },
      { key: "max", label: "MAX", w: CW * 0.1, align: "right" as const },
      { key: "obtained", label: "OBTAINED", w: CW * 0.13, align: "right" as const },
      { key: "percent", label: "%", w: CW * 0.1, align: "right" as const },
      { key: "grade", label: "GRADE", w: CW * 0.11, align: "center" as const },
      { key: "remark", label: "REMARKS", w: CW * 0.22, align: "left" as const },
    ];
    const colX = (idx: number) => M + cols.slice(0, idx).reduce((s, c) => s + c.w, 0);
    const drawCell = (idx: number, text: string, yy: number) => {
      const c = cols[idx];
      const x = c.align === "right" ? colX(idx) + c.w - 6 : c.align === "center" ? colX(idx) + c.w / 2 : colX(idx) + 6;
      doc.text(text, x, yy + 6, { align: c.align, baseline: "top", maxWidth: c.w - 10 });
    };

    fill(NAVY);
    doc.rect(M, y, CW, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor([255, 255, 255]);
    cols.forEach((c, idx) => drawCell(idx, c.label, y));
    y += rowH;

    doc.setFontSize(9);
    r.lines.forEach((line, idx) => {
      if (idx % 2 === 1) { fill(ZEBRA); doc.rect(M, y, CW, rowH, "F"); }
      doc.setFont("helvetica", "normal");
      setColor(DARK);
      drawCell(0, line.subjectName, y);
      drawCell(1, String(line.maxMarks), y);
      // A non-numeric status prints its short form in place of a mark.
      doc.setFont("helvetica", "bold");
      setColor(line.passed ? DARK : RED);
      drawCell(2, line.obtained === null ? line.grade : String(line.obtained), y);
      doc.setFont("helvetica", "normal");
      setColor(DARK);
      drawCell(3, line.obtained === null ? "—" : `${line.percent}%`, y);
      doc.setFont("helvetica", "bold");
      drawCell(4, line.grade, y);
      doc.setFont("helvetica", "normal");
      setColor(GRAY);
      drawCell(5, line.remarks ?? "", y);
      y += rowH;
    });

    stroke(LINE);
    doc.rect(M, y - r.lines.length * rowH - rowH, CW, r.lines.length * rowH + rowH, "S");
    y += 12;

    // ── Summary strip ─────────────────────────────────────
    const sumH = 50;
    fill([235, 240, 255]);
    stroke(LINE);
    doc.roundedRect(M, y, CW, sumH, 6, 6, "FD");
    const sumCells: [string, string, [number, number, number]][] = [
      ["Total Marks", `${r.totalObtained} / ${r.totalMax}`, DARK],
      ["Percentage", `${r.percentage}%`, NAVY],
      ["Overall Grade", r.overallGrade, NAVY],
      ...(r.rank ? ([["Class Rank", `#${r.rank}`, NAVY]] as [string, string, [number, number, number]][]) : []),
      ["Result", r.passed ? "PASS" : "FAIL", r.passed ? GREEN : RED],
    ];
    const sumW = CW / sumCells.length;
    sumCells.forEach(([label, value, color], idx) => {
      const x = M + idx * sumW + sumW / 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(GRAY);
      doc.text(label.toUpperCase(), x, y + 12, { align: "center", baseline: "top" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      setColor(color);
      doc.text(value, x, y + 25, { align: "center", baseline: "top" });
    });
    y += sumH + 14;

    // ── Attendance + remarks ──────────────────────────────
    if (options.showAttendance !== false && typeof r.attendanceRate === "number") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(GRAY);
      doc.text(`Attendance: `, M, y, { baseline: "top" });
      doc.setFont("helvetica", "bold");
      setColor(DARK);
      doc.text(`${r.attendanceRate}%`, M + 58, y, { baseline: "top" });
      if (r.failedCount > 0) {
        doc.setFont("helvetica", "normal");
        setColor(RED);
        doc.text(
          `${r.failedCount} subject${r.failedCount === 1 ? "" : "s"} below the passing mark`,
          M + 110, y, { baseline: "top" },
        );
      }
      y += 20;
    }

    const remark = (label: string, text: string) => {
      const h = 46;
      fill([249, 250, 251]);
      stroke(LINE);
      doc.roundedRect(M, y, CW, h, 6, 6, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      setColor(GRAY);
      doc.text(label.toUpperCase(), M + 12, y + 10, { baseline: "top" });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      setColor(DARK);
      doc.text(text, M + 12, y + 24, { baseline: "top", maxWidth: CW - 24 });
      y += h + 10;
    };
    remark(
      "Class Teacher's Remark",
      r.classTeacherRemark || (r.passed
        ? "A consistent and sincere performance this term. Keep it up."
        : "Needs focused support in the subjects below the pass mark."),
    );
    if (r.principalRemark) remark("Principal's Remark", r.principalRemark);

    // ── Grade scale legend ────────────────────────────────
    if (r.gradeScaleSnapshot.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(GRAY);
      const legend = [...r.gradeScaleSnapshot]
        .sort((a, b) => b.minPercent - a.minPercent)
        .map((b) => `${b.grade}: ${b.minPercent}-${b.maxPercent}%`)
        .join("   ");
      doc.text(`${r.gradeScaleName} — ${legend}`, M, y, { baseline: "top", maxWidth: CW });
      y += 18;
    }

    // ── Signatures ────────────────────────────────────────
    const sigY = Math.max(y + 18, PH - 120);
    stroke(GRAY);
    const sigs = ["Class Teacher", "Examination In-charge", "Principal"];
    sigs.forEach((label, idx) => {
      const w = 120;
      const x = M + idx * ((CW - w) / (sigs.length - 1));
      doc.line(x, sigY, x + w, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(GRAY);
      doc.text(label, x + w / 2, sigY + 6, { align: "center", baseline: "top" });
    });

    // ── Footer ────────────────────────────────────────────
    const footY = PH - 62;
    stroke(ACCENT);
    doc.setLineWidth(2);
    doc.line(M, footY, PW - M, footY);
    doc.setLineWidth(1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(GRAY);
    doc.text(
      `Verification ID: ${r.verificationId}  ·  Published ${fmtDate(r.publishedAt)}  ·  Generated ${new Date().toLocaleString("en-IN")}`,
      M, footY + 12, { baseline: "top" },
    );
    doc.text(
      "This is a computer-generated report card. Quote the verification ID when confirming its authenticity with the school office.",
      M, footY + 24, { baseline: "top", maxWidth: CW },
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setColor(NAVY);
    doc.text(`${ISSUER} · ${WEBSITE}`, PW / 2, PH - 22, { align: "center", baseline: "top" });
  }

  const name = options.filename
    ?? (results.length === 1
      ? `Report-Card-${results[0].admissionNo}-${results[0].groupName}`
      : `Report-Cards-${results[0].groupName}`);
  doc.save(`${name.replace(/[^\w\-]+/g, "-")}.pdf`);
}
