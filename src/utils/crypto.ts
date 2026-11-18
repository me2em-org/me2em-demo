import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { sha256 } from '@noble/hashes/sha2.js';

export function generateSeedPhrase(): string[] {
  const mnemonic = generateMnemonic(wordlist, 128);
  return mnemonic.split(' ');
}

export function normalizeSeedPhrase(seedPhrase: string | string[]): string[] {
  const words = Array.isArray(seedPhrase) ? seedPhrase : seedPhrase.trim().split(/\s+/);
  return words.map(word => word.toLowerCase().trim()).filter(word => word.length > 0);
}

export function validateSeedPhrase(words: string[]): { isValid: boolean; error?: string } {
  if (words.length !== 12) {
    return { isValid: false, error: `Seed phrase must be 12 words, got ${words.length}` };
  }
  const normalized = normalizeSeedPhrase(words);
  for (const word of normalized) {
    if (!wordlist.includes(word)) {
      return { isValid: false, error: `Invalid word: ${word}` };
    }
  }
  const isValid = validateMnemonic(normalized.join(' '), wordlist);
  return { isValid, error: isValid ? undefined : 'Invalid seed phrase checksum' };
}

export async function get32ByteSeedFromMnemonic(seedWords: string[]): Promise<Uint8Array> {
  const validation = validateSeedPhrase(seedWords);
  if (!validation.isValid) throw new Error(validation.error);
  
  const mnemonic = normalizeSeedPhrase(seedWords).join(' ');
  const seed64 = await mnemonicToSeed(mnemonic);
  return sha256(seed64); 
}
