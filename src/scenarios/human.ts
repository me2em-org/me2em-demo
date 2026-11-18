import { Identity, crypto as coreCrypto, type Handle } from '@me2em/core';
import { SolanaWalletTree } from '@me2em/solana';
import { base58 } from '@scure/base';
import { logger } from '../utils/logger';

export interface HumanWalletInfo {
  address: string;
  derivationPath: string;
  privateKeyBase58: string;
}

export interface HumanRootIdentity {
  pubKeyHex: string;
  privKeyHex: string;
}

export interface HumanHandleInfo {
  name: string;
  displayName: string;
  nickname: string;
  email: string;
  avatar: string;
  handleId: string;
  pubKeyHex: string;
  privKeyHex: string;
  password: string;
  channelKeyHex: string;
  wallet: HumanWalletInfo;
}

export interface HumanResult {
  root: HumanRootIdentity;
  contexts: HumanHandleInfo[];
}

// Demo profiles: the same human behind three isolated contexts.
// `.example` domains (RFC 2606) mark these addresses as demo-only.
const DEMO_PROFILES: Record<
  string,
  { displayName: string; nickname: string; email: string; avatar: string }
> = {
  work: {
    displayName: 'Alex Morgan',
    nickname: '@alex.morgan',
    email: 'a.morgan@meridian-corp.example',
    avatar: '💼',
  },
  family: {
    displayName: 'Papa Lex',
    nickname: '@dad.alex',
    email: 'alex.family@postbox.example',
    avatar: '🏡',
  },
  gym: {
    displayName: 'IronLex',
    nickname: '@iron.lex',
    email: 'ironlex@fitverse.example',
    avatar: '💪',
  },
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Demo-only fallback per user request: random placeholder shown if the
// official audit derivation is somehow unavailable in a given build.
function randomKeyBytes(): Uint8Array {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return buf;
}

export async function runHumanScenario(
  identity: Identity,
  seedBytes: Uint8Array,
): Promise<HumanResult> {
  const contexts = ['work', 'family', 'gym'];

  logger.info(
    'Deriving master private key (HKDF-SHA256, info=me2em/identity/v1/root)…',
  );
  // Official audit path from @me2em/core: deriveRootKey reproduces exactly
  // the key Identity.fromSeed holds (TSDoc: "reproduce or audit").
  let rootPrivKey: Uint8Array;
  try {
    rootPrivKey = coreCrypto.deriveRootKey(seedBytes);
  } catch {
    logger.warn('deriveRootKey unavailable — showing a random placeholder key');
    rootPrivKey = randomKeyBytes();
  }

  const root: HumanRootIdentity = {
    pubKeyHex: toHex(identity.getPublicKey()),
    privKeyHex: toHex(rootPrivKey),
  };

  const tree = SolanaWalletTree.fromSeed(seedBytes);
  const results: HumanHandleInfo[] = [];

  for (let i = 0; i < contexts.length; i++) {
    const name = contexts[i];
    const profile = DEMO_PROFILES[name];

    logger.info(`Deriving Handle "${name}" from root Identity…`);
    const handle: Handle = await identity.deriveHandle(name, {
      displayName: profile.displayName,
    });

    let handlePrivKey: Uint8Array;
    try {
      handlePrivKey = coreCrypto.deriveHandleKey(rootPrivKey, name);
    } catch {
      logger.warn(`deriveHandleKey("${name}") unavailable — random placeholder`);
      handlePrivKey = randomKeyBytes();
    }

    const wallet = await tree.deriveWallet(i);
    const privateKeyBase58 = base58.encode(wallet.privateKey);
    wallet.privateKey.fill(0); // wipe per API contract (fresh buffer)

    results.push({
      name,
      displayName: profile.displayName,
      nickname: profile.nickname,
      email: profile.email,
      avatar: profile.avatar,
      handleId: handle.getId(),
      pubKeyHex: toHex(handle.getPublicKey()),
      privKeyHex: toHex(handlePrivKey),
      password: handle.derivePassword(name, { byteLength: 16 }),
      channelKeyHex: toHex(handle.deriveChannelKey(name)),
      wallet: {
        address: wallet.address,
        derivationPath: wallet.derivationPath,
        privateKeyBase58,
      },
    });

    logger.success(
      `Handle "${name}" derived`,
      `wallet ${wallet.derivationPath} → ${wallet.address.slice(0, 8)}…`,
    );
  }

  tree.dispose();

  return { root, contexts: results };
}
