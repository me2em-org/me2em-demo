import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlugZap,
  RadioTower,
  BatteryCharging,
  ShieldOff,
  Loader2,
  ShieldCheck,
  WifiOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import {
  EvEngine,
  type EvStation,
  type EvConnector,
  type EvCharge,
  type EvRevokeResult,
} from '../scenarios/ev';

interface Props {
  identity: Identity | null;
}

type Busy = null | 'provision' | 'ccs' | 'type2' | 'charge' | 'revoke';

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function FlowBreadcrumb({ stage }: { stage: number }) {
  const steps = ['Provision station', 'Connectors (offline)', 'Charging session', 'Revoke station'];
  return (
    <div className="flow-breadcrumb">
      {steps.map((s, i) => (
        <span key={s} className={`flow-step ${i <= stage ? 'done' : ''}`}>
          {i > 0 && <span className="flow-arrow">→</span>}
          {s}
        </span>
      ))}
    </div>
  );
}

function StationCard({ station }: { station: EvStation }) {
  return (
    <div className="sat-card mcc-card">
      <h4><RadioTower size={14} /> station-001 · Highway A1</h4>
      <div className="kv-row">
        <span className="kv-label">Handle ID</span>
        <code>{shorten(station.handleId, 14)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Attested by operator (once, at install)</span>
        <span className="badge badge-ok">✓ JTI {shorten(station.attestationJti, 8)}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Grant audiences</span>
        <span className="badge-group">
          {station.grantAudiences.map((a) => (
            <span key={a} className="scope-chip">{a}</span>
          ))}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Grant scopes</span>
        <span className="badge-group">
          {station.grantScopes.map((s) => (
            <span key={s} className="scope-chip">{s}</span>
          ))}
        </span>
      </div>
      <p className="mcc-note">
        The grant is the blast radius: a broken-in station can only attest
        connector-* names, only charge:* scopes, only sessions under TTL 7200.
      </p>
    </div>
  );
}

function ConnectorCardView({ conn }: { conn: EvConnector }) {
  return (
    <div className="sat-card">
      <h4><PlugZap size={14} /> {conn.type} Connector</h4>
      <div className="kv-row">
        <span className="kv-label">SubHandle</span>
        <code>{conn.id}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Provisioned</span>
        <span className="badge-group">
          <span className="badge badge-ok"><WifiOff size={10} /> fully offline</span>
          <span className="badge">TTL {conn.attestationTtlDays} d</span>
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Attestation JTI (station-signed)</span>
        <code>{shorten(conn.attestationJti, 8)}</code>
      </div>
    </div>
  );
}

export default function ScenarioEv({ identity }: Props) {
  const engineRef = useRef<EvEngine | null>(null);
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new EvEngine();
    return engineRef.current;
  };
  const [station, setStation] = useState<EvStation | null>(null);
  const [connectors, setConnectors] = useState<EvConnector[]>([]);
  const [charge, setCharge] = useState<EvCharge | null>(null);
  const [revoked, setRevoked] = useState<EvRevokeResult | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const stage = revoked ? 3 : charge ? 2 : connectors.length > 0 ? 1 : station ? 0 : -1;

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    try {
      const engine = getEngine();
      if (kind === 'provision' && identity) {
        setStation(await engine.provisionStation(identity));
      } else if (kind === 'ccs') {
        const c = await engine.addConnector('CCS');
        setConnectors((prev) => [...prev, c]);
      } else if (kind === 'type2') {
        const c = await engine.addConnector('Type 2');
        setConnectors((prev) => [...prev, c]);
      } else if (kind === 'charge') {
        setCharge(await engine.chargeSession());
      } else if (kind === 'revoke') {
        setRevoked(await engine.revokeStation());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <PlugZap size={22} />
        <div>
          <h3>EV Charging Network (UC-2)</h3>
          <p className="scenario-desc">
            Stations never need a network: the operator attests each station
            once at install, the station derives and attests its connectors
            locally, sessions are signed onboard — and an independent charging
            app authorizes them with the operator's public key alone.
            Compromising a station is contained by its grant.
          </p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} />

      <div className="stage-block">
        <button className="primary-btn stage-btn" disabled={busy !== null} onClick={() => run('provision')}>
          {busy === 'provision' ? <Loader2 size={14} className="spin" /> : <RadioTower size={14} />}
          1 · Provision station (operator attests once)
        </button>
        {station && (
          <>
            <button className="primary-btn stage-btn" disabled={busy !== null || connectors.some((c) => c.id === 'connector-ccs')} onClick={() => run('ccs')}>
              {busy === 'ccs' ? <Loader2 size={14} className="spin" /> : <PlugZap size={14} />}
              2 · Add CCS connector (offline)
            </button>
            <button className="primary-btn stage-btn" disabled={busy !== null || connectors.some((c) => c.id === 'connector-type2')} onClick={() => run('type2')}>
              {busy === 'type2' ? <Loader2 size={14} className="spin" /> : <PlugZap size={14} />}
              2 · Add Type 2 connector (offline)
            </button>
          </>
        )}
        {connectors.length > 0 && (
          <button className="primary-btn stage-btn" disabled={busy !== null} onClick={() => run('charge')}>
            {busy === 'charge' ? <Loader2 size={14} className="spin" /> : <BatteryCharging size={14} />}
            3 · Start a charging session (app verifies offline)
          </button>
        )}
        {charge && (
          <button className="primary-btn stage-btn" disabled={busy !== null} onClick={() => run('revoke')}>
            {busy === 'revoke' ? <Loader2 size={14} className="spin" /> : <ShieldOff size={14} />}
            4 · Revoke the station — one flag
          </button>
        )}
      </div>

      {error && (
        <div className="negative-card error"><XCircle size={14} /> {error}</div>
      )}

      {station && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <StationCard station={station} />
          {connectors.length > 0 && (
            <div className="sat-grid">
              {connectors.map((c) => (
                <ConnectorCardView key={c.id} conn={c} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {charge && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="cert-card"
        >
          <div className="cert-header">
            <ShieldCheck size={18} className="cert-icon" />
            <div>
              <div className="cert-title">Charging session authorized</div>
              <div className="cert-subtitle">
                connector {charge.connectorId} · JTI {shorten(charge.sessionJti, 8)}
              </div>
            </div>
          </div>
          <div className="kv-row">
            <span className="kv-label">Signed by</span>
            <span>the connector SubHandle, onboard, offline</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Verified by the app</span>
            <span className={`badge ${charge.verified ? 'badge-ok' : 'badge-warn'}`}>
              {charge.verified
                ? `✓ chain operator → station → connector, public key only${charge.offline ? ' · offline' : ''}`
                : '✗ failed'}
            </span>
          </div>
        </motion.div>
      )}

      {revoked && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="negative-card"
        >
          <CheckCircle2 size={16} />
          <div>
            <strong>Station revoked — one JTI ({shorten(revoked.stationJti, 8)}) contained the whole station.</strong>
            <div className="negative-detail">
              A brand-new connector session (valid signature, valid chain
              structure) is rejected: {revoked.newSessionRejected ? '✓ refused' : '✗ accepted'} —
              every verifier that checks JTIs stops trusting station-001 at once.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
