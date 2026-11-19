import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  CreditCard,
  Store,
  ShieldCheck,
  BadgeCheck,
  Loader2,
  Wallet,
  ShieldAlert,
  Wifi,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import {
  CommerceEngine,
  type AgentCard,
  type SellerCard,
  type CommerceRun,
  type CommerceNegative,
  type WireEvent,
} from '../scenarios/commerce';

interface Props {
  identity: Identity | null;
  seedBytes: Uint8Array | null;
}

type Busy = null | 'mandate' | 'call' | 'enforce';

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function FlowBreadcrumb({ stage }: { stage: 'idle' | 'mandate' | 'run' }) {
  const steps = ['Mandate (owner → agent)', 'Paid call (402 → sign → settle)', 'Enforcement'];
  const reached = stage === 'idle' ? 0 : stage === 'mandate' ? 1 : 2;
  return (
    <div className="flow-breadcrumb">
      {steps.map((s, i) => (
        <span key={s} className={`flow-step ${i <= reached ? 'done' : ''}`}>
          {i > 0 && <span className="flow-arrow">→</span>}
          {s}
        </span>
      ))}
    </div>
  );
}

function AgentIdentityCard({ agent, sessionJti }: { agent: AgentCard; sessionJti?: string }) {
  return (
    <div className="sat-card mcc-card">
      <h4><Bot size={14} /> Commerce Agent — own key, own mandate, own wallet</h4>
      <div className="kv-row">
        <span className="kv-label">Handle (agent)</span>
        <code>{agent.handleName}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Handle ID</span>
        <code>{shorten(agent.handleId, 14)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Mandate audiences</span>
        <span className="badge-group">
          {agent.mandateAudiences.map((a) => (
            <span key={a} className="scope-chip">{a}</span>
          ))}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Mandate scopes</span>
        <span className="badge-group">
          {agent.mandateScopes.map((s) => (
            <span key={s} className="scope-chip">{s}</span>
          ))}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Wallet (same seed · index 2)</span>
        <code>{shorten(agent.walletAddress, 12)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Wallet binding</span>
        <span className="badge-group">
          <span className={`badge ${agent.bindingCore ? 'badge-ok' : 'badge-warn'}`}>
            core {agent.bindingCore ? '✓' : '✗'}
          </span>
          <span className={`badge ${agent.bindingOnCurve ? 'badge-ok' : 'badge-warn'}`}>
            on-curve {agent.bindingOnCurve ? '✓' : '✗'}
          </span>
        </span>
      </div>
      {sessionJti && (
        <div className="kv-row">
          <span className="kv-label">Session (signed by agent)</span>
          <code>{shorten(sessionJti, 10)}</code>
        </div>
      )}
      <p className="mcc-note">
        One 64-byte seed derives both the Identity and the Solana wallet — the
        agent pays from the same root its mandate grows from.
      </p>
    </div>
  );
}

function SellerCardView({ seller }: { seller: SellerCard }) {
  return (
    <div className="sat-card">
      <h4><Store size={14} /> Seller API — a real third party</h4>
      <div className="kv-row">
        <span className="kv-label">Endpoint</span>
        <code>{seller.api.replace('https://', '')}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Price</span>
        <span className="price">{seller.priceSol} SOL per call</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Wallet (payTo)</span>
        <code>{shorten(seller.walletAddress, 12)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Origin</span>
        <span className="muted">{seller.note}</span>
      </div>
    </div>
  );
}

const ACTOR_LABEL: Record<WireEvent['actor'], string> = {
  agent: 'AGENT',
  seller: 'SELLER',
  facilitator: 'FACILITATOR',
};

function WirePanel({ wire }: { wire: WireEvent[] }) {
  return (
    <div className="wire-panel">
      <div className="wire-head"><Wifi size={13} /> wire — what actually crossed the "network"</div>
      {wire.map((ev, i) => (
        <div key={i} className={`wire-line kind-${ev.kind}`}>
          <span className={`wire-actor actor-${ev.actor}`}>{ACTOR_LABEL[ev.actor]}</span>
          <div className="wire-body">
            <span>{ev.text}</span>
            {ev.detail && <span className="wire-detail">{ev.detail}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Artifact({ title, body }: { title: string; body: unknown }) {
  if (body === null || body === undefined) return null;
  return (
    <details className="artifact-card">
      <summary>{title}</summary>
      <pre>{JSON.stringify(body, null, 2)}</pre>
    </details>
  );
}

export default function ScenarioCommerce({ identity, seedBytes }: Props) {
  const engineRef = useRef<CommerceEngine | null>(null);
  // Lazy init: refs are set after render, so a render-scope capture would
  // always see null — resolve the engine inside each handler instead.
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new CommerceEngine();
    return engineRef.current;
  };
  const [stage, setStage] = useState<'idle' | 'mandate' | 'run'>('idle');
  const [agent, setAgent] = useState<AgentCard | null>(null);
  const [seller, setSeller] = useState<SellerCard | null>(null);
  const [run, setRun] = useState<CommerceRun | null>(null);
  const [negative, setNegative] = useState<CommerceNegative | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const doMandate = async () => {
    if (!identity || !seedBytes) return;
    setBusy('mandate');
    setError(null);
    try {
      const engine = getEngine();
      const card = await engine.issueMandate(identity, seedBytes);
      setAgent(card);
      setSeller(engine.getSeller());
      setRun(null);
      setNegative(null);
      setStage('mandate');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doPaidCall = async () => {
    setBusy('call');
    setError(null);
    try {
      setRun(await getEngine().paidCall());
      setStage('run');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doEnforce = async () => {
    setBusy('enforce');
    setError(null);
    try {
      setNegative(await getEngine().mandateEnforcement());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <CreditCard size={22} />
        <div>
          <h3>Agent Commerce — Paid APIs (UC-7)</h3>
          <p className="scenario-desc">
            The buyer is a machine: an AI agent with its own key, its own
            mandate, and its own seed-derived wallet calls a paid API. The
            seller verifies the mandate offline, quotes via HTTP 402, the
            agent signs once, the facilitator settles. No accounts, no cards,
            no billing database.
          </p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} />

      <div className="stage-block">
        <button className="primary-btn stage-btn" disabled={busy !== null} onClick={doMandate}>
          {busy === 'mandate' ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
          1 · Issue agent mandate
        </button>
        <button
          className="primary-btn stage-btn"
          disabled={busy !== null || stage === 'idle'}
          onClick={doPaidCall}
        >
          {busy === 'call' ? <Loader2 size={14} className="spin" /> : <CreditCard size={14} />}
          2 · Call the paid API (402 → sign → settle)
        </button>
        <button
          className="primary-btn stage-btn"
          disabled={busy !== null || run === null}
          onClick={doEnforce}
        >
          {busy === 'enforce' ? <Loader2 size={14} className="spin" /> : <ShieldAlert size={14} />}
          3 · Try premium API (not in mandate)
        </button>
      </div>

      {error && (
        <div className="negative-card error"><XCircle size={14} /> {error}</div>
      )}

      {agent && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="sat-grid">
            <AgentIdentityCard agent={agent} sessionJti={run?.sessionJti} />
            {seller && <SellerCardView seller={seller} />}
          </div>
        </motion.div>
      )}

      {run && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <WirePanel wire={run.wire} />
          <div className="sim-note">
            Transport is simulated in-page (the seller and facilitator run in
            your browser) — but the client is the real <code>@me2em/x402</code>{' '}
            loop, every signature and mandate verification is real. On-chain
            settlement is simulated: devnet holds no funds.
          </div>
          <Artifact title="PAYMENT-REQUIRED (decoded)" body={run.artifacts?.paymentRequired} />
          <Artifact title="PAYMENT-SIGNATURE (decoded)" body={run.artifacts?.paymentPayload} />
          <Artifact title="PAYMENT-RESPONSE (settlement receipt)" body={run.artifacts?.settlement} />
          <Artifact title="Resource body (200 OK)" body={run.artifacts?.resource} />
          <div className="receipt-line">
            <BadgeCheck size={14} />
            <span>
              Settlement tx <code>{shorten(run.artifacts?.txRef ?? '', 12)}</code> ·{' '}
              {run.artifacts?.settlement?.amount} lamports · payer = mandate-bound agent wallet
            </span>
          </div>
        </motion.div>
      )}

      {negative && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="negative-card"
        >
          <CheckCircle2 size={16} />
          <div>
            <strong>Mandate enforced — HTTP {negative.status}, blocked BEFORE any payment.</strong>
            <div className="negative-detail">{negative.reason}</div>
            <div className="negative-detail">
              No 402 was ever issued for this API: the seller rejected the
              session first. A mandate cannot be widened — not even to spend
              money.
            </div>
          </div>
        </motion.div>
      )}

      {agent && !run && (
        <div className="scenario-hint">
          <Wallet size={14} />
          <span>
            The agent's session will be signed with its own key — the owner's
            seed never enters the agent runtime.
          </span>
        </div>
      )}
    </div>
  );
}
