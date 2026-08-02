import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { confirmSignIn } from "./actions";

export const metadata = {
  title: "Confirm sign-in",
};

type SearchParams = Promise<{ token_hash?: string; type?: string }>;

export default async function ConfirmSignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token_hash: tokenHash, type } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface-page p-5">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-sm bg-surface-card p-6 sm:p-8 shadow-pop">
        <Image src="/icon.svg" alt="SummerHacks" width={44} height={44} />

        {tokenHash ? (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="font-display text-[26px] font-medium tracking-tighter text-base-800">
                Finish signing in
              </h1>
              <p className="font-body text-[14px] leading-snug text-sun-400">
                Confirm it&apos;s really you to open the Hacker Portal on this device.
              </p>
            </div>

            {/* Verification happens on submit, never on page load - see actions.ts */}
            <form action={confirmSignIn} className="flex w-full flex-col gap-4">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type ?? "email"} />
              <button
                type="submit"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-orange px-6 font-display text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Continue
                <ArrowUp size={18} className="rotate-90" />
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="font-display text-[26px] font-medium tracking-tighter text-base-800">
                This link looks incomplete
              </h1>
              <p className="font-body text-[14px] leading-snug text-sun-400">
                Head back to the sign-in page and request a new code.
              </p>
            </div>

            <Link
              href="/portal/login"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-orange px-6 font-display text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Back to sign-in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
