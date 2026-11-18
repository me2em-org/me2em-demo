import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Fingerprint,
  Briefcase,
  Satellite,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { Identity } from '@me2em/core';
import { useScenario } from './hooks/useScenario';
import { runHumanScenario } from './scenarios/human';
import { runSatelliteScenario } from './scenarios/satellite';
import { runAgentScenario } from './scenarios/agent';
import SeedIsland from './components/sandbox/SeedIsland';
import Logger from './components/Logger';
import ScenarioHuman from './components/ScenarioHuman';
import ScenarioSatellite from './components/ScenarioSatellite';
import ScenarioAgent from './components/ScenarioAgent';
import './App.css';

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
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [seedBytes, setSeedBytes] = useState<Uint8Array | null>(null);
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);

  const handleIdentityReady = useCallback(
    (id: Identity, seed: Uint8Array) => {
      setIdentity(id);
      setSeedBytes(seed);
    },
    [],
  );

  const humanScenario = useScenario(() => runHumanScenario(identity!, seedBytes!));
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <Fingerprint size={28} />
          <h1>Me2eM Protocol Demo</h1>
        </div>
      </header>

      <main className="app-main">
        {/* Step 1: Seed Island */}
        <section className="step-section">
          <SeedIsland onIdentityReady={handleIdentityReady} />
        </section>

        {/* Step 2: Scenarios + Log side by side */}
        {identity && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="scenarios-layout"
          >
            <div className="scenarios-left">
              <h2>Protocol Scenarios</h2>
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
                  Each scenario runs real protocol code — no mocks.
                </span>
              </div>
            </div>

            <div className="scenarios-right">
              <Logger scenario={activeScenario ?? 'seed'} />
            </div>
          </motion.section>
        )}

        {/* Seed log (before identity is created) */}
        {!identity && (
          <div className="log-section">
            <Logger scenario="seed" />
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
