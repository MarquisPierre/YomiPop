import { UserMenu } from "./UserMenu";

// Shows the home page.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold">YomiPop</h1>
      <UserMenu />
    </main>
  );
}
