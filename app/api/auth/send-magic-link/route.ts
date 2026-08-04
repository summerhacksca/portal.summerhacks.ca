import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getMagicLinkEligibility } from "@/lib/auth/magicLinkEligibility";
import { getSiteUrl } from "@/lib/portal/siteUrl";

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

    // A plain anon client, deliberately NOT the @supabase/ssr one: that client
    // starts a PKCE flow and pins a code-verifier cookie to whichever browser
    // submitted this form, which breaks every sign-in finished somewhere else
    // (email opened on a phone, or in a mail app's in-app browser). Verification
    // now goes through the emailed 6-digit code or token_hash, neither of which
    // needs anything stored on this device.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm` },
    });

    if (error) {
      // GoTrue throttles repeat sends per address (~60s). Say so rather than
      // showing a generic failure that reads like the address is wrong.
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Please wait a moment before requesting another code." },
          { status: 429 },
        );
      }

      console.error("Failed to send sign-in code:", error);
      return NextResponse.json({ error: "Failed to send sign-in code" }, { status: 500 });
    }

    return NextResponse.json({ email: normalizedEmail }, { status: 200 });
  } catch (error) {
    console.error("Send sign-in code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
