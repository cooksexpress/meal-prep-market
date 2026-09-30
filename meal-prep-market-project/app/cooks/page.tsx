// app/cooks/page.tsx
//
// /cooks used to be the search results page; that UI now lives on the
// home page (see app/(public)/page.tsx). This stub preserves any old
// bookmarked or shared /cooks?... links by redirecting to the same
// query on "/".

import { redirect } from "next/navigation";

interface OldCooksPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function OldCooksSearchRedirect({ searchParams }: OldCooksPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString();

  redirect(query ? `/?${query}` : "/");
}
