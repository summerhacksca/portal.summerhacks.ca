import SignInForm from "@/components/auth/SignInForm";

type SearchParams = Promise<{ error?: string }>;

export default async function RSVPLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fffaf2] p-5 text-[#221b14]">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[28px] bg-white p-6 sm:p-8 shadow-sm">
        <h1 className="text-[28px] font-medium tracking-[-0.04em] text-[#15110d]">
          Sign in to RSVP
        </h1>
        <p className="text-center text-[15px] leading-snug text-[#2f2a26]">
          Enter your email and we&apos;ll send you a 6-digit code to sign in.
        </p>

        <SignInForm variant="rsvp" errorCode={error} />
      </div>
    </main>
  );
}
