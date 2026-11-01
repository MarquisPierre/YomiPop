// Describes the parts of Chrome's built-in translator this uses. TypeScript doesn't know it yet.
interface ChromeTranslator {
  translate(text: string): Promise<string>;
}
interface ChromeTranslatorFactory {
  availability(options: LanguagePair): Promise<string>;
  create(options: LanguagePair): Promise<ChromeTranslator>;
}
interface LanguagePair {
  sourceLanguage: string;
  targetLanguage: string;
}

// Translates from Japanese to English.
const LANGUAGES: LanguagePair = { sourceLanguage: "ja", targetLanguage: "en" };

// Gives up on a translation after this long, so saving never hangs on it.
const TIMEOUT = 10_000;

let translator: Promise<ChromeTranslator> | null = null;

// Translates the sentence on this computer with Chrome's translator, or returns null if it can't.
// The first use downloads Chrome's language pack, which needs a key press to allow it.
export async function translateSentence(
  sentence: string,
): Promise<string | null> {
  const factory = (globalThis as { Translator?: ChromeTranslatorFactory })
    .Translator;
  if (!sentence) return null;
  if (!factory) {
    console.warn("YomiPop: Chrome's translator isn't available here.");
    return null;
  }

  try {
    const availability = await factory.availability(LANGUAGES);
    if (availability === "unavailable") {
      console.warn("YomiPop: Chrome can't translate Japanese to English.");
      return null;
    }
    translator ??= factory.create(LANGUAGES);
    const ready = translator;
    // Covers the language pack download too, which can be slow the first time.
    const translation = ready.then((t) => t.translate(sentence));
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), TIMEOUT),
    );
    const result = await Promise.race([translation, timeout]);
    if (result === null) {
      console.warn(
        `YomiPop: translation timed out (language pack was "${availability}").`,
      );
    }
    return result;
  } catch (error) {
    console.warn("YomiPop: translation failed.", error);
    // Tries creating the translator again next time.
    translator = null;
    return null;
  }
}
