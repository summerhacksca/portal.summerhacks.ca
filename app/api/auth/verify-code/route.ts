import { NextRequest, NextResponse } from "next/server";
import { establishSession } from "@/lib/auth/establishSession";
import { verifyEmailCode } from "@/lib/auth/verifyEmailOtp";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (typeof email !== "string" || typeof code !== "string") {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.replace(/\D/g, "");

    if (normalizedCode.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    }

    const result = await verifyEmailCode(normalizedEmail, normalizedCode);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Writes sh_session; the Supabase auth cookies that server components read
    // were already written by the @supabase/ssr client inside verifyEmailCode.
    const destination = await establishSession(result.session);

    return NextResponse.json({ destination }, { status: 200 });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
