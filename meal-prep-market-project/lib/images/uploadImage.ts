// lib/images/uploadImage.ts
//
// One place for every cook photo upload (About you photos and menu
// item photos). Before uploading it:
//   1. Converts iPhone / Samsung HEIC photos to JPG, so they display
//      in every browser. The converter (heic2any) is loaded from a CDN
//      only when a HEIC photo is actually picked.
//   2. Shrinks very large photos (max 1600px on the longest side) so
//      pages stay fast on phones.
// Files go to the `cook-gallery` bucket under the cook's own id, which
// is what the storage policies check.

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_SIDE = 1600;
const HEIC2ANY_URL = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";

type Heic2Any = (options: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;

let heicLoader: Promise<Heic2Any> | null = null;

function loadHeic2any(): Promise<Heic2Any> {
  const existing = (window as unknown as { heic2any?: Heic2Any }).heic2any;
  if (existing) return Promise.resolve(existing);

  if (!heicLoader) {
    heicLoader = new Promise<Heic2Any>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = HEIC2ANY_URL;
      script.async = true;
      script.onload = () => {
        const loaded = (window as unknown as { heic2any?: Heic2Any }).heic2any;
        if (loaded) resolve(loaded);
        else reject(new Error("HEIC converter didn't load"));
      };
      script.onerror = () => {
        heicLoader = null;
        reject(new Error("HEIC converter didn't load"));
      };
      document.head.appendChild(script);
    });
  }
  return heicLoader;
}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return /image\/hei(c|f)/.test(file.type) || name.endsWith(".heic") || name.endsWith(".heif");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

// Returns a browser-friendly image (JPG, PNG or WebP), or throws if the
// photo can't be read at all.
export async function prepareImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  let source: Blob = file;
  let sourceType = file.type;

  if (isHeic(file)) {
    const heic2any = await loadHeic2any();
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    source = Array.isArray(converted) ? converted[0] : converted;
    sourceType = "image/jpeg";
  }

  // Animated GIFs would lose their animation on a canvas, so keep as is.
  if (sourceType === "image/gif") {
    return { blob: source, ext: "gif", type: "image/gif" };
  }

  // Keep PNGs as PNG so logos with transparent backgrounds stay clean.
  const outType = sourceType === "image/png" ? "image/png" : "image/jpeg";
  const outExt = outType === "image/png" ? "png" : "jpg";

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error("unreadable");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const alreadyFine =
    scale === 1 &&
    source.size < 1.5 * 1024 * 1024 &&
    ["image/jpeg", "image/png", "image/webp"].includes(sourceType);

  if (alreadyFine) {
    bitmap.close();
    const ext = sourceType === "image/png" ? "png" : sourceType === "image/webp" ? "webp" : "jpg";
    return { blob: source, ext, type: sourceType };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("unreadable");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const resized = await canvasToBlob(canvas, outType);
  if (!resized) throw new Error("unreadable");
  return { blob: resized, ext: outExt, type: outType };
}

// Prepares and uploads one photo. Returns its public URL, or null if
// it failed (the caller shows a friendly message).
export async function uploadCookImage(
  supabase: SupabaseClient,
  cookId: string,
  file: File,
  folder?: string
): Promise<{ publicUrl: string; path: string } | null> {
  let prepared: { blob: Blob; ext: string; type: string };
  try {
    prepared = await prepareImage(file);
  } catch {
    return null;
  }

  const path = `${cookId}/${folder ? `${folder}/` : ""}${crypto.randomUUID()}.${prepared.ext}`;
  const { error } = await supabase.storage
    .from("cook-gallery")
    .upload(path, prepared.blob, { cacheControl: "3600", upsert: false, contentType: prepared.type });

  if (error) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from("cook-gallery").getPublicUrl(path);

  return { publicUrl, path };
}

// Best-effort delete of a photo we uploaded, using its public URL.
export async function removeCookImage(supabase: SupabaseClient, publicUrl: string | null) {
  if (!publicUrl) return;
  const parts = publicUrl.split("/cook-gallery/");
  if (parts[1]) {
    await supabase.storage.from("cook-gallery").remove([parts[1]]);
  }
}
