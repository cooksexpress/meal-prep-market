// components/inbox/ThreadList.tsx

import Link from "next/link";

interface ThreadListItem {
  inquiryId: string;
  cookId: string;
  cookName: string;
  cookPhoto: string | null;
  message: string;
  createdAt: string;
}

export function ThreadList({ threads }: { threads: ThreadListItem[] }) {
  if (threads.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-2xl">No inquiries yet</p>
        <p className="mt-2 text-ink/70">
          Once you reach out to a cook, your conversation will show up here.
        </p>
        <Link href="/" className="mt-4 inline-block font-mono text-sm text-ocean underline">
          Browse cooks
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {threads.map((thread) => (
        <li key={thread.inquiryId}>
          <Link
            href={`/inbox/${thread.inquiryId}`}
            className="flex items-center justify-between gap-4 py-4 hover:bg-hairline/20 focus-visible:outline-2 focus-visible:outline-ocean"
          >
            <div className="min-w-0">
              <p className="font-medium">{thread.cookName}</p>
              <p className="truncate text-sm text-ink/70">{thread.message}</p>
            </div>
            <p className="whitespace-nowrap font-mono text-xs text-ink/50">
              {new Date(thread.createdAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
