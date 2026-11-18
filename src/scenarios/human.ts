import { Identity, type Handle } from '@me2em/core';
import { logger } from '../utils/logger';

export interface HumanResult {
  contexts: Array<{
    name: string;
    handleId: string;
    pubKeyHex: string;
    password: string;
    channelKeyHex: string;
  }>;
  rootPubKeyHex: string;
}

export async function runHumanScenario(identity: Identity): Promise<HumanResult> {
  const contexts = ['work', 'family', 'gym'];
  const results: HumanResult['contexts'] = [];

  for (const name of contexts) {
    logger.info(`Deriving Handle "${name}" from root Identity…`);
    const handle: Handle = await identity.deriveHandle(name, {
      displayName: `User @ ${name}`,
    });

    const pubKeyHex = Array.from(handle.getPublicKey())
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    const password = handle.derivePassword(name, { byteLength: 16 });
    const channelKey = handle.deriveChannelKey(name);
    const channelKeyHex = Array.from(channelKey)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    logger.success(`Handle "${name}" derived`, `id: ${handle.getId().slice(0, 12)}…`);
    results.push({
      name,
      handleId: handle.getId(),
      pubKeyHex,
      password,
      channelKeyHex,
    });
  }

  return {
    contexts: results,
    rootPubKeyHex: Array.from(identity.getPublicKey())
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}
