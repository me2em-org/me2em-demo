// Parse free-form "paper" text into seed words. Strips list numbering
// ("1. word"), trailing punctuation, and pure-number tokens; caps at 24 words.
export function parsePaperWords(raw: string): string[] {
  const tokens = raw
    .replace(/[\r\n\t]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const words: string[] = [];
  for (const token of tokens) {
    const stripped = token.replace(/^\d+\.\s*/, '');
    if (!stripped) continue;
    if (/^\d+$/.test(stripped)) continue;
    const clean = stripped.replace(/[.,;:!?"'(){}[\]]+$/g, '');
    if (!clean) continue;
    words.push(clean);
    if (words.length >= 24) break;
  }
  return words;
}
