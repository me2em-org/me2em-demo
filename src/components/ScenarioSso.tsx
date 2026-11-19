import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  KeyRound,
  Car,
  Laptop,
  Handshake,
  LogOut,
  Loader2,
  ShieldCheck,
  Cookie,
  CheckCircle2,
  XCircle,
  Fingerprint,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import {
  SsoEngine,
  type SsoApp,
  type SsoCookie,
  type SsoPartnerCheck,
  type SsoLogout,
} from '../scenarios/sso';

interface Props {
  identity: Identity | null;
}

type Busy = null | 'taxi' | 'freelance' | 'partner' | 'logout';

function shorten(s: string, chars = 10): string {
  if (s.length <= chars * 2) return s;
  return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

function FlowBreadcrumb({ stage }: { stage: number }) {
  const steps = ['Sign in @taxi', 'Auto login @freelance', 'Partner (Mode 2)', 'Logout everywhere'];
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

function AppCard({ app, icon }: { app: SsoApp; icon: 'taxi' | 'freelance' }) {
  const Icon = icon === 'taxi' ? Car : Laptop;
  return (
    <div className="sat-card">
      <h4><Icon size={14} /> {app.displayName}</h4>
      <div className="kv-row">
        <span className="kv-label">Handle (per-app)</span>
        <span className="handle-name-chip">@{app.name}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Handle ID</span>
        <code>{shorten(app.handleId, 14)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Session JTI</span>
        <code>{shorten(app.sessionJti, 8)}</code>
      </div>
      <div className="kv-row">
        <span className="kv-label">Verification</span>
        <span className="badge-group">
          <span className={`badge ${app.verified ? 'badge-ok' : 'badge-warn'}`}>
            {app.verified ? '✓' : '✗'} {app.mode === 'stateless' ? 'Mode 1 · stateless' : 'Mode 2 · attested'}
          </span>
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Key (hex)</span>
        <code>{shorten(app.pubKeyHex, 12)}</code>
      </div>
    </div>
  );
}

export default function ScenarioSso({ identity }: Props) {
  const engineRef = useRef<SsoEngine | null>(null);
  const getEngine = () => {
    if (engineRef.current === null) engineRef.current = new SsoEngine();
    return engineRef.current;
  };
  const [apps, setApps] = useState<SsoApp[]>([]);
  const [cookie, setCookie] = useState<SsoCookie | null>(null);
  const [partner, setPartner] = useState<SsoPartnerCheck | null>(null);
  const [logout, setLogout] = useState<SsoLogout | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const stage = logout ? 3 : partner ? 2 : apps.length >= 2 ? 1 : apps.length === 1 ? 0 : -1;

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    try {
      const engine = getEngine();
      if (kind === 'taxi' && identity) {
        const res = await engine.signInFirstApp(identity);
        setApps((prev) => [...prev, res.app]);
        setCookie(res.cookie);
      } else if (kind === 'freelance') {
        const res = await engine.signInSecondApp();
        setApps((prev) => [...prev, res.app]);
      } else if (kind === 'partner') {
        setPartner(await engine.partnerCheck());
      } else if (kind === 'logout') {
        setLogout(await engine.logoutEverywhere());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const taxi = apps.find((a) => a.name === 'taxi');
  const freelance = apps.find((a) => a.name === 'freelance');

  return (
    <div className="scenario-result">
      <div className="scenario-header">
        <KeyRound size={22} />
        <div>
          <h3>Multi-App SSO (UC-4)</h3>
          <p className="scenario-desc">
            One seed phrase is the whole account system. The user types it
            once at the first app; every other app in the ecosystem logs them
            in through the instance cookie. Perimeter apps verify statelessly
            (Mode 1), an external partner goes through the attestation chain
            (Mode 2) — and "log out everywhere" is one revocation entry.
          </p>
        </div>
      </div>

      <FlowBreadcrumb stage={stage} />

      <div className="stage-block">
        <button className="primary-btn stage-btn" disabled={busy !== null} onClick={() => run('taxi')}>
          {busy === 'taxi' ? <Loader2 size={14} className="spin" /> : <Car size={14} />}
          1 · Sign in — App A (taxi), seed typed once
        </button>
        {taxi && (
          <button className="primary-btn stage-btn" disabled={busy !== null} onClick={() => run('freelance')}>
            {busy === 'freelance' ? <Loader2 size={14} className="spin" /> : <Laptop size={14} />}
            2 · Open App B (freelance) — auto login, no re-entry
          </button>
        )}
        {apps.length >= 2 && (
          <button className="primary-btn stage-btn" disabled={busy !== null} onClick={() => run('partner')}>
            {busy === 'partner' ? <Loader2 size={14} className="spin" /> : <Handshake size={14} />}
            3 · External partner app (Mode 2, offline)
          </button>
        )}
        {partner && (
          <button className="primary-btn stage-btn" disabled={busy !== null} onClick={() => run('logout')}>
            {busy === 'logout' ? <Loader2 size={14} className="spin" /> : <LogOut size={14} />}
            4 · Log out everywhere — one revocation
          </button>
        )}
      </div>

      {error && (
        <div className="negative-card error"><XCircle size={14} /> {error}</div>
      )}

      {apps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="sat-grid">
            {taxi && <AppCard app={taxi} icon="taxi" />}
            {freelance && <AppCard app={freelance} icon="freelance" />}
          </div>
          {taxi && freelance && (
            <div className="sim-note">
              <Fingerprint size={12} /> Taxi sees <code>@taxi</code>, freelance sees{' '}
              <code>@freelance</code> — different keys, so the two apps cannot
              correlate the same person. Correlation is the user's choice.
            </div>
          )}
        </motion.div>
      )}

      {cookie && (
        <div className="sat-card cookie-card">
          <h4><Cookie size={14} /> Instance cookie</h4>
          <div className="kv-row">
            <span className="kv-label">Domain</span>
            <code>{cookie.domain}</code>
          </div>
          <div className="kv-row">
            <span className="kv-label">Flags</span>
            <span className="badge badge-ok">HttpOnly · simulated in-page</span>
          </div>
          <p className="mcc-note">
            The next app under the domain presents this cookie — the instance
            recognizes it and signs the user in. No password, no seed re-entry.
          </p>
        </div>
      )}

      {partner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="cert-card"
        >
          <div className="cert-header">
            <ShieldCheck size={18} className="cert-icon" />
            <div>
              <div className="cert-title">Partner verification (Mode 2)</div>
              <div className="cert-subtitle">offline · root public key only · attestation JTI {shorten(partner.attestationJti, 8)}</div>
            </div>
          </div>
          <div className="kv-row">
            <span className="kv-label">What the partner receives</span>
            <span>session token + attestation chain — no shared perimeter</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">What it checks</span>
            <span>chain → signature → audience, fully offline</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Result</span>
            <span className={`badge ${partner.verified ? 'badge-ok' : 'badge-warn'}`}>
              {partner.verified ? '✓ verified with the public key alone' : '✗ failed'}
            </span>
          </div>
        </motion.div>
      )}

      {logout && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="negative-card"
        >
          <CheckCircle2 size={16} />
          <div>
            <strong>Log out everywhere — {logout.revokedJtis.length} JTI entries, that was the whole logout.</strong>
            <div className="negative-detail">
              Taxi rejects: {logout.taxiRejected ? '✓' : '✗'} · Freelance rejects:{' '}
              {logout.freelanceRejected ? '✓' : '✗'} · Partner rejects:{' '}
              {logout.partnerRejected ? '✓' : '✗'} — no database wipe, just
              revocation entries every verifier consults.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
