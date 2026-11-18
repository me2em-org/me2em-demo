import { useState } from 'react';
import { motion } from 'framer-motion';
import { Satellite, Wallet, ShieldCheck, CheckCircle2, Link2 } from 'lucide-react';
import type { SatelliteResult } from '../scenarios/satellite';

interface Props {
  result: SatelliteResult | null;
  loading: boolean;
}

function shorten(s: string, chars = 16): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

export default function ScenarioSatellite({ result, loading }: Props) {
  const [showToken, setShowToken] = useState(false);

  if (loading) {
    return (
      <div className="scenario-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Satellite size={24} />
        </motion.div>
        <p>Running satellite scenario…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="scenario-placeholder">
        <p>Run the scenario to simulate a satellite selling downlink capacity.</p>
      </div>
    );
  }

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <CheckCircle2 size={20} className="success-icon" />
        <h3>Satellite Capacity Marketplace</h3>
        <p className="scenario-desc">
          Operator attests satellite Handle → satellite attests buyer SubHandle
          (time-boxed) → buyer session verified statelessly → Solana wallet
          derived → x402 payment request built.
        </p>
      </div>

      <div className="sat-grid">
        <div className="sat-card">
          <h4><Satellite size={14} /> Identity Chain</h4>
          <div className="kv-row">
            <span className="kv-label">Satellite Handle</span>
            <code>{shorten(result.satHandleId)}</code>
          </div>
          <div className="kv-row">
            <span className="kv-label">Buyer SubHandle</span>
            <code>{shorten(result.buyerSubHandleId)}</code>
          </div>
          <div className="kv-row">
            <span className="kv-label">Session Verified</span>
            <span className="badge badge-ok">✓ valid chain</span>
          </div>
        </div>

        <div className="sat-card">
          <h4><Wallet size={14} /> Solana Wallet</h4>
          <div className="kv-row">
            <span className="kv-label">Address</span>
            <code>{result.walletAddress}</code>
          </div>
          <div className="kv-row">
            <span className="kv-label">Wallet Binding</span>
            {result.walletBindingOk ? (
              <span className="badge badge-ok"><ShieldCheck size={12} /> core ✓</span>
            ) : (
              <span className="badge badge-warn">core ✗</span>
            )}
          </div>
          <div className="kv-row">
            <span className="kv-label">On-Curve</span>
            {result.onCurveOk ? (
              <span className="badge badge-ok">✓</span>
            ) : (
              <span className="badge badge-warn">✗</span>
            )}
          </div>
        </div>

        <div className="sat-card">
          <h4><Link2 size={14} /> x402 Payment</h4>
          <div className="kv-row">
            <span className="kv-label">Status</span>
            {result.paymentStatus === 'confirmed' ? (
              <span className="badge badge-ok">confirmed</span>
            ) : result.paymentStatus === 'failed' ? (
              <span className="badge badge-warn">failed (devnet)</span>
            ) : (
              <span className="badge">pending</span>
            )}
          </div>
          {result.paymentTxRef && (
            <div className="kv-row">
              <span className="kv-label">Tx Ref</span>
              <code>{shorten(result.paymentTxRef, 20)}</code>
            </div>
          )}
          <div className="kv-row">
            <span className="kv-label">Payment URL</span>
            <button
              className="link-btn"
              onClick={() => setShowToken((v) => !v)}
            >
              {showToken ? 'hide' : 'show'}
            </button>
          </div>
          {showToken && (
            <div className="kv-row">
              <code className="mono wrap">{result.paymentRequestUrl}</code>
            </div>
          )}
        </div>
      </div>

      <div className="scenario-footer">
        <span>
          Attestation chain: root → satellite Handle → buyer SubHandle → session
        </span>
      </div>
    </div>
  );
}
