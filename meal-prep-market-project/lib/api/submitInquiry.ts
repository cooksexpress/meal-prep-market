// lib/api/submitInquiry.ts
//
// Thin wrapper around the submit-inquiry Edge Function. This is the
// one mutation that can't go through a normal Supabase client insert,
// since guest submissions require the service role to auto-create the
// client account and fire the magic link.

interface SubmitInquiryPayload {
  cook_id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

interface SubmitInquiryResponse {
  success: true;
  inquiry_id: string;
}

export async function submitInquiry(payload: SubmitInquiryPayload): Promise<SubmitInquiryResponse> {
  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${functionsUrl}/submit-inquiry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to send inquiry. Please try again.");
  }

  return res.json();
}
