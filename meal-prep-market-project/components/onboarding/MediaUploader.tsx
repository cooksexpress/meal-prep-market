// components/onboarding/MediaUploader.tsx
//
// Uploads go straight to the `cook-gallery` Storage bucket under a
// path prefixed with the cook's own auth.uid() — this is what the
// storage RLS policies (storage-buckets.sql) actually check, not just
// a frontend convention. A cm_cook_media row is inserted immediately
// after a successful upload so the gallery renders without a page reload.

"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { CookMedia } from "@/lib/types/database";

interface MediaUploaderProps {
  cookId: string;
  initialMedia: CookMedia[];
}

export function MediaUploader({ cookId, initialMedia }: MediaUploaderProps) {
  const supabase = createClient();
  const [media, setMedia] = useState<CookMedia[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);

    const fileExt = file.name.split(".").pop();
    const filePath = `${cookId}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("cook-gallery")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setErrorMessage("Upload failed. Please try a different image.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("cook-gallery").getPublicUrl(filePath);

    const { data: newRow, error: insertError } = await supabase
      .from("cm_cook_media")
      .insert({ cook_id: cookId, image_url: publicUrl, sort_order: media.length })
      .select()
      .single();

    if (insertError || !newRow) {
      setErrorMessage("Image uploaded but couldn't be saved. Please try again.");
      setUploading(false);
      return;
    }

    setMedia((prev) => [...prev, newRow]);
    setUploading(false);
    e.target.value = "";
  }

  async function handleRemove(item: CookMedia) {
    await supabase.from("cm_cook_media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));

    // Best-effort storage cleanup — the path is derivable from the
    // stored public URL's final two segments (cookId/filename).
    const pathParts = item.image_url.split("/cook-gallery/");
    if (pathParts[1]) {
      await supabase.storage.from("cook-gallery").remove([pathParts[1]]);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {media.map((item) => (
          <div key={item.id} className="group relative aspect-square overflow-hidden border border-hairline">
            <Image src={item.image_url} alt="" fill className="object-cover" sizes="150px" />
            <button
              type="button"
              onClick={() => handleRemove(item)}
              className="absolute right-1 top-1 hidden bg-ink/80 px-2 py-1 font-mono text-xs text-paper group-hover:block focus-visible:block"
            >
              Remove
            </button>
          </div>
        ))}

        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-hairline text-center font-mono text-xs text-ink/60 hover:border-ink/40">
          {uploading ? "Uploading…" : "+ Add photo"}
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-2 font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
