// components/cook-profile/PhotoGallery.tsx

import Image from "next/image";
import type { CookMedia } from "@/lib/types/database";

export function PhotoGallery({ media }: { media: CookMedia[] }) {
  if (media.length === 0) return null;

  return (
    <section aria-labelledby="gallery-heading" className="py-8">
      <h2 id="gallery-heading" className="font-display text-2xl">
        Past meals
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item) => (
          <div key={item.id} className="relative aspect-square overflow-hidden border border-hairline">
            <Image
              src={item.image_url}
              alt={item.caption ?? "Meal prepared by this cook"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
