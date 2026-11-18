import React, { useState } from 'react';

interface Props {
  onDerive: () => Promise<void>;
  isDerived: boolean;
}

export const HandleManager: React.FC<Props> = ({ onDerive, isDerived }) => {
  const [loading, setLoading] = useState(false);

  const handleDerive = async () => {
    setLoading(true);
    await onDerive();
    setLoading(false);
  };

  if (isDerived) {
    return (
      <div className="step-card success-card">
        <h2>Шаг 3: Handles созданы ✅</h2>
        <p>Пароли сгенерированы детерминировано через <code>handle.derivePassword()</code>.</p>
      </div>
    );
  }

  return (
    <div className="step-card">
      <h2>Шаг 3: Создание Handles</h2>
      <p>Для каждого сервиса будет создан изолированный Handle и выведен пароль.</p>
      <button onClick={handleDerive} disabled={loading}>
        {loading ? 'Деривация...' : '🔑 Создать Handles (Google, GitHub)'}
      </button>
    </div>
  );
};
