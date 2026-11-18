import { useEffect, useState } from 'react';
import { logger, type LogEntry, type ScenarioTag } from '../utils/logger';

interface LoggerProps {
  scenario: ScenarioTag;
}

export default function Logger({ scenario }: LoggerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs((prev) => [...prev, entry]);
    });
    return unsubscribe;
  }, []);

  const filtered = logs.filter((l) => l.scenario === scenario);

  return (
    <div className="logger-container">
      <h3>Crypto Operation Log</h3>
      <div className="log-output">
        {filtered.length === 0 && (
          <div className="log-empty">
            No operations yet. Run a scenario to see the log.
          </div>
        )}
        {filtered.map((entry) => (
          <div key={entry.id} className={`log-line log-${entry.level}`}>
            <span className="log-time">[{entry.timestamp}]</span>
            <span className="log-msg">{entry.message}</span>
            {entry.data && <span className="log-data"> → {entry.data}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
