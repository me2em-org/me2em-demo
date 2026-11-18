import {
  Identity,
  Session,
  type Handle,
  type SubHandle,
} from '@me2em/core';
import { logger } from '../utils/logger';

export interface AgentResult {
  agentHandleId: string;
  agentSubHandleId: string;
  attestationToken: string;
  sessionToken: string;
  sessionVerifiedBefore: boolean;
  sessionVerifiedAfter: boolean;
  revoked: boolean;
  rootPubKeyHex: string;
}

export async function runAgentScenario(identity: Identity): Promise<AgentResult> {
  const handleName = 'agent-host';
  const agentName = 'travel-planner';

  // 1. Derive a Handle for the agent host
  logger.info(`Deriving agent Handle "${handleName}"…`);
  const agentHandle: Handle = await identity.deriveHandle(handleName, {
    displayName: 'Agent Host',
  });

  // 2. Derive agent SubHandle under the Handle
  logger.info(`Deriving agent SubHandle "${agentName}"…`);
  const agentSub: SubHandle = await agentHandle.deriveSubHandle(agentName, {
    displayName: 'Travel Planner Agent',
  });

  // 3. Owner attests the Handle (root → handle)
  logger.info('Owner issues root attestation for agent Handle…');
  const A = await identity.attestHandle(handleName, {
    audiences: ['booking.api.example'],
    scopes: ['travel:search', 'travel:book'],
    maxSessionTtl: 3600,
    subNamePatterns: ['*'],
  });

  // 4. Handle attests the SubHandle (handle → sub)
  logger.info('Agent Handle issues SubHandle attestation…');
  const B = await agentHandle.attestSubHandle(agentName, {
    audiences: ['booking.api.example'],
    scopes: ['travel:search'],
    maxSessionTtl: 3600,
  }, { ttlSeconds: 86400 });

  // 5. Agent creates a session (signs with its own key)
  logger.info('Agent creates session (audience: booking.api.example)…');
  const session1 = await Session.create(agentSub, {
    audience: 'booking.api.example',
    scopes: ['travel:search'],
    ttl: 3600,
  });

  // 6. Verify the session with full chain — should pass
  logger.info('Verifying agent session (before revocation)…');
  let verified1 = false;
  try {
    await Session.verifyAttested(
      session1.token,
      identity.getPublicKey(),
      [A.token, B.token],
      'booking.api.example',
    );
    verified1 = true;
    logger.success('Session verified — agent authorized');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Verification failed unexpectedly', msg);
  }

  // 7. Owner revokes the session (in-memory RevocationChecker)
  logger.info('Owner revokes agent session…');
  const revokedIds = new Set<string>();
  revokedIds.add(session1.sessionId);

  const revocationChecker = {
    isRevoked: async (sid: string) => revokedIds.has(sid),
  };

  // 8. Re-verify the same session — should now fail with REVOKED
  logger.info('Verifying agent session (after revocation)…');
  let verified2 = false;
  try {
    await Session.verifyAttested(
      session1.token,
      identity.getPublicKey(),
      [A.token, B.token],
      'booking.api.example',
      revocationChecker,
    );
    verified2 = true;
    logger.error('Expected REVOKED, but verification passed');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    verified2 = false;
    logger.warn('Session REVOKED — verification now fails', msg.slice(0, 80));
  }

  return {
    agentHandleId: agentHandle.getId(),
    agentSubHandleId: agentSub.getId(),
    attestationToken: A.token,
    sessionToken: session1.token,
    sessionVerifiedBefore: verified1,
    sessionVerifiedAfter: verified2,
    revoked: true,
    rootPubKeyHex: Array.from(identity.getPublicKey())
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}
