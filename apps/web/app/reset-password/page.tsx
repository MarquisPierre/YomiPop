import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password · YomiPop" };

// Shows the page the reset link in the email opens.
export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      {/* Waits for the link's token, which only the browser knows. */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
