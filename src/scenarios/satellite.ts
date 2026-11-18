import {
  Identity,
  Session,
  verifyWalletBinding,
  type Handle,
  type SubHandle,
  type WalletDescriptor,
  type PaymentRequest,
} from '@me2em/core';
import {
  SolanaWalletTree,
  verifyWalletBindingSolana,
  createPaymentReference,
  createPaymentRequestURL,
  SOLANA_CHAINS,
  SOLANA_RPC_ENDPOINTS,
  pay,
  RpcClient,
} from '@me2em/solana';
import { logger } from '../utils/logger';

export interface SatelliteResult {
  satHandleId: string;
  buyerSubHandleId: string;
  attestationToken: string;
  subAttestationToken: string;
  sessionToken: string;
  walletAddress: string;
  walletBindingOk: boolean;
  onCurveOk: boolean;
  paymentRequestUrl: string;
  paymentTxRef: string | null;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  buyerId: string;
}

const DEVNET_CHAIN = SOLANA_CHAINS.devnet;
const DEVNET_RPC = SOLANA_RPC_ENDPOINTS.devnet;

export async function runSatelliteScenario(
  identity: Identity,
  seedBytes: Uint8Array,
): Promise<SatelliteResult> {
  logger.setScenario('satellite');
  // 1. Derive satellite Handle (attested by operator)
  logger.info('Deriving satellite Handle "sat-eo-07"…');
  const satHandle: Handle = await identity.deriveHandle('sat-eo-07', {
    displayName: 'Earth Observation Satellite 07',
  });

  // 2. Attest the satellite Handle with a grant
  logger.info('Attesting satellite Handle (operator → satellite)…');
  const A = await identity.attestHandle('sat-eo-07', {
    audiences: ['tasking.portal.example'],
    scopes: ['imaging:task', 'imaging:fetch', 'downlink:capacity'],
    maxSessionTtl: 3600,
    subNamePatterns: ['client-*'],
  });

  // 3. Derive buyer SubHandle on-board
  const buyerName = 'client-acme-42';
  logger.info(`Deriving buyer SubHandle "${buyerName}"…`);
  const buyerSub: SubHandle = await satHandle.deriveSubHandle(buyerName, {
    displayName: 'ACME Corp — Downlink Access',
  });

  // 4. Attest the SubHandle with a time-boxed grant (the sale)
  logger.info('Attesting buyer SubHandle (satellite → buyer, time-boxed)…');
  const B = await satHandle.attestSubHandle(buyerName, {
    audiences: ['tasking.portal.example'],
    scopes: ['imaging:task', 'imaging:fetch'],
    maxSessionTtl: 1800,
  }, { ttlSeconds: 3600 });

  // 5. Create a session for the buyer
  logger.info('Creating buyer session (audience: tasking.portal.example)…');
  const session = await Session.create(buyerSub, {
    audience: 'tasking.portal.example',
    scopes: ['imaging:task'],
    ttl: 1800,
  });

  // 6. Verify the full attestation chain statelessly
  logger.info('Verifying session against attestation chain (root public key only)…');
  const verified = await Session.verifyAttested(
    session.token,
    identity.getPublicKey(),
    [A.token, B.token],
    'tasking.portal.example',
  );
  logger.success('Session verified — chain valid', `session: ${verified.audience}`);

  // 7. Derive the satellite's Solana wallet (deterministic)
  logger.info('Deriving satellite Solana wallet (devnet)…');
  const tree = SolanaWalletTree.fromSeed(seedBytes);
  const wallet = await tree.deriveWallet(0);
  const walletDescriptor: WalletDescriptor = {
    chain: DEVNET_CHAIN,
    address: wallet.address,
    derivationPath: wallet.derivationPath,
    label: 'sat-eo-07',
  };

  // 8. Verify wallet binding (core default + on-curve)
  const entityRef = {
    id: satHandle.getId(),
    kind: 'handle' as const,
    name: 'sat-eo-07',
  };
  const coreBindingOk = await verifyWalletBinding(
    walletDescriptor,
    entityRef,
    A,
    { issuerPublicKey: identity.getPublicKey() },
  );
  const onCurveOk = verifyWalletBindingSolana(walletDescriptor);
  logger.info(`Wallet binding: core=${coreBindingOk}, on-curve=${onCurveOk}`);

  // 9. Build a payment request (buyer pays seller for downlink capacity)
  logger.info('Building Solana payment request…');
  const buyerTree = SolanaWalletTree.fromSeed(seedBytes);
  const buyerWallet = await buyerTree.deriveWallet(1);
  const buyerAddress = buyerWallet.address;

  const reference = createPaymentReference();
  const paymentRequest: PaymentRequest = {
    chain: DEVNET_CHAIN,
    payTo: wallet.address,
    amount: '0.005',
    asset: 'sol',
    reference,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    extra: {
      sellerId: satHandle.getId(),
      buyerId: buyerSub.getId(),
      memo: 'Downlink capacity — 30 min window',
      reference,
    },
  };

  const paymentRequestUrl = createPaymentRequestURL(paymentRequest);
  logger.info('Payment request URL built', paymentRequestUrl.slice(0, 60) + '…');

  // 10. Attempt on-chain payment (devnet — may fail if no funds)
  let paymentTxRef: string | null = null;
  let paymentStatus: SatelliteResult['paymentStatus'] = 'pending';

  try {
    const rpc = new RpcClient({ endpoint: DEVNET_RPC });
    logger.info('Submitting SOL payment to devnet…');
    paymentTxRef = await pay(
      { chain: DEVNET_CHAIN, address: buyerAddress },
      paymentRequest,
      { seed: seedBytes, memo: 'me2em-demo' },
      { rpc, chain: DEVNET_CHAIN },
    );
    paymentStatus = 'confirmed';
    logger.success('Payment confirmed on devnet', paymentTxRef.slice(0, 16) + '…');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn('Payment failed (expected on devnet without funds)', msg.slice(0, 100));
    paymentStatus = 'failed';
  }

  tree.dispose();
  buyerTree.dispose();

  return {
    satHandleId: satHandle.getId(),
    buyerSubHandleId: buyerSub.getId(),
    attestationToken: A.token,
    subAttestationToken: B.token,
    sessionToken: session.token,
    walletAddress: wallet.address,
    walletBindingOk: coreBindingOk,
    onCurveOk,
    paymentRequestUrl,
    paymentTxRef,
    paymentStatus,
    buyerId: buyerSub.getId(),
  };
}
