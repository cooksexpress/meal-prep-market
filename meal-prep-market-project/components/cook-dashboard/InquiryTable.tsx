// components/cook-dashboard/InquiryTable.tsx

interface InquiryRow {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  message: string;
  created_at: string;
}

export function InquiryTable({ inquiries }: { inquiries: InquiryRow[] }) {
  if (inquiries.length === 0) {
    return <p className="text-ink/70">No inquiries yet — they&rsquo;ll show up here as clients reach out.</p>;
  }

  return (
    <div className="divide-y divide-hairline border-y border-hairline">
      {inquiries.map((inquiry) => (
        <div key={inquiry.id} className="py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{inquiry.client_name}</p>
            <p className="font-mono text-xs text-ink/50">
              {new Date(inquiry.created_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <p className="mt-1 text-ink/80">{inquiry.message}</p>
          <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs text-ocean">
            <a href={`mailto:${inquiry.client_email}`} className="underline">
              {inquiry.client_email}
            </a>
            {inquiry.client_phone && (
              <a href={`tel:${inquiry.client_phone}`} className="underline">
                {inquiry.client_phone}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
