import Image from "next/image";
import Link from "next/link";

export default function PortalUnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface-page p-5">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-sm bg-surface-card p-6 text-center shadow-pop sm:p-8">
        <Image src="/icon.svg" alt="SummerHacks" width={44} height={44} />
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display text-[26px] font-medium tracking-tighter text-base-800">
            Access not available
          </h1>
          <p className="font-body text-[14px] leading-snug text-sun-400">
            Your account doesn&apos;t have portal access yet. If you were accepted as a hacker,
            contact the organizers - your role may still need to be updated.
          </p>
        </div>
        <Link
          href="/portal/login"
          className="font-body text-[14px] text-sun-400 underline-offset-2 hover:text-orange hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
