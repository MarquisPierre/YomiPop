import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign in · YomiPop" };

// Shows the sign-in page.
export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <AuthForm mode="sign-in" />
    </main>
  );
}
