import { useEffect, useState } from 'react';
import { useMe2em } from './hooks/useMe2em';
import { SeedDisplay } from './components/SeedDisplay';
import { SeedVerification } from './components/SeedVerification';
import { HandleManager } from './components/HandleManager';
import { LoginSimulator } from './components/LoginSimulator';
import { LoggerConsole } from './components/Logger';
import { logger } from './utils/logger';
import './App.css';

type AppStep = 'generate' | 'display' | 'verify' | 'handles' | 'simulator';

function App() {
  const { 
    seedPhrase, services, 
    generateNewSeed, createIdentityFromSeed, deriveServiceHandles, updateLogin, resetAll
  } = useMe2em();

  const [step, setStep] = useState<AppStep>('generate');

  useEffect(() => {
    logger.info('🚀 Me2em Password Manager Demo (BeSafeChat Architecture) запущен');
  }, []);

  const handleStart = () => {
    generateNewSeed();
    setStep('display');
  };

  const handleDisplayConfirm = () => {
    setStep('verify');
  };

  const handleVerificationSuccess = async () => {
    if (!seedPhrase) return;
    logger.info('Верификация успешна. Создаем Identity...');
    await createIdentityFromSeed(seedPhrase);
    localStorage.setItem('me2em_demo_seed', JSON.stringify(seedPhrase));
    setStep('handles');
  };

  const handleBackToDisplay = () => {
    setStep('display');
  };

  return (
    <div className="app-container">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">🔐 Me2em x BeSafeChat Demo</h1>
        {step !== 'generate' && (
          <button onClick={resetAll} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
            🗑 Сбросить всё
          </button>
        )}
      </header>

      <main className="space-y-6">
        {step === 'generate' && (
          <div className="step-card text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Добро пожаловать</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Это демо демонстрирует создание детерминированных паролей на основе BIP39 Seed-фразы, 
              используя архитектуру BeSafeChat и протокол Me2em.
            </p>
            <button onClick={handleStart} className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg">
              Создать новую Identity
            </button>
          </div>
        )}

        {step === 'display' && seedPhrase && (
          <SeedDisplay seed={seedPhrase} onConfirm={handleDisplayConfirm} />
        )}

        {step === 'verify' && seedPhrase && (
          <SeedVerification seed={seedPhrase} onVerified={handleVerificationSuccess} onBack={handleBackToDisplay} />
        )}

        {step === 'handles' && (
          <HandleManager 
            isDerived={Object.keys(services).length > 0}
            onDerive={async () => {
              await deriveServiceHandles();
              setStep('simulator');
            }} 
          />
        )}

        {step === 'simulator' && (
          <LoginSimulator services={services} onUpdateLogin={updateLogin} />
        )}
      </main>

      <LoggerConsole />
    </div>
  );
}

export default App;
