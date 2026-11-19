import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Satellite,
  ShieldCheck,
  CheckCircle2,
  BadgeCheck,
  Camera,
  Cloud,
  Radar,
  Antenna,
  Rocket,
  Loader2,
  Landmark,
  XCircle,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import { MCCMission } from '../scenarios/satellite';
import type {
  SatelliteNode,
  InstrumentNode,
  PurchaseReceipt,
} from '../scenarios/satellite';

interface Props {
  identity: Identity | null;
  seedBytes: Uint8Array | null;
}

type Stage = 'idle' | 'fleet' | 'market';
type Busy = null | 'fleet' | 'power' | 'buy';

const KIND_ICON: Record<string, typeof Camera> = {
  imaging: Camera,
  weather: Cloud,
  radar: Radar,
  comms: Antenna,
};

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function utcHM(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(11, 16);
}

function FlowBreadcrumb({ stage }: { stage: Stage }) {
  const steps = ['Mission Control', 'Satellites', 'Instruments', 'Certificate', 'Portal check'];
  const reached = stage === 'idle' ? 0 : stage === 'fleet' ? 2 : 3;
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

function MCCCard() {
  return (
    <div className="sat-card mcc-card">
      <h4><Landmark size={14} /> Mission Control Center (ЦУП)</h4>
      <div className="kv-row">
        <span className="kv-label">Root Identity</span>
        <span className="badge badge-ok">your seed → this key</span>
      </div>
      <p className="mcc-note">
        Everything below is derived deterministically from YOUR seed: the same
        seed always rebuilds the same fleet, instruments, and wallets.
      </p>
    </div>
  );
}

function SatelliteCard({ sat }: { sat: SatelliteNode }) {
  return (
    <div className="sat-card">
      <h4><Satellite size={14} /> {sat.displayName}</h4>
      <div className="kv-row">
        <span className="kv-label">Handle (satellite)</span>
        <code>{sat.name}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Orbit</span>
        <span className="muted">{sat.orbit}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Handle ID</span>
        <code>{shorten(sat.handleId, 14)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Attested by Mission Control</span>
        <span className="badge badge-ok">✓ Handle attestation</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Wallet (same seed)</span>
        <code>{shorten(sat.wallet.address, 12)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Wallet binding</span>
        <span className="badge-group">
          <span className={`badge ${sat.walletBindingOk ? 'badge-ok' : 'badge-warn'}`}>
            core {sat.walletBindingOk ? '✓' : '✗'}
          </span>
          <span className={`badge ${sat.onCurveOk ? 'badge-ok' : 'badge-warn'}`}>
            on-curve {sat.onCurveOk ? '✓' : '✗'}
          </span>
        </span>
      </div>
    </div>
  );
}

function InstrumentCard({
  inst,
  satName,
  busy,
  onBuy,
}: {
  inst: InstrumentNode;
  satName: string;
  busy: Busy;
  onBuy: (satName: string, instName: string) => void;
}) {
  const Icon = KIND_ICON[inst.kind] ?? Antenna;
  return (
    <div className="sat-card instrument-card">
      <h4><Icon size={14} /> {inst.displayName}</h4>
      <div className="kv-row">
        <span className="kv-label">SubHandle (on board)</span>
        <code>{inst.path}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Tasking slot</span>
        <span className="muted">{inst.slotMinutes} min window</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Price</span>
        <span className="price">{inst.priceSol} SOL</span>
      </div>
      <button
        className="primary-btn buy-btn"
        disabled={busy !== null}
        onClick={() => onBuy(satName, inst.name)}
      >
        {busy === 'buy' ? (
          <Loader2 size={14} className="spin" />
        ) : (
          <Rocket size={14} />
        )}
        Buy {inst.slotMinutes} min · {inst.priceSol} SOL
      </button>
    </div>
  );
}

function CertificateCard({ r }: { r: PurchaseReceipt }) {
  const [showToken, setShowToken] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="cert-card"
    >
      <div className="cert-header">
        <BadgeCheck size={18} className="cert-icon" />
        <div>
          <div className="cert-title">Access Certificate</div>
          <div className="cert-subtitle">
            signed by Mission Control · #{r.certificateJti.slice(0, 8)}
          </div>
        </div>
      </div>

      <div className="kv-row">
        <span className="kv-label">Issuer</span>
        <span>Mission Control Center — root Identity</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Subject (buyer)</span>
        <span>
          {r.company} · <code>{r.buyerHandleName}</code> · key {shorten(r.buyerId, 8)}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Satellite / Instrument</span>
        <span>
          {r.satDisplay} / {r.instDisplay}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Tasking window</span>
        <span>
          {utcHM(r.windowStart)}–{utcHM(r.windowEnd)} UTC ({r.slotMinutes} min)
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Scopes</span>
        <span className="badge-group">
          {r.scopes.map((s) => (
            <span key={s} className="scope-chip">{s}</span>
          ))}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Payment (x402)</span>
        <span>
          {r.priceSol} SOL · simulated in demo
        </span>
      </div>

      <div className="cert-checks">
        <div className="kv-row">
          <span className="kv-label">Buyer session vs certificate [C]</span>
          {r.buyerSessionVerified ? (
            <span className="badge badge-ok"><ShieldCheck size={12} /> verified offline — MCC public key only</span>
          ) : (
            <span className="badge badge-warn"><XCircle size={12} /> failed</span>
          )}
        </div>
        <div className="kv-row">
          <span className="kv-label">Instrument chain [satellite → instrument]</span>
          {r.chainSessionVerified ? (
            <span className="badge badge-ok"><CheckCircle2 size={12} /> valid</span>
          ) : (
            <span className="badge badge-warn"><XCircle size={12} /> failed</span>
          )}
        </div>
      </div>

      <button className="link-btn" onClick={() => setShowToken((v) => !v)}>
        {showToken ? 'hide certificate token' : 'show certificate token'}
      </button>
      {showToken && (
        <div className="kv-row">
          <code className="mono wrap">{r.certificateToken}</code>
        </div>
      )}
    </motion.div>
  );
}

export default function ScenarioSatellite({ identity, seedBytes }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [sats, setSats] = useState<SatelliteNode[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [busy, setBusy] = useState<Busy>(null);
  const missionRef = useRef<MCCMission | null>(null);
  const buyCountRef = useRef(0);

  useEffect(
    () => () => {
      missionRef.current?.dispose();
      missionRef.current = null;
    },
    [],
  );

  const handleDeploy = async () => {
    if (!identity || !seedBytes || busy) return;
    setBusy('fleet');
    try {
      if (!missionRef.current) missionRef.current = new MCCMission();
      const nodes = await missionRef.current.deployFleet(identity, seedBytes);
      setSats(nodes);
      setStage('fleet');
    } finally {
      setBusy(null);
    }
  };

  const handlePower = async () => {
    const mission = missionRef.current;
    if (!mission || busy) return;
    setBusy('power');
    try {
      for (const s of sats) await mission.powerInstruments(s.name);
      setSats(mission.getFleet());
      setStage('market');
    } finally {
      setBusy(null);
    }
  };

  const handleBuy = async (satName: string, instName: string) => {
    if (!identity || !missionRef.current || busy) return;
    setBusy('buy');
    try {
      const r = await missionRef.current.purchase(
        identity,
        satName,
        instName,
        buyCountRef.current,
      );
      buyCountRef.current += 1;
      setReceipts((prev) => [r, ...prev]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <CheckCircle2 size={20} className="success-icon" />
        <div>
          <h3>Satellite Tasking Marketplace</h3>
          <p className="scenario-desc">
            Identity = Mission Control · Handle = satellite · SubHandle =
            instrument. A buyer purchases a time-boxed tasking window on an
            instrument — the access document is an access certificate signed by
            Mission Control for the buyer's own key.
          </p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} />

      {stage === 'idle' && (
        <div className="stage-block">
          <MCCCard />
          <button
            className="primary-btn stage-btn"
            onClick={handleDeploy}
            disabled={busy !== null}
          >
            {busy === 'fleet' ? <Loader2 size={16} className="spin" /> : <Satellite size={16} />}
            1 · Deploy satellite fleet
          </button>
        </div>
      )}

      {stage !== 'idle' && (
        <div className="stage-block">
          <MCCCard />
          <div className="sat-grid">
            {sats.map((s) => (
              <SatelliteCard key={s.name} sat={s} />
            ))}
          </div>
        </div>
      )}

      {stage === 'fleet' && (
        <div className="stage-block">
          <button
            className="primary-btn stage-btn"
            onClick={handlePower}
            disabled={busy !== null}
          >
            {busy === 'power' ? <Loader2 size={16} className="spin" /> : <Rocket size={16} />}
            2 · Power up on-board instruments
          </button>
        </div>
      )}

      {stage === 'market' && (
        <div className="stage-block">
          {sats.map((s) => (
            <div key={s.name} className="market-group">
              <div className="market-group-title">
                <Satellite size={14} /> {s.displayName}
                <span className="muted"> · {s.orbit}</span>
              </div>
              <div className="sat-grid">
                {s.instruments.map((inst) => (
                  <InstrumentCard
                    key={inst.name}
                    inst={inst}
                    satName={s.name}
                    busy={busy}
                    onBuy={handleBuy}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {receipts.length > 0 && (
        <div className="stage-block">
          <h4 className="cert-section-title">Access certificates issued</h4>
          {receipts.map((r) => (
            <CertificateCard key={r.certificateJti} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
