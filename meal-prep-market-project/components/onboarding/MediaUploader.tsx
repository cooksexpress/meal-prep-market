// components/onboarding/MediaUploader.tsx
//
// "About you" photos: the cook's logo, a photo of themselves, or their
// kitchen. Dish photos live on each menu item instead (MenuEditor).
// Uploads go through lib/images/uploadImage, which converts HEIC phone
// photos to JPG and shrinks very large ones. The first photo is also
// saved as the cook's profile photo, used on homepage cards.

"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { uploadCookImage, removeCookImage } from "@/lib/images/uploadImage";
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

  // Keep the profile photo (homepage card) in step with the first photo.
  async function syncProfilePhoto(next: CookMedia[]) {
    await supabase
      .from("cm_cooks")
      .update({ profile_photo_url: next[0]?.image_url ?? null })
      .eq("id", cookId);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setErrorMessage(null);

    let current = media;
    let failed = 0;

    for (const file of files) {
      const uploaded = await uploadCookImage(supabase, cookId, file);
      if (!uploaded) {
        failed += 1;
        continue;
      }

      const { data: newRow, error: insertError } = await supabase
        .from("cm_cook_media")
        .insert({ cook_id: cookId, image_url: uploaded.publicUrl, sort_order: current.length })
        .select()
        .single();

      if (insertError || !newRow) {
        await removeCookImage(supabase, uploaded.publicUrl);
        failed += 1;
        continue;
      }

      current = [...current, newRow];
      setMedia(current);
    }

    if (current.length !== media.length) {
      await syncProfilePhoto(current);
    }

    setErrorMessage(
      failed > 0
        ? `${failed} photo${failed > 1 ? "s" : ""} couldn't be added. Please try a different photo.`
        : null
    );
    setUploading(false);
  }

  async function handleRemove(item: CookMedia) {
    await supabase.from("cm_cook_media").delete().eq("id", item.id);
    const next = media.filter((m) => m.id !== item.id);
    setMedia(next);
    await syncProfilePhoto(next);
    await removeCookImage(supabase, item.image_url);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {media.map((item) => (
          <div key={item.id} className="relative aspect-square overflow-hidden rounded-xl border border-hairline">
            <Image src={item.image_url} alt="" fill className="object-cover" sizes="150px" />
            <button
              type="button"
              onClick={() => handleRemove(item)}
              className="absolute right-1 top-1 rounded-full bg-paper/80 px-2 py-1 font-mono text-xs text-ink"
            >
              Remove
            </button>
          </div>
        ))}

        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-hairline text-center font-mono text-xs text-ink/60 hover:border-gold hover:text-gold">
          {uploading ? "Uploading…" : "+ Add photos"}
          <input
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
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
