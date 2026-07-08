"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { ImageCropModal } from "@/components/ImageCropModal";
import { uploadStudentPhoto } from "@/lib/storage";
import { isStorageConfigured } from "@/lib/firebase";
import { Camera, Loader2, X } from "lucide-react";

/**
 * Photo picker → crop/compress/remove-bg → upload to the storage bucket
 * (or a local data URL in demo mode). Returns the resulting URL via onChange.
 */
export function PhotoUpload({
  studentId, name, value, onChange,
}: {
  studentId: string;
  name: string;
  value?: string;
  onChange: (url: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (!file.type.startsWith("image/")) { setErr("Please choose an image file."); return; }
    setCropFile(file); // open cropper
  };

  const handleCropped = async (finalFile: File) => {
    setCropFile(null);
    setBusy(true);
    setErr("");
    try {
      const url = await uploadStudentPhoto(studentId, finalFile);
      onChange(url);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="relative">
          {value
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value} alt={name} className="h-20 w-20 rounded-2xl object-cover" />
            : <Avatar name={name || "Student"} size={80} className="rounded-2xl" />}
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow"
              title="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="min-w-0">
          <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Camera className="h-4 w-4" /> {value ? "Change photo" : "Upload photo"}</>}
          </button>
          <p className="mt-1 text-xs text-slate-400">
            Crop &amp; compress built in{isStorageConfigured ? "." : " · demo mode saves to this browser only."}
          </p>
          {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
        </div>
      </div>

      {cropFile && (
        <ImageCropModal file={cropFile} name={name || "Student"} onCancel={() => setCropFile(null)} onDone={handleCropped} />
      )}
    </>
  );
}
