// components/onboarding/ProfilePhotoUploader.tsx
//
// The cook's one main photo: a photo of themselves or their logo. It
// shows in the circle at the top of their listing and on their card on
// the homepage. Dish photos live on each menu item instead (MenuEditor).
// Saved to cm_cooks.profile_photo_url. HEIC phone photos are converted
// by lib/images/uploadImage.

"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { uploadCookImage, removeCookImage } from "@/lib/images/uploadImage";

interface ProfilePhotoUploaderProps {
  cookId: string;
  initialUrl: string | null;
}

export function ProfilePhotoUploader({ cookId, initialUrl }: ProfilePhotoUploaderProps) {
  const supabase = createClient();
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function savePhoto(url: string | null) {
    const { error } = await supabase.from("cm_cooks").update({ profile_photo_url: url }).eq("id", cookId);
    return !error;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setErrorMessage(null);

    const uploaded = await uploadCookImage(supabase, cookId, file, "profile");
    if (!uploaded) {
      setBusy(false);
      setErrorMessage("That photo couldn't be added. Please try a different photo.");
      return;
    }

    if (!(await savePhoto(uploaded.publicUrl))) {
      await removeCookImage(supabase, uploaded.publicUrl);
      setBusy(false);
      setErrorMessage("Couldn't save your photo. Please try again.");
      return;
    }

    const previous = photoUrl;
    setPhotoUrl(uploaded.publicUrl);
    setBusy(false);
    await removeCookImage(supabase, previous);
  }

  async function handleRemove() {
    setBusy(true);
    setErrorMessage(null);
    if (await savePhoto(null)) {
      const previous = photoUrl;
      setPhotoUrl(null);
      await removeCookImage(supabase, previous);
    } else {
      setErrorMessage("Couldn't remove your photo. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-gold/60 bg-surface">
          {photoUrl ? (
            <Image src={photoUrl} alt="Your main photo" fill className="object-cover" sizes="112px" />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center font-mono text-[10px] text-ink/50">
              No photo yet
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-3">
          <label
            className={`cursor-pointer rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper ${
              busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {busy ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleFileChange}
              disabled={busy}
              className="hidden"
            />
          </label>
          {photoUrl && !busy && (
            <button type="button" onClick={handleRemove} className="text-sm text-ink/60 underline">
              Remove
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-2 font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
