# Chrome Web Store listing

The text for each field of the store dashboard, kept here so updates reuse it.

## Store listing

**Name:** YomiPop

**Summary** (132 characters max, same as the manifest):
Hover Japanese words for instant readings and meanings, then save them as flashcards with AI sentences, pictures and audio.

**Category:** Education · **Language:** English

**Description:**

Read real Japanese on any website. Hover a word (or hold Shift and hover) and YomiPop shows its reading and meanings right away, even for conjugated verbs and adjectives.

Found a word worth keeping? Save it as a flashcard in one click, with the sentence you found it in. Then make the card your own:

- Pick which meaning you want to learn
- Keep the original sentence, or have AI write a simple new one
- Add a picture that matches the word, from Unsplash or your own computer
- Hear the word and sentence read aloud by a natural-sounding voice
- Get a short AI explanation of any sentence you select

Review your cards on the YomiPop website. A spaced-repetition scheduler (FSRS) brings each card back right before you'd forget it. Sort words into decks, choose which decks to study, and see how many cards are due from the extension's badge.

The dictionary runs on your computer, so lookups are instant and private. Nothing leaves your browser until you save a card or ask for AI help.

Dictionary data from JMdict by the EDRDG, under CC BY-SA 4.0.

## Privacy practices

**Single purpose:**
Look up Japanese words on web pages and save them as flashcards to review.

**Permission justifications:**

- **storage:** Stores the dictionary on the user's computer, their pop-up and deck settings, and which words they've already saved.
- **scripting:** Adds the pop-up to tabs that were already open when the extension is installed, so it works without reloading them.
- **cookies:** Reads the user's YomiPop sign-in cookie, so the extension can save cards to their account without a second log-in.
- **alarms:** Updates the badge showing how many cards are due for review every few minutes.
- **Host permission (yomipop.vercel.app):** Sends saved cards and AI requests to the user's YomiPop account.
- **Content script on all sites:** Shows the pop-up when the user hovers over Japanese text on whatever site they are reading.

**Remote code:** No, I am not using remote code. All code is in the package.

**Data usage**, the boxes to tick:

- Personally identifiable information (name and email for the account)
- Authentication information (the sign-in cookie)
- Website content (the word and sentence the user chooses to save)

And all three certifications: no selling data, no unrelated uses, no creditworthiness or lending uses.

**Privacy policy:** https://yomipop.vercel.app/privacy
