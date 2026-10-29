import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign up · YomiPop" };

// Shows the sign-up page.
export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <AuthForm mode="sign-up" />
    </main>
  );
}
