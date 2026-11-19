import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  Radio,
  CheckCircle2,
  Copy,
  Check,
  Wallet,
  Mail,
  Loader2,
  Home,
  Dumbbell,
  Briefcase,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import {
  HumanEngine,
  CONTEXT_ORDER,
  type HumanRootIdentity,
  type HumanHandleInfo,
  type ContextName,
} from '../scenarios/human';

interface Props {
  identity: Identity | null;
  seedBytes: Uint8Array | null;
}

const CONTEXT_ICON: Record<ContextName, typeof Briefcase> = {
  work: Briefcase,
  family: Home,
  gym: Dumbbell,
};

const CONTEXT_LABEL: Record<ContextName, string> = {
  work: 'Create work handle',
  family: 'Create family handle',
  gym: 'Create gym handle',
};

const CONTEXT_STEP: Record<ContextName, string> = {
  work: '1',
  family: '2',
  gym: '3',
};

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      aria-label="Copy value"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function KeyRow({
  label,
  value,
  red = false,
}: {
  label: string;
  value: string;
  red?: boolean;
}) {
  return (
    <div className="key-row">
      <span className="key-label">{label}</span>
      <div className="key-value-wrap">
        <code className={`key-value ${red ? 'private' : ''}`}>{value}</code>
        <CopyBtn value={value} />
      </div>
    </div>
  );
}


function HandleCard({ ctx }: { ctx: HumanHandleInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="context-card"
    >
      <div className="context-card-header handle-profile">
        <div className="handle-avatar">{ctx.avatar}</div>
        <div className="handle-profile-id">
          <div className="handle-profile-name">{ctx.displayName}</div>
          <div className="handle-profile-nick">{ctx.nickname}</div>
        </div>
        <span className="handle-name-chip">{ctx.name}</span>
        <button
          className="expand-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label="Toggle private keys"
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      <div className="context-card-body handle-card-body">
        <div className="handle-profile-email">
          <Mail size={12} />
          {ctx.email}
        </div>

        {/* Группа 1 — ключи Handle. Приватный ключ скрыт за «+». */}
        <div className="wallet-block">
          <KeyRow label="Handle ID" value={ctx.handleId} />
          <KeyRow label="Public Key" value={ctx.pubKeyHex} />
          {expanded && (
            <KeyRow label="Private Key — never published" value={ctx.privKeyHex} red />
          )}
        </div>

        {/* Группа 2 — детерминированный кошелёк из того же сида. */}
        <div className="wallet-block">
          <span className="key-label wallet-label">
            <Wallet size={11} /> Solana Wallet — derived from the same seed
          </span>
          <KeyRow label="Address" value={ctx.wallet.address} />
          <span className="wallet-path">{ctx.wallet.derivationPath}</span>
          {expanded && (
            <KeyRow
              label="Wallet Private Key (base58)"
              value={ctx.wallet.privateKeyBase58}
              red
            />
          )}
        </div>

        {/* Группа 3 — сервисные пароли контекста и канал E2EE. */}
        <div className="wallet-block">
          <KeyRow label={`Password for "${ctx.email}"`} value={ctx.passwords.email} />
          <KeyRow label='Password for "Google"' value={ctx.passwords.google} />
          <KeyRow label='Password for "Github"' value={ctx.passwords.github} />
          <KeyRow label={`Channel Key for E2EE "${ctx.name}"`} value={ctx.channelKeyHex} />
        </div>
      </div>
    </motion.div>
  );
}

function FlowBreadcrumb({ created }: { created: ContextName[] }) {
  return (
    <div className="flow-breadcrumb">
      {CONTEXT_ORDER.map((name, i) => (
        <span key={name} className={`flow-step ${i < created.length ? 'done' : ''}`}>
          {i > 0 && <span className="flow-arrow">→</span>}
          {name}
        </span>
      ))}
    </div>
  );
}

export default function ScenarioHuman({ identity, seedBytes }: Props) {
  const engineRef = useRef<HumanEngine | null>(null);
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new HumanEngine();
    return engineRef.current;
  };
  const [root, setRoot] = useState<HumanRootIdentity | null>(null);
  const [contexts, setContexts] = useState<HumanHandleInfo[]>([]);
  const [busy, setBusy] = useState<ContextName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const created: ContextName[] = contexts.map((c) => c.name as ContextName);
  // Progressive reveal: only the NEXT handle in line has a button —
  // work first, then family, then gym.
  const next = CONTEXT_ORDER.find((name) => !created.includes(name)) ?? null;

  const createNext = async (name: ContextName) => {
    if (!identity || !seedBytes) return;
    setBusy(name);
    setError(null);
    try {
      const engine = getEngine();
      if (root === null) {
        setRoot(await engine.init(identity, seedBytes));
      }
      const ctx = await engine.deriveContext(name);
      setContexts((prev) => [...prev, ctx]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <CheckCircle2 size={20} className="success-icon" />
        <div>
          <h3>Multi-Context Identity</h3>
          <p className="scenario-desc">
            One root Identity → isolated Handles, created one at a time. Each
            context gets its own profile, keypair, and Solana wallet — no
            shared credentials.
          </p>
        </div>
      </div>

      <FlowBreadcrumb created={created} />

      {next && (
        <div className="stage-block">
          <button
            className="primary-btn stage-btn"
            disabled={busy !== null}
            onClick={() => createNext(next)}
          >
            {busy === next ? (
              <Loader2 size={16} className="spin" />
            ) : (
              (() => { const Icon = CONTEXT_ICON[next]; return <Icon size={16} />; })()
            )}
            {CONTEXT_STEP[next]} · {CONTEXT_LABEL[next]}
          </button>
        </div>
      )}

      {next === 'family' && (
        <p className="derive-note">
          ✓ Work handle ready. Deriving one handle reveals nothing about the
          others — the family context is a fresh keypair from the same seed.
        </p>
      )}
      {next === 'gym' && (
        <p className="derive-note">
          ✓ Family handle ready. One more derivation and you have a fully
          separate sports identity.
        </p>
      )}

      {error && (
        <div className="negative-card error"><CheckCircle2 size={14} /> {error}</div>
      )}

      {contexts.length > 0 && (
        <div className="context-cards">
          {contexts.map((ctx) => (
            <HandleCard key={ctx.name} ctx={ctx} />
          ))}
        </div>
      )}

      {contexts.length > 0 && (
        <div className="scenario-footer">
          <Radio size={14} />
          <span>
            Root public key: <code>{(root?.pubKeyHex ?? '').slice(0, 24)}…</code>
          </span>
        </div>
      )}

      {!next && contexts.length > 0 && (
        <div className="scenario-footer">
          <Key size={14} />
          <span>
            All three contexts derived — same seed, same order of derivation
            paths, zero shared credentials between them.
          </span>
        </div>
      )}
    </div>
  );
}
