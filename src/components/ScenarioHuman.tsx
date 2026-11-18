import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Home, Dumbbell, Key, Radio, CheckCircle2 } from 'lucide-react';
import type { HumanResult } from '../scenarios/human';

interface Props {
  result: HumanResult | null;
  loading: boolean;
}

const contextIcons: Record<string, React.ReactNode> = {
  work: <Briefcase size={16} />,
  family: <Home size={16} />,
  gym: <Dumbbell size={16} />,
};

function shorten(hex: string, chars = 12): string {
  if (hex.length <= chars * 2) return hex;
  return `${hex.slice(0, chars)}…${hex.slice(-chars)}`;
}

export default function ScenarioHuman({ result, loading }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <div className="scenario-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Key size={24} />
        </motion.div>
        <p>Deriving context Handles…</p>
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
        <h3>Multi-Context Identity</h3>
        <p className="scenario-desc">
          One root Identity → three isolated Handles. Each context has its own
          deterministic password and channel key — no shared credentials.
        </p>
      </div>

      <div className="context-cards">
        {result.contexts.map((ctx) => (
          <motion.div
            key={ctx.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="context-card"
          >
            <div className="context-card-header">
              {contextIcons[ctx.name]}
              <span className="context-name">{ctx.name}</span>
              <button
                className="expand-btn"
                onClick={() =>
                  setExpanded((p) => ({ ...p, [ctx.name]: !p[ctx.name] }))
                }
              >
                {expanded[ctx.name] ? '−' : '+'}
              </button>
            </div>

            <div className="context-card-body">
              <div className="kv-row">
                <span className="kv-label">Handle ID</span>
                <code>{shorten(ctx.handleId, 16)}</code>
              </div>
              <div className="kv-row">
                <span className="kv-label">Public Key</span>
                <code>{shorten(ctx.pubKeyHex, 16)}</code>
              </div>

              {expanded[ctx.name] && (
                <>
                  <div className="kv-row">
                    <span className="kv-label">Password</span>
                    <code className="mono">{ctx.password}</code>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Channel Key</span>
                    <code>{shorten(ctx.channelKeyHex, 16)}</code>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="scenario-footer">
        <Radio size={14} />
        <span>
          Root public key: <code>{shorten(result.rootPubKeyHex, 16)}</code>
        </span>
      </div>
    </div>
  );
}
