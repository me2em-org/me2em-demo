import React, { useState } from 'react';
import { type ServiceData } from '../hooks/useMe2em';

interface Props {
  services: Record<string, ServiceData>;
  onUpdateLogin: (service: string, login: string) => void;
}

export const LoginSimulator: React.FC<Props> = ({ services, onUpdateLogin }) => {
  const [simulated, setSimulated] = useState<Record<string, boolean>>({});

  const handleSimulate = (serviceName: string) => {
    setSimulated(prev => ({ ...prev, [serviceName]: true }));
  };

  return (
    <div className="step-card">
      <h2>Шаг 4: Имитация авторизации</h2>
      {Object.values(services).map(svc => (
        <div key={svc.name} className="service-card">
          <h3>{svc.name === 'google' ? '🔵 Google' : '⚫ GitHub'}</h3>
          
          <div className="form-group">
            <label>Логин (сохраняется локально):</label>
            <input 
              type="text" 
              placeholder="user@example.com"
              value={svc.login || ''}
              onChange={(e) => onUpdateLogin(svc.name, e.target.value)}
            />
          </div>

          <div className="password-display">
            <strong>Детерминированный пароль:</strong><br/>
            <code>{svc.password}</code>
          </div>

          <div className="key-display">
            <strong>Handle ID (публичный):</strong><br/>
            <small>{svc.handleId}</small>
          </div>

          <button 
            className="btn-success" 
            onClick={() => handleSimulate(svc.name)}
            disabled={!svc.login || simulated[svc.name]}
          >
            {simulated[svc.name] ? '✅ Успешно' : '🔓 Имитировать вход'}
          </button>
        </div>
      ))}
    </div>
  );
};
