import { motion } from 'framer-motion';
import { Bot, ShieldCheck, ShieldX, CheckCircle2, XCircle } from 'lucide-react';
import type { AgentResult } from '../scenarios/agent';

interface Props {
  result: AgentResult | null;
  loading: boolean;
}

function shorten(s: string, chars = 16): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

export default function ScenarioAgent({ result, loading }: Props) {
  if (loading) {
    return (
      <div className="scenario-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Bot size={24} />
        </motion.div>
        <p>Running agent mandate scenario…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="scenario-placeholder">
        <p>Run the scenario to demonstrate AI agent mandate and revocation.</p>
      </div>
    );
  }

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <CheckCircle2 size={20} className="success-icon" />
        <h3>AI Agent Mandate & Revocation</h3>
        <p className="scenario-desc">
          Owner issues a time-boxed mandate (attestation) to an AI agent.
          The agent signs its own session. Revoking a session stops one
          request; revoking the attestation is the one-call kill switch —
          the agent is disabled across every service, future sessions
          included.
        </p>
      </div>

      <div className="agent-timeline">
        <div className="timeline-step">
          <div className="step-icon ok"><CheckCircle2 size={16} /></div>
          <div>
            <strong>Mandate issued</strong>
            <p>
              Root Identity → Handle <code>{shorten(result.agentHandleId, 10)}</code> → SubHandle{' '}
              <code>{shorten(result.agentSubHandleId, 10)}</code>
            </p>
          </div>
        </div>

        <div className="timeline-step">
          <div className={`step-icon ${result.sessionVerifiedBefore ? 'ok' : 'err'}`}>
            {result.sessionVerifiedBefore ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          </div>
          <div>
            <strong>Session verified (before revocation)</strong>
            <p>
              {result.sessionVerifiedBefore
                ? '✓ Agent session valid — chain OK'
                : '✗ Verification failed unexpectedly'}
            </p>
          </div>
        </div>

        <div className="timeline-step">
          <div className="step-icon info"><Bot size={16} /></div>
          <div>
            <strong>Owner revokes session</strong>
            <p>Session JTI added to in-memory revocation set</p>
          </div>
        </div>

        <div className="timeline-step">
          <div className={`step-icon ${!result.sessionVerifiedAfter ? 'ok' : 'err'}`}>
            {result.revoked && !result.sessionVerifiedAfter ? (
              <ShieldX size={16} />
            ) : (
              <XCircle size={16} />
            )}
          </div>
          <div>
            <strong>Session verified (after revocation)</strong>
            <p>
              {!result.sessionVerifiedAfter
                ? '✓ REVOKED — verification correctly fails'
                : '✗ Expected revocation to fail, but it passed'}
            </p>
          </div>
        </div>

        <div className="timeline-step">
          <div className={`step-icon ${result.futureSessionPassedBefore ? 'info' : 'ok'}`}>
            <Bot size={16} />
          </div>
          <div>
            <strong>The agent simply makes a new session</strong>
            <p>
              {result.futureSessionPassedBefore
                ? '⚠ New JTI verifies fine — revoking sessions one by one cannot stop a compromised agent'
                : '✓ Future session unexpectedly failed'}
            </p>
          </div>
        </div>

        <div className="timeline-step">
          <div className="step-icon info"><ShieldX size={16} /></div>
          <div>
            <strong>One-call revocation — revokeAttestation(A.jti)</strong>
            <p>
              The mandate's JTI <code>{shorten(result.attestationJti, 8)}</code>{' '}
              enters the same revocation store; verifiers check every JTI in
              the presented chain, not only the session id.
            </p>
          </div>
        </div>

        <div className="timeline-step">
          <div className={`step-icon ${result.futureSessionFailedAfter ? 'ok' : 'err'}`}>
            {result.futureSessionFailedAfter ? <ShieldX size={16} /> : <XCircle size={16} />}
          </div>
          <div>
            <strong>Future session verified (after attestation revocation)</strong>
            <p>
              {result.futureSessionFailedAfter
                ? '✓ MANDATE DEAD — the agent is disabled across every service it touches, including all future sessions'
                : '✗ Expected the mandate revocation to kill future sessions'}
            </p>
          </div>
        </div>
      </div>

      <div className="scenario-footer">
        <ShieldCheck size={14} />
        <span>
          Root public key: <code>{shorten(result.rootPubKeyHex, 16)}</code>
        </span>
      </div>
    </div>
  );
}
