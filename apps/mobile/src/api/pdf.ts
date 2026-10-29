/**
 * PDF + file transport — preserves the backend's raw-bytes contract exactly:
 * POST /files/papers (and materials/file) expect `Content-Type: application/pdf`
 * with raw PDF bytes — NOT multipart. ≤20MB, `%PDF-` magic bytes, per-user quota.
 */
import { File, Paths, UploadType } from "expo-file-system";
import { API_BASE, ApiError, absoluteUrl } from "./client";
import { useSession } from "@/auth/session";

export const PDF_MAX_BYTES = 20 * 1024 * 1024;

/** Pick a single PDF via the system document picker (null when canceled). */
export async function pickPdf(): Promise<File | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ["application/pdf"] });
  if (!picked || picked.canceled || !picked.result) return null;
  const file = picked.result as unknown as File;
  return file;
}

/**
 * Deep validation mirroring frontend/src/lib/pdfUpload.ts:
 * PDF-only by MIME/name, ≤20MB, and real `%PDF-` magic bytes (not just extension).
 */
export async function validatePdf(file: File): Promise<void> {
  const name = (file as unknown as { name?: string }).name ?? file.uri ?? "";
  const mimeOk = (file as unknown as { type?: string }).type === "application/pdf" || /\.pdf$/i.test(name);
  if (!mimeOk) {
    throw new ApiError("PDF_ONLY", "الملف يجب أن يكون بصيغة PDF فقط.", 400);
  }
  if (file.size > PDF_MAX_BYTES) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "حجم الملف يتجاوز الحد الأقصى المسموح (20 ميغابايت).", 413);
  }
  if (file.size <= 0) {
    throw new ApiError("EMPTY", "محتوى الملف فارغ.", 400);
  }
  let head = new Uint8Array();
  try {
    const bytes = await file.bytes();
    head = bytes.slice(0, 5);
  } catch {
    // If bytes are unreadable the server-side magic check still guards us.
  }
  const magic = "%PDF-";
  if (head.length >= 5 && !magic.includes(String.fromCharCode(...head))) {
    throw new ApiError("BAD_PDF", "محتوى الملف ليس PDF صالحًا (بصمة الملف لا تطابق).", 400);
  }
}

/**
 * Raw PDF upload with progress against a backend endpoint.
 * The endpoint path/query comes from the caller (papers vs materials differ).
 */
export async function uploadRawPdf(
  file: File,
  path: string,
  onProgress?: (fraction: number) => void,
): Promise<unknown> {
  const token = useSession.getState().accessToken;
  const res = await file.upload(`${API_BASE}${path}`, {
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    onProgress: ({ bytesSent, totalBytes }: { bytesSent: number; totalBytes: number }) => {
      if (totalBytes > 0 && onProgress) onProgress(Math.min(1, bytesSent / totalBytes));
    },
  });
  let parsed: { data?: unknown; error?: { code?: string; message?: string } } | null = null;
  try {
    parsed = JSON.parse(res.body ?? "{}");
  } catch {
    parsed = null;
  }
  if (res.status >= 400) {
    throw new ApiError(
      parsed?.error?.code ?? "UPLOAD_FAILED",
      parsed?.error?.message ?? `فشل رفع الملف (رمز ${res.status}).`,
      res.status,
    );
  }
  return parsed?.data ?? parsed;
}

/** Download an authenticated file to the app cache (returns a local File). */
export async function downloadAuthenticated(
  url: string | null | undefined,
  suggestedName: string,
): Promise<File> {
  const abs = absoluteUrl(url);
  if (!abs) throw new ApiError("BAD_URL", "رابط الملف غير صالح.", 400);
  const token = useSession.getState().accessToken;
  const res = await fetch(abs, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new ApiError("DOWNLOAD_FAILED", `تعذّر تنزيل الملف (رمز ${res.status}).`, res.status);
  }
  const buf = await res.arrayBuffer();
  const safe = suggestedName.replace(/[^\w.\-]+/g, "_");
  const local = new File(Paths.cache, `mdrk-${safe}-${Date.now()}`);
  await local.write(new Uint8Array(buf));
  return local;
}
