# Decision log

One short entry per big choice: what was decided, the options, why, and the trade-off.

## Monorepo with npm workspaces — 2026-10-26

- **Options:** one repo with workspaces; separate repos for the extension, API and website.
- **Why:** the three apps share types and change together. One repo means one pull request for a change that touches all three, and npm workspaces need no extra tools.
- **Trade-off:** installs and CI cover everything, even when only one app changed.

## Fastify for the API — 2026-10-26

- **Options:** Fastify, Express.
- **Why:** Fastify checks request bodies against JSON schemas built in, logs as JSON with pino, and has `inject` for testing routes without a running server.
- **Trade-off:** a smaller ecosystem than Express, and schema errors read less friendly until you're used to them.

## Our own conjugation rules instead of kuromoji — 2026-10-29

- **Options:** kuromoji's tokenizer (the build plan's pick); a table of deinflection rules matched against JMdict.
- **Why:** the pop-up only needs to turn 食べた back into 食べる. A rule table does that in a few kilobytes, while kuromoji adds about 20 MB of dictionary files to the extension.
- **Trade-off:** no full sentence parsing. Rare forms need a new rule, and a tokenizer would split words more accurately in long runs of kana.

## FSRS instead of SM-2 for scheduling — 2026-10-29

- **Options:** SM-2 (classic Anki); FSRS through ts-fsrs.
- **Why:** FSRS is what modern Anki uses. It models how memory fades, so it needs fewer reviews for the same recall, and ts-fsrs is maintained and typed.
- **Trade-off:** harder to explain than SM-2's simple multipliers. The card's schedule is several numbers instead of one interval.

## Better Auth instead of hand-built JWTs — 2026-10-29

- **Options:** JWT access and refresh tokens with bcrypt (the build plan's pick); Better Auth.
- **Why:** it gave secure sessions, Google sign-in, email verification, password reset and account deletion without writing token rotation myself, which is easy to get subtly wrong.
- **Trade-off:** less control over the token format, and the extension reads the website's session cookie instead of holding its own tokens.

## One Card table instead of Notes and NoteTypes — 2026-10-29

- **Options:** Anki's model, where a note makes one card per template (the build plan's pick); a single card per word.
- **Why:** the app only has one card type, Japanese to English. A single table kept every route and query simple.
- **Trade-off:** adding English to Japanese cards later means adding notes and moving existing cards over.

## Free hosting: Vercel, Render and Neon — 2026-10-30

- **Options:** paid hosting; free tiers.
- **Why:** the app must cost nothing. The website forwards `/api` to the API, so the browser only talks to one site, and login cookies just work.
- **Trade-off:** Render's free server sleeps after 15 minutes, so the first request after a pause takes up to a minute.

## Email through a Google Apps Script — 2026-10-31

- **Options:** Gmail's mail server; Resend; a Google Apps Script web app.
- **Why:** Render's free plan blocks outgoing mail-server connections. A script in my Google account sends mail over plain web requests, for free, from my Gmail.
- **Trade-off:** about 100 emails a day, and it depends on a script outside the repo.

## One daily new-card limit across all decks — 2026-10-31

- **Options:** a limit per deck (the build plan's pick, like Anki); one shared limit.
- **Why:** simpler to set and to reason about while there are only a few decks.
- **Trade-off:** you can't give one deck more new cards than another.

## Gemini's free tier for AI — 2026-10-31

- **Options:** Claude or OpenAI (the build plan's picks); Gemini's free tier.
- **Why:** the app must be free. Gemini Flash writes good example sentences, translations and grammar notes at no cost. Results are cached by word, and each person gets 50 AI requests a day, so the free quota goes a long way.
- **Trade-off:** the free tier's limits change often, and Google may use free-tier requests to improve its models.

## Searching Unsplash instead of generating pictures — 2026-10-31

- **Options:** image generation; Pexels; Unsplash.
- **Why:** search is fast and free, and the build plan says to cut generated images first. Pexels had paused new API keys, so it's Unsplash, linking to its photos and crediting the photographer as its rules ask.
- **Trade-off:** abstract words get weaker pictures, and the free tier allows 50 searches an hour until the app is approved.

## Chrome's built-in translator for page sentences — 2026-10-31

- **Options:** an AI service; DeepL; Chrome's on-device translator.
- **Why:** it's free, private (the sentence never leaves the computer) and has no limits.
- **Trade-off:** it only works in Chrome, and the first use downloads a language pack.

## Supabase Storage instead of Cloudflare R2 — 2026-11-01

- **Options:** R2 (the build plan's pick); Supabase Storage; storing files in Postgres.
- **Why:** R2 needs a card on file. Supabase's free 1 GB needs none, supports one-time upload links, and its buckets reject wrong file types and sizes themselves.
- **Trade-off:** 1 GB is the cap, though pictures are shrunk to WebP first, so that's thousands of them.

## Natural AI voices, made once and stored — 2026-11-01

- **Options:** the browser's built-in voices; paid neural voices (Azure, Google Cloud); Gemini's speech models.
- **Why:** browser voices sound robotic, and Gemini's speech is natural and free. Each word or sentence is made once, stored in Supabase, and shared by everyone, so the daily limit lasts.
- **Trade-off:** the first play of a new word waits a couple of seconds, and WAV files are larger than compressed audio.

## shadcn/ui for the website's components — 2026-11-01

- **Options:** hand-written Tailwind; a component library; shadcn/ui.
- **Why:** it copies readable components into the repo, built on Radix, so dialogs trap focus and menus work by keyboard, as the build plan's accessibility section asks.
- **Trade-off:** the copied components are mine to keep up to date.
