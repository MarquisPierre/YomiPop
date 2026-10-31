import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password · YomiPop" };

// Shows the page for asking for a password reset link.
export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ForgotPasswordForm />
    </main>
  );
}
