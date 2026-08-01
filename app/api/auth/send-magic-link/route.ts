import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getMagicLinkEligibility } from "@/lib/auth/magicLinkEligibility";
import { getSiteUrl } from "@/lib/portal/siteUrl";
import { createClient as createSsrClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Use admin client for DB lookup (bypasses RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );

    const eligibility = await getMagicLinkEligibility(adminClient, normalizedEmail);
    if (!eligibility.ok) {
      return NextResponse.json({ error: eligibility.error }, { status: eligibility.status });
    }

    // Use @supabase/ssr client - PKCE flow stores the verifier in a cookie
    // so the auth/confirm route can exchange the code for a session later.
    const supabase = await createSsrClient();
    const emailRedirectTo = `${getSiteUrl()}/auth/confirm`;

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo },
    });

    if (error) {
      console.error("Failed to send magic link:", error);
      return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Magic link sent! Check your email." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Send magic link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
