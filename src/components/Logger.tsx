import React, { useEffect, useState } from 'react';
import { logger, type LogEntry } from '../utils/logger';

export const LoggerConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs(prev => [...prev, entry]);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="logger-container">
      <h3>📜 Журнал криптографических операций</h3>
      <div className="log-output">
        {logs.map((entry) => (
          <div key={entry.id} className={`log-line log-${entry.level}`}>
            <span className="log-time">[{entry.timestamp}]</span>
            <span className="log-msg">{entry.message}</span>
            {entry.data && <span className="log-data"> → {entry.data}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
