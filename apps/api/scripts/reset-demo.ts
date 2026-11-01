// Loads apps/api/.env first, without replacing settings already given in the terminal,
// so DATABASE_URL can point at the live database for one run.
import "dotenv/config";
import { prisma } from "../src/db.js";
import { findImages, reportImageUse } from "../src/services/ai/images.js";

// Describes one sample card: the word, its sentence, and the deck it goes in.
interface SampleCard {
  deck: string;
  word: string;
  reading: string;
  meanings: string[];
  sentence: string;
  translation: string;
}

// Lists the demo's cards, a mix of news, everyday and food words a learner would really meet.
const SAMPLE_CARDS: SampleCard[] = [
  {
    deck: "News",
    word: "選挙",
    reading: "せんきょ",
    meanings: ["election"],
    sentence: "来月、市長の選挙があります。",
    translation: "There's a mayoral election next month.",
  },
  {
    deck: "News",
    word: "天気",
    reading: "てんき",
    meanings: ["weather"],
    sentence: "明日の天気は晴れるそうです。",
    translation: "They say tomorrow's weather will be sunny.",
  },
  {
    deck: "News",
    word: "地震",
    reading: "じしん",
    meanings: ["earthquake"],
    sentence: "昨日の夜、小さな地震がありました。",
    translation: "There was a small earthquake last night.",
  },
  {
    deck: "News",
    word: "経済",
    reading: "けいざい",
    meanings: ["economy", "economics"],
    sentence: "日本の経済について勉強しています。",
    translation: "I'm studying the Japanese economy.",
  },
  {
    deck: "Everyday",
    word: "猫",
    reading: "ねこ",
    meanings: ["cat"],
    sentence: "猫がソファの上で寝ています。",
    translation: "The cat is sleeping on the sofa.",
  },
  {
    deck: "Everyday",
    word: "電車",
    reading: "でんしゃ",
    meanings: ["train", "electric train"],
    sentence: "毎朝、電車で会社に行きます。",
    translation: "I take the train to work every morning.",
  },
  {
    deck: "Everyday",
    word: "傘",
    reading: "かさ",
    meanings: ["umbrella"],
    sentence: "雨が降りそうだから、傘を持っていこう。",
    translation: "It looks like rain, so let's take an umbrella.",
  },
  {
    deck: "Everyday",
    word: "図書館",
    reading: "としょかん",
    meanings: ["library"],
    sentence: "週末はよく図書館で本を読みます。",
    translation: "On weekends I often read books at the library.",
  },
  {
    deck: "Food",
    word: "寿司",
    reading: "すし",
    meanings: ["sushi"],
    sentence: "この店の寿司はとても新鮮です。",
    translation: "The sushi at this restaurant is very fresh.",
  },
  {
    deck: "Food",
    word: "食べる",
    reading: "たべる",
    meanings: ["to eat"],
    sentence: "野菜をもっと食べるようにしています。",
    translation: "I'm trying to eat more vegetables.",
  },
  {
    deck: "Food",
    word: "美味しい",
    reading: "おいしい",
    meanings: ["delicious", "tasty"],
    sentence: "母が作るカレーは本当に美味しい。",
    translation: "The curry my mom makes is really delicious.",
  },
  {
    deck: "Food",
    word: "抹茶",
    reading: "まっちゃ",
    meanings: ["matcha", "powdered green tea"],
    sentence: "京都で抹茶のアイスを食べました。",
    translation: "I ate matcha ice cream in Kyoto.",
  },
];

// Finds a photo for the card on Unsplash, the same way the card builder does.
// Returns nothing when Unsplash or the AI isn't available, so the card is saved without one.
async function findPhoto(card: SampleCard) {
  try {
    const [photo] = await findImages(card.word, card.meanings[0] ?? "");
    if (photo) await reportImageUse(photo.downloadLocation);
    return photo;
  } catch {
    return undefined;
  }
}

// Empties the demo account and fills it with fresh sample decks and cards.
async function resetDemo(): Promise<void> {
  const email = process.env.DEMO_EMAIL;
  if (!email) {
    throw new Error("Set DEMO_EMAIL to the demo account's email first.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No account with the email ${email}. Sign it up first.`);
  }

  // Shows which database is being changed, without printing the password in the address.
  const host = new URL(process.env.DATABASE_URL ?? "").host;
  console.log(`Resetting ${email} on ${host}`);

  // Deletes the old decks (their cards and reviews go with them), pictures and AI usage,
  // and puts the profile back, in case it was changed before the lock existed.
  await prisma.deck.deleteMany({ where: { userId: user.id } });
  await prisma.media.deleteMany({ where: { userId: user.id } });
  await prisma.aiUsage.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({
    where: { id: user.id },
    data: { name: "Demo", image: null, newCardsPerDay: 20 },
  });

  // Makes each deck once, in the order the cards first mention them.
  const deckIds = new Map<string, string>();
  for (const name of new Set(SAMPLE_CARDS.map((card) => card.deck))) {
    const deck = await prisma.deck.create({ data: { userId: user.id, name } });
    deckIds.set(name, deck.id);
  }

  // Adds each card as new and due now, with its photo when one is found.
  for (const card of SAMPLE_CARDS) {
    const deckId = deckIds.get(card.deck);
    if (!deckId) continue;
    const photo = await findPhoto(card);
    const media = photo
      ? await prisma.media.create({
          data: {
            userId: user.id,
            url: photo.url,
            source: "search",
            attribution: photo.attribution,
            width: photo.width,
            height: photo.height,
          },
        })
      : null;
    await prisma.card.create({
      data: {
        userId: user.id,
        deckId,
        word: card.word,
        reading: card.reading,
        meanings: card.meanings,
        sentence: card.sentence,
        translation: card.translation,
        imageId: media?.id ?? null,
      },
    });
    console.log(`  added ${card.word}${photo ? " with a photo" : ""}`);
  }
  console.log(`Done: ${SAMPLE_CARDS.length} cards in ${deckIds.size} decks.`);
}

resetDemo()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
