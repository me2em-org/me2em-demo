import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  Radio,
  CheckCircle2,
  Copy,
  Check,
  Wallet,
  Mail,
} from 'lucide-react';
import type {
  HumanResult,
  HumanHandleInfo,
} from '../scenarios/human';

interface Props {
  result: HumanResult | null;
  loading: boolean;
}

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
          aria-label="Toggle derived secrets"
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      <div className="context-card-body handle-card-body">
        <div className="handle-profile-email">
          <Mail size={12} />
          {ctx.email}
        </div>

        <KeyRow label="Handle ID" value={ctx.handleId} />
        <KeyRow label="Public Key" value={ctx.pubKeyHex} />
        <KeyRow label="Private Key — never published" value={ctx.privKeyHex} red />

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

        {expanded && (
          <>
            <KeyRow
              label={`Password · context "${ctx.name}"`}
              value={ctx.password}
            />
            <KeyRow
              label={`Channel Key · context "${ctx.name}"`}
              value={ctx.channelKeyHex}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function ScenarioHuman({ result, loading }: Props) {
  if (loading) {
    return (
      <div className="scenario-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Key size={24} />
        </motion.div>
        <p>Deriving root Identity and context Handles…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="scenario-placeholder">
        <p>Run the scenario to derive work, family, and gym Handles.</p>
      </div>
    );
  }

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <CheckCircle2 size={20} className="success-icon" />
        <div>
          <h3>Multi-Context Identity</h3>
          <p className="scenario-desc">
            One root Identity → three isolated Handles. Each context has its
            own profile, keypair, and Solana wallet — no shared credentials.
          </p>
        </div>
      </div>

      <p className="derive-note">
        ↓ Each Handle is derived deterministically from the root keypair —
        deriving one reveals nothing about the others.
      </p>

      <div className="context-cards">
        {result.contexts.map((ctx) => (
          <HandleCard key={ctx.name} ctx={ctx} />
        ))}
      </div>

      <div className="scenario-footer">
        <Radio size={14} />
        <span>
          Root public key: <code>{result.root.pubKeyHex.slice(0, 24)}…</code>
        </span>
      </div>
    </div>
  );
}
