// ─────────────────────────────────────────────────────────────
// Portrait storage (students & staff)
// ─────────────────────────────────────────────────────────────
// Uploads a person's photo and returns a URL to store on the record.
// • Firebase mode (Storage configured): uploads to the bucket and returns the
//   permanent download URL.
// • Demo / no Storage: falls back to an inline data URL so the preview and ID
//   card still work locally (never written to Firestore in this mode).
// ─────────────────────────────────────────────────────────────

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, isStorageConfigured } from "./firebase";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(folder: string, id: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 5 MB.");

  if (isStorageConfigured && storage) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const r = ref(storage, `${folder}/${id}.${ext}`);
    await uploadBytes(r, file, { contentType: file.type });
    return getDownloadURL(r);
  }

  // Demo fallback — inline data URL (kept in localStorage only).
  return readAsDataURL(file);
}

export const uploadStudentPhoto = (studentId: string, file: File) =>
  uploadPhoto("student-photos", studentId, file);

export const uploadStaffPhoto = (staffId: string, file: File) =>
  uploadPhoto("staff-photos", staffId, file);
