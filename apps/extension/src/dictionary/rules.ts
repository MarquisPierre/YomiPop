import type { Rule } from "./deinflect";

// Lists a godan ending with its あ, い, え and お sounds and its te and past forms.
type GodanRow = readonly [
  u: string,
  a: string,
  i: string,
  e: string,
  o: string,
  te: string,
  ta: string,
];

const GODAN_ROWS: GodanRow[] = [
  ["う", "わ", "い", "え", "お", "って", "った"],
  ["く", "か", "き", "け", "こ", "いて", "いた"],
  ["ぐ", "が", "ぎ", "げ", "ご", "いで", "いだ"],
  ["す", "さ", "し", "せ", "そ", "して", "した"],
  ["つ", "た", "ち", "て", "と", "って", "った"],
  ["ぬ", "な", "に", "ね", "の", "んで", "んだ"],
  ["ぶ", "ば", "び", "べ", "ぼ", "んで", "んだ"],
  ["む", "ま", "み", "め", "も", "んで", "んだ"],
  ["る", "ら", "り", "れ", "ろ", "って", "った"],
];

// Builds the rules for one godan ending.
function godanRules([u, a, i, e, o, te, ta]: GodanRow): Rule[] {
  return [
    {
      name: "negative",
      from: a + "ない",
      to: u,
      toType: "v5",
      fromType: "adj-i",
    },
    { name: "past", from: ta, to: u, toType: "v5" },
    { name: "te-form", from: te, to: u, toType: "v5", fromType: "te" },
    { name: "polite", from: i + "ます", to: u, toType: "v5", fromType: "masu" },
    { name: "want", from: i + "たい", to: u, toType: "v5", fromType: "adj-i" },
    { name: "potential", from: e + "る", to: u, toType: "v5", fromType: "v1" },
    { name: "passive", from: a + "れる", to: u, toType: "v5", fromType: "v1" },
    {
      name: "causative",
      from: a + "せる",
      to: u,
      toType: "v5",
      fromType: "v1",
    },
    { name: "volitional", from: o + "う", to: u, toType: "v5" },
    { name: "imperative", from: e, to: u, toType: "v5" },
    { name: "conditional", from: e + "ば", to: u, toType: "v5" },
  ];
}

// Lists every rule the deinflector tries.
export const RULES: Rule[] = [
  ...GODAN_ROWS.flatMap(godanRules),

  // Covers 行く, whose te and past forms are irregular.
  { name: "te-form", from: "って", to: "く", toType: "v5", fromType: "te" },
  { name: "past", from: "った", to: "く", toType: "v5" },

  // Covers ichidan verbs like 食べる.
  { name: "negative", from: "ない", to: "る", toType: "v1", fromType: "adj-i" },
  { name: "past", from: "た", to: "る", toType: "v1" },
  { name: "te-form", from: "て", to: "る", toType: "v1", fromType: "te" },
  { name: "polite", from: "ます", to: "る", toType: "v1", fromType: "masu" },
  { name: "want", from: "たい", to: "る", toType: "v1", fromType: "adj-i" },
  {
    name: "potential or passive",
    from: "られる",
    to: "る",
    toType: "v1",
    fromType: "v1",
  },
  { name: "causative", from: "させる", to: "る", toType: "v1", fromType: "v1" },
  { name: "volitional", from: "よう", to: "る", toType: "v1" },
  { name: "imperative", from: "ろ", to: "る", toType: "v1" },
  { name: "conditional", from: "れば", to: "る", toType: "v1" },

  // Covers する, and nouns like 勉強 that take it.
  {
    name: "negative",
    from: "しない",
    to: "する",
    toType: "vs-i",
    fromType: "adj-i",
  },
  { name: "past", from: "した", to: "する", toType: "vs-i" },
  { name: "te-form", from: "して", to: "する", toType: "vs-i", fromType: "te" },
  {
    name: "polite",
    from: "します",
    to: "する",
    toType: "vs-i",
    fromType: "masu",
  },
  {
    name: "want",
    from: "したい",
    to: "する",
    toType: "vs-i",
    fromType: "adj-i",
  },
  {
    name: "potential",
    from: "できる",
    to: "する",
    toType: "vs-i",
    fromType: "v1",
  },
  {
    name: "passive",
    from: "される",
    to: "する",
    toType: "vs-i",
    fromType: "v1",
  },
  {
    name: "causative",
    from: "させる",
    to: "する",
    toType: "vs-i",
    fromType: "v1",
  },
  { name: "volitional", from: "しよう", to: "する", toType: "vs-i" },
  { name: "imperative", from: "しろ", to: "する", toType: "vs-i" },
  { name: "conditional", from: "すれば", to: "する", toType: "vs-i" },
  { name: "suru verb", from: "する", to: "", toType: "vs", fromType: "vs-i" },

  // Covers くる written in kana. 来る in kanji uses the ichidan rules.
  {
    name: "negative",
    from: "こない",
    to: "くる",
    toType: "vk",
    fromType: "adj-i",
  },
  { name: "past", from: "きた", to: "くる", toType: "vk" },
  { name: "te-form", from: "きて", to: "くる", toType: "vk", fromType: "te" },
  {
    name: "polite",
    from: "きます",
    to: "くる",
    toType: "vk",
    fromType: "masu",
  },
  { name: "want", from: "きたい", to: "くる", toType: "vk", fromType: "adj-i" },
  {
    name: "potential or passive",
    from: "こられる",
    to: "くる",
    toType: "vk",
    fromType: "v1",
  },
  { name: "volitional", from: "こよう", to: "くる", toType: "vk" },
  { name: "imperative", from: "こい", to: "くる", toType: "vk" },
  { name: "imperative", from: "来い", to: "来る", toType: "vk" },
  { name: "conditional", from: "くれば", to: "くる", toType: "vk" },

  // Covers い-adjectives like 高い.
  { name: "past", from: "かった", to: "い", toType: "adj-i" },
  {
    name: "negative",
    from: "くない",
    to: "い",
    toType: "adj-i",
    fromType: "adj-i",
  },
  { name: "te-form", from: "くて", to: "い", toType: "adj-i", fromType: "te" },
  { name: "adverb", from: "く", to: "い", toType: "adj-i" },
  { name: "conditional", from: "ければ", to: "い", toType: "adj-i" },

  // Covers ている and its short form てる, which conjugate like ichidan verbs.
  {
    name: "progressive",
    from: "ている",
    to: "て",
    toType: "te",
    fromType: "v1",
  },
  { name: "progressive", from: "てる", to: "て", toType: "te", fromType: "v1" },
  {
    name: "progressive",
    from: "でいる",
    to: "で",
    toType: "te",
    fromType: "v1",
  },
  { name: "progressive", from: "でる", to: "で", toType: "te", fromType: "v1" },

  // Covers the ます forms, which then go through the polite rules above.
  { name: "past", from: "ました", to: "ます", toType: "masu" },
  { name: "negative", from: "ません", to: "ます", toType: "masu" },
  { name: "past negative", from: "ませんでした", to: "ます", toType: "masu" },
  { name: "volitional", from: "ましょう", to: "ます", toType: "masu" },
];
