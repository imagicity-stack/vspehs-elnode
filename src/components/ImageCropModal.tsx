"use client";

import { useEffect, useRef, useState } from "react";
import { canvasToBlobUnder, fileToDataUrl, loadImage } from "@/lib/imageTools";
import { X, Loader2, Wand2, ZoomIn, Check } from "lucide-react";

const VIEW = 288;   // square crop viewport (px)
const OUT = 640;    // exported square size (px)
const MAX_BYTES = 500 * 1024;

/**
 * Square crop tool with pan + zoom, an optional one-tap background removal,
 * and compression to under 500 KB. Returns the final File via onDone.
 */
export function ImageCropModal({
  file, name, onCancel, onDone,
}: {
  file: File;
  name: string;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const [src, setSrc] = useState<string>("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hasAlpha, setHasAlpha] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Load the initial file.
  useEffect(() => {
    let url = "";
    (async () => {
      try {
        url = URL.createObjectURL(file);
        const image = await loadImage(url);
        setSrc(url);
        setImg(image);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      } catch {
        setErr("Could not open this image.");
      }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);

  if (!img) {
    return (
      <Shell onCancel={onCancel}>
        <div className="flex h-72 items-center justify-center text-slate-400">
          {err || <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
      </Shell>
    );
  }

  // Geometry: fit the shorter side to the viewport (cover), then zoom/pan.
  const base = VIEW / Math.min(img.naturalWidth, img.naturalHeight);
  const scale = base * zoom;
  const dispW = img.naturalWidth * scale;
  const dispH = img.naturalHeight * scale;
  const left = (VIEW - dispW) / 2 + offset.x;
  const top = (VIEW - dispH) / 2 + offset.y;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const onPointerUp = () => { drag.current = null; };

  const removeBg = async () => {
    setErr("");
    setRemoving(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Background removal failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const image = await loadImage(url);
      setSrc(url);
      setImg(image);
      setHasAlpha(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Background removal failed.");
    } finally {
      setRemoving(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    setErr("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable.");
      // Map the visible viewport square back to source pixels.
      const sx = (0 - left) / scale;
      const sy = (0 - top) / scale;
      const sSide = VIEW / scale;
      ctx.drawImage(img, sx, sy, sSide, sSide, 0, 0, OUT, OUT);
      const blob = await canvasToBlobUnder(canvas, MAX_BYTES, hasAlpha);
      const ext = blob.type === "image/png" ? "png" : "jpg";
      onDone(new File([blob], `photo.${ext}`, { type: blob.type }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not process the image.");
      setBusy(false);
    }
  };

  return (
    <Shell onCancel={onCancel} title="Adjust photo" subtitle={name}>
      <div
        className="relative mx-auto touch-none overflow-hidden rounded-2xl bg-slate-100 select-none"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          draggable={false}
          style={{
            position: "absolute", left, top,
            width: dispW, height: dispH,
            // Override Tailwind Preflight (img { max-width:100%; height:auto })
            // so zoom scales uniformly instead of squeezing the width.
            maxWidth: "none", maxHeight: "none",
            cursor: "grab", userSelect: "none",
          }}
        />
        {/* Circular guide — the card shows the photo as a circle */}
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "0 0 0 9999px rgba(15,23,42,0.35) inset", borderRadius: "50%" }} />
        <div className="pointer-events-none absolute inset-2 rounded-full border-2 border-white/80" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" />
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-brand-600" />
      </div>

      <button onClick={removeBg} disabled={removing || busy} className="btn-ghost mt-3 w-full">
        {removing ? <><Loader2 className="h-4 w-4 animate-spin" /> Removing background…</> : <><Wand2 className="h-4 w-4" /> Remove background</>}
      </button>

      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      <p className="mt-2 text-center text-xs text-slate-400">Drag to reposition · pinch/slider to zoom · saved under 500 KB.</p>

      <div className="mt-4 flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1 py-2.5">Cancel</button>
        <button onClick={apply} disabled={busy} className="btn-primary flex-1 py-2.5">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> Use photo</>}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children, onCancel, title, subtitle }: { children: React.ReactNode; onCancel: () => void; title?: string; subtitle?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onCancel} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
        {subtitle && <p className="mb-4 text-sm text-slate-500">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
