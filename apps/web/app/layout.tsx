import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Header } from "./Header";

// Loads the rounded font for headings and big words. It covers Japanese too.
const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["500", "700", "800"],
  subsets: ["latin"],
});

// Loads the body font, which draws kanji cleanly. Only the Latin part is preloaded;
// Japanese characters load as a page needs them.
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YomiPop",
  description: "Review the Japanese words you've saved.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rounded.variable} ${notoSansJp.variable} h-full antialiased`}
      // Lets the theme script below change the page before React takes over.
      suppressHydrationWarning
    >
      <head>
        {/* Sets the theme before the page draws, so it never flashes the wrong colours.
            Uses the saved choice, or the computer's setting when there isn't one. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("yomipop.theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
