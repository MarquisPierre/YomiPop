import type { Metadata } from "next";
import { AccountSettings } from "./AccountSettings";

export const metadata: Metadata = { title: "Account · YomiPop" };

// Shows the account page.
export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <AccountSettings />
    </main>
  );
}
