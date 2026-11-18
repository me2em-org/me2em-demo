import { useState, Fragment, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint,
  Briefcase,
  Satellite,
  Bot,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useMe2em } from './hooks/useMe2em';
import { useScenario } from './hooks/useScenario';
import { runHumanScenario } from './scenarios/human';
import { runSatelliteScenario } from './scenarios/satellite';
import { runAgentScenario } from './scenarios/agent';
import SeedDisplay from './components/SeedDisplay';
import SeedVerification from './components/SeedVerification';
import Logger from './components/Logger';
import ScenarioHuman from './components/ScenarioHuman';
import ScenarioSatellite from './components/ScenarioSatellite';
import ScenarioAgent from './components/ScenarioAgent';
import './App.css';

type Step = 'seed' | 'verify' | 'scenarios';
type ScenarioId = 'human' | 'satellite' | 'agent';

const scenarioMeta: Record<ScenarioId, { icon: React.ReactNode; label: string; desc: string }> = {
  human: {
    icon: <Briefcase size={18} />,
    label: 'Human',
    desc: 'Work · Family · Gym',
  },
  satellite: {
    icon: <Satellite size={18} />,
    label: 'Satellite',
    desc: 'Selling capacity',
  },
  agent: {
    icon: <Bot size={18} />,
    label: 'AI Agent',
    desc: 'Mandate & revocation',
  },
};

export default function App() {
  const [step, setStep] = useState<Step>('seed');
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const {
    seedPhrase,
    seedBytes,
    identity,
    generateNewSeed,
    createIdentityFromSeed,
    resetAll,
  } = useMe2em();

  const handleSeedConfirmed = useCallback(async () => {
    if (!seedPhrase) return;
    try {
      await createIdentityFromSeed(seedPhrase);
      setIdentityReady(true);
      setStep('scenarios');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Failed to create identity: ${msg}`);
    }
  }, [seedPhrase, createIdentityFromSeed]);

  const humanScenario = useScenario(() => runHumanScenario(identity!));
  const satelliteScenario = useScenario(() =>
    runSatelliteScenario(identity!, seedBytes!),
  );
  const agentScenario = useScenario(() => runAgentScenario(identity!));

  const scenarioMap = {
    human: humanScenario,
    satellite: satelliteScenario,
    agent: agentScenario,
  };

  const handleRunScenario = (id: ScenarioId) => {
    setActiveScenario(id);
    scenarioMap[id].run();
  };

  const handleReset = () => {
    resetAll();
    humanScenario.clear();
    satelliteScenario.clear();
    agentScenario.clear();
    setActiveScenario(null);
    setIdentityReady(false);
    setStep('seed');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <Fingerprint size={28} />
          <h1>Me2eM Protocol Demo</h1>
        </div>
        <button className="reset-btn" onClick={handleReset} title="Start over">
          <RefreshCw size={16} />
          Reset
        </button>
      </header>

      <div className="step-indicator">
        {[
          { id: 'seed', label: 'Seed' },
          { id: 'verify', label: 'Verify' },
          { id: 'scenarios', label: 'Scenarios' },
        ].map((s, i) => (
          <Fragment key={s.id}>
            <div
              className={`step-dot ${step === s.id ? 'active' : ''} ${
                ['seed', 'verify', 'scenarios'].indexOf(step) > i ? 'done' : ''
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="step-line" />}
          </Fragment>
        ))}
      </div>

      <main className="app-main">
        <AnimatePresence mode="wait">
          {step === 'seed' && (
            <motion.section
              key="seed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="step-section"
            >
              <h2>Step 1 — Generate Identity Seed</h2>
              <p className="step-desc">
                A 24-word BIP39 mnemonic generates a 64-byte seed. From this
                seed, all Handles, SubHandles, and wallets are derived
                deterministically.
              </p>

              {!seedPhrase ? (
                <button className="primary-btn" onClick={generateNewSeed}>
                  Generate Seed Phrase
                </button>
              ) : (
                <div className="seed-flow">
                  <SeedDisplay
                    seedPhrase={seedPhrase}
                    onVerified={() => setStep('verify')}
                  />
                </div>
              )}
            </motion.section>
          )}

          {step === 'verify' && (
            <motion.section
              key="verify"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="step-section"
            >
              <h2>Step 2 — Verify Seed</h2>
              <p className="step-desc">
                Enter 3 words from your seed phrase to confirm you have it.
              </p>
              <SeedVerification
                seedPhrase={seedPhrase!}
                onSuccess={handleSeedConfirmed}
              />
            </motion.section>
          )}

          {step === 'scenarios' && (
            <motion.section
              key="scenarios"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="step-section"
            >
              <h2>Step 3 — Protocol Scenarios</h2>
              <p className="step-desc">
                Your Identity is ready. Pick a scenario to run a live protocol
                flow using <code>@me2em/core</code>,{' '}
                <code>@me2em/solana</code>, and <code>@me2em/x402</code>.
              </p>

              <div className="scenario-tabs">
                {(Object.keys(scenarioMeta) as ScenarioId[]).map((id) => (
                  <button
                    key={id}
                    className={`scenario-tab ${activeScenario === id ? 'active' : ''}`}
                    onClick={() => handleRunScenario(id)}
                    disabled={scenarioMap[id].loading}
                  >
                    {scenarioMeta[id].icon}
                    <span>{scenarioMeta[id].label}</span>
                    <small>{scenarioMeta[id].desc}</small>
                  </button>
                ))}
              </div>

              {activeScenario && (
                <div className="scenario-content">
                  {activeScenario === 'human' && (
                    <ScenarioHuman
                      result={humanScenario.result}
                      loading={humanScenario.loading}
                    />
                  )}
                  {activeScenario === 'satellite' && (
                    <ScenarioSatellite
                      result={satelliteScenario.result}
                      loading={satelliteScenario.loading}
                    />
                  )}
                  {activeScenario === 'agent' && (
                    <ScenarioAgent
                      result={agentScenario.result}
                      loading={agentScenario.loading}
                    />
                  )}
                </div>
              )}

              <div className="scenario-hint">
                <ChevronRight size={14} />
                <span>
                  Each scenario runs real protocol code — no mocks. Check the
                  crypto log below for step-by-step details.
                </span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {step !== 'seed' && (
          <div className="log-section">
            <Logger />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>
          Built with <code>@me2em/core</code> · <code>@me2em/solana</code> ·{' '}
          <code>@me2em/x402</code>
        </span>
      </footer>
    </div>
  );
}
