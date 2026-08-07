import Image from "next/image";
import Link from "next/link";
import SignInForm from "@/components/auth/SignInForm";

type SearchParams = Promise<{ error?: string }>;

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface-page p-5">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-sm bg-surface-card p-6 sm:p-8 shadow-pop">
        <Image src="/icon.svg" alt="SummerHacks" width={44} height={44} />
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-[26px] font-medium tracking-tighter text-base-800">
            Sign in to the Hacker Portal
          </h1>
          <p className="font-body text-[14px] leading-snug text-sun-400">
            Enter the email you applied with, and we&apos;ll send you a 6-digit code to sign in.
          </p>
        </div>

        <SignInForm variant="portal" errorCode={error} />

        <p className="font-body text-[12px] text-sun-400">
          By signing in, you agree to our{" "}
          <Link
            href="/legal/terms"
            className="underline-offset-2 hover:text-orange hover:underline"
          >
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy"
            className="underline-offset-2 hover:text-orange hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
