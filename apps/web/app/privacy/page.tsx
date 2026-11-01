import type { Metadata } from "next";

// Sets the browser tab title for this page.
export const metadata: Metadata = { title: "Privacy policy · YomiPop" };

// Shows the privacy policy that the Chrome Web Store listing links to.
export default function Privacy() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-4xl font-extrabold">Privacy policy</h1>
      <p className="text-muted-foreground">Last updated November 1, 2026</p>

      {/* Says up front what YomiPop never does, since that's what most readers want to know. */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold">The short version</h2>
        <p>
          YomiPop only keeps what you choose to save. It doesn&apos;t track the
          pages you visit, doesn&apos;t sell your data, and doesn&apos;t show
          ads.
        </p>
      </section>

      {/* Explains that looking words up happens on your computer. */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold">The extension</h2>
        <p>
          The extension reads the text under your cursor so it can look the word
          up. The dictionary is stored on your computer, so lookups never leave
          your browser. Sentence translations use Chrome&apos;s built-in
          translator, which also runs on your computer.
        </p>
        <p>
          Something is only sent to YomiPop when you act: when you save a card,
          press Explain, or ask for an AI sentence, picture or audio.
        </p>
      </section>

      {/* Lists everything stored on the account. */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold">What we store</h2>
        <ul className="list-disc pl-6">
          <li>
            Your account: name, email, password (hashed) and profile picture.
          </li>
          <li>
            Your cards and decks: words, sentences, translations, pictures and
            audio.
          </li>
          <li>Your review history, so cards come back at the right time.</li>
          <li>A sign-in cookie that keeps you signed in.</li>
        </ul>
      </section>

      {/* Names each outside service and what it receives, as the store's data rules ask. */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold">Services we use</h2>
        <ul className="list-disc pl-6">
          <li>
            Google Gemini gets the word or sentence you ask about, to write
            sentences, explanations and audio.
          </li>
          <li>Unsplash gets search words, to find a picture for a card.</li>
          <li>
            Google sign-in, if you choose it, shares your name, email and
            picture.
          </li>
          <li>
            Neon stores the database, Supabase stores pictures and audio, and
            Vercel and Render run the site.
          </li>
          <li>
            Google Apps Script sends the verification and password-reset emails.
          </li>
        </ul>
      </section>

      {/* Tells people how to remove everything. */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold">Deleting your data</h2>
        <p>
          Deleting your account on the Account page permanently removes your
          account, cards, decks, reviews, and the pictures you uploaded.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold">Contact</h2>
        <p>Questions? Email marquispierre27@gmail.com.</p>
      </section>
    </main>
  );
}
