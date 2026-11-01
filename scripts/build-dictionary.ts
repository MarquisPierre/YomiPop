import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import type { JMdict, JMdictWord } from "@scriptin/jmdict-simplified-types";
import type { DictionaryEntry } from "../apps/extension/src/dictionary/types";

// Points at the latest jmdict-simplified release on GitHub.
const RELEASE_URL =
  "https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest";

// Caches the raw download so rebuilds skip it.
const RAW_DIR = "data/raw";

// Receives the files the extension loads.
const OUT_DIR = "apps/extension/public/dict";

// Sets how many entries go in each output file.
const CHUNK_SIZE = 20_000;

// Marks spellings JMdict flags as search-only.
const SEARCH_ONLY_TAGS = new Set(["sK", "sk"]);

// Downloads the full English JMdict zip unless it's cached, and returns its path.
async function downloadJmdict(): Promise<string> {
  // Sends CI's token when there is one, since GitHub limits anonymous API calls.
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(RELEASE_URL, {
    headers: {
      "User-Agent": "yomipop-build",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);

  const release = (await response.json()) as {
    assets: { name: string; browser_download_url: string }[];
  };
  const asset = release.assets.find((a) =>
    /^jmdict-eng-\d.*\.json\.zip$/.test(a.name),
  );
  if (!asset)
    throw new Error("No full English JMdict zip in the latest release");

  const zipPath = join(RAW_DIR, asset.name);
  if (existsSync(zipPath)) {
    console.log(`Using cached ${asset.name}`);
    return zipPath;
  }

  console.log(`Downloading ${asset.name}...`);
  const file = await fetch(asset.browser_download_url);
  if (!file.ok) throw new Error(`Download failed with ${file.status}`);

  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(zipPath, Buffer.from(await file.arrayBuffer()));
  return zipPath;
}

// Unzips the download and parses the JSON inside.
function readJmdict(zipPath: string): JMdict {
  const files = unzipSync(readFileSync(zipPath));
  const json = Object.values(files)[0];
  if (!json) throw new Error("Zip file was empty");
  return JSON.parse(strFromU8(json)) as JMdict;
}

// Checks whether a spelling is tagged as search-only.
function isSearchOnly(tags: string[]): boolean {
  return tags.some((tag) => SEARCH_ONLY_TAGS.has(tag));
}

// Keeps only the fields the pop-up uses.
function toEntry(word: JMdictWord): DictionaryEntry {
  return {
    id: word.id,
    kanji: word.kanji.filter((k) => !isSearchOnly(k.tags)).map((k) => k.text),
    readings: word.kana.filter((k) => !isSearchOnly(k.tags)).map((k) => k.text),
    senses: word.sense.map((sense) => ({
      partsOfSpeech: sense.partOfSpeech,
      meanings: sense.gloss.map((gloss) => gloss.text),
    })),
  };
}

// Rebuilds the dictionary files from the latest JMdict release.
async function main(): Promise<void> {
  const jmdict = readJmdict(await downloadJmdict());
  const entries = jmdict.words.map(toEntry);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const files: string[] = [];
  for (let start = 0; start < entries.length; start += CHUNK_SIZE) {
    const name = `jmdict-${files.length}.json`;
    const chunk = entries.slice(start, start + CHUNK_SIZE);
    writeFileSync(join(OUT_DIR, name), JSON.stringify(chunk));
    files.push(name);
  }

  const index = {
    version: `${jmdict.version}-${jmdict.dictDate}`,
    entryCount: entries.length,
    files,
  };
  writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));

  console.log(`Wrote ${entries.length} entries in ${files.length} files`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
