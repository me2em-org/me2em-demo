import { useState, useCallback, useRef } from 'react';
import { Identity, generateSeedPhrase, get64ByteSeedFromMnemonic, validateSeedPhrase } from '@me2em/core';
import { logger } from '../utils/logger';

export interface DemoState {
  seedPhrase: string[] | null;
  seedBytes: Uint8Array | null;
  identity: Identity | null;
  rootPubKey: string | null;
}

export function useMe2em() {
  const [seedPhrase, setSeedPhrase] = useState<string[] | null>(null);
  const [seedBytes, setSeedBytes] = useState<Uint8Array | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [rootPubKey, setRootPubKey] = useState<string | null>(null);
  const identityRef = useRef<Identity | null>(null);

  const generateNewSeed = useCallback(() => {
    logger.info('Generating 128-bit BIP39 seed phrase…');
    const phrase = generateSeedPhrase(128);
    setSeedPhrase(phrase);
    logger.success('Seed phrase generated', phrase.join(' '));
    return phrase;
  }, []);

  const createIdentityFromSeed = useCallback(async (phrase: string[]) => {
    const validation = validateSeedPhrase(phrase);
    if (!validation.isValid) throw new Error(validation.error);

    logger.info('Deriving 64-byte BIP39 seed (PBKDF2-HMAC-SHA512)…');
    const seed = await get64ByteSeedFromMnemonic(phrase);
    setSeedBytes(seed);

    logger.info('Creating root Identity from 64-byte seed…');
    const id = await Identity.fromSeed(seed);
    identityRef.current = id;
    setIdentity(id);

    const pubKeyHex = Array.from(id.getPublicKey())
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
    setRootPubKey(pubKeyHex);
    logger.success('Identity created', `pub: ${pubKeyHex.slice(0, 16)}…`);
    return id;
  }, []);

  const resetAll = useCallback(() => {
    if (identityRef.current) identityRef.current.dispose();
    identityRef.current = null;
    setSeedPhrase(null);
    setSeedBytes(null);
    setIdentity(null);
    setRootPubKey(null);
  }, []);

  return {
    seedPhrase,
    seedBytes,
    identity,
    rootPubKey,
    generateNewSeed,
    createIdentityFromSeed,
    resetAll,
  };
}
