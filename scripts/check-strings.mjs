/* Every T("…") key has to resolve to real words in both languages.
   A key that resolves to itself is a key printed on the page, which is how
   "chooser-intro" was shown to an English reader. */
import { readFileSync } from "node:fs";
import { AR } from "../data/ar.mjs";

const src = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const keys = [...new Set([...src.matchAll(/\bT\(\s*"([^"]+)"/g)].map((m) => m[1]))].sort();

// The English map inside app.js, for keys that are not their own English.
const enBlock = src.slice(src.indexOf("const EN = {"), src.indexOf("\n  };", src.indexOf("const EN = {")));
const enKeys = new Set([...enBlock.matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]));
// A key that reads like a sentence is its own English.
const isPhrase = (k) => /[ A-Z?]/.test(k) || !/-/.test(k);

const noEnglish = keys.filter((k) => !enKeys.has(k) && !isPhrase(k));
const noArabic = keys.filter((k) => !AR.ui[k]);
const staleEn = [...enKeys].filter((k) => !keys.includes(k));
const staleAr = Object.keys(AR.ui).filter((k) => !keys.includes(k));

console.log(`${keys.length} keys in use`);
const fail = [];
if (noEnglish.length) fail.push(`no English (would print the key):\n   ${noEnglish.join("\n   ")}`);
if (noArabic.length) fail.push(`no Arabic (falls back to English):\n   ${noArabic.join("\n   ")}`);
if (staleEn.length) console.log(`note: ${staleEn.length} unused English entr(y/ies): ${staleEn.join(", ")}`);
if (staleAr.length) console.log(`note: ${staleAr.length} unused Arabic entr(y/ies)`);

if (fail.length) { console.error("\nFAIL\n" + fail.join("\n")); process.exit(1); }
console.log("every key resolves in both languages.");
