import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
  seed: string[];
  onVerified: () => void;
  onBack: () => void;
}

export const SeedVerification: React.FC<Props> = ({ seed, onVerified, onBack }) => {
  const [verifyIndices] = useState(() => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const rand = Math.floor(Math.random() * 12);
      if (!indices.includes(rand)) indices.push(rand);
    }
    return indices.sort((a, b) => a - b);
  });
  
  const [inputs, setInputs] = useState<string[]>(['', '', '']);
  const [error, setError] = useState('');

  const handleVerify = () => {
    const correct = verifyIndices.every((idx, i) => inputs[i].toLowerCase().trim() === seed[idx].toLowerCase());
    if (correct) {
      onVerified();
    } else {
      setError('The words do not match your Seed Phrase. Check your notes.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Sky Protocol Check</h2>
        <p className="text-gray-500">Please enter the requested words from your Seed Phrase to prove you saved it.</p>
      </div>

      <div className="space-y-4">
        {verifyIndices.map((wordIndex, i) => (
          <div key={i}>
            <label className="block text-xs font-bold uppercase tracking-widest text-blue-600/60 mb-2">
              Word Number {String(wordIndex + 1).padStart(2, '0')}
            </label>
            <input
              type="text"
              value={inputs[i]}
              onChange={e => {
                const newInputs = [...inputs];
                newInputs[i] = e.target.value;
                setInputs(newInputs);
                setError('');
              }}
              className={`w-full px-4 py-3 rounded-xl border-2 bg-white transition-all text-lg font-mono outline-none ${error ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
              placeholder="???"
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button onClick={handleVerify} disabled={inputs.some(i => !i.trim())} className="w-full py-4 text-lg font-bold rounded-2xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition">
          Confirm Identity <ArrowRight className="inline ml-2" size={20} />
        </button>
        <button onClick={onBack} className="text-sm font-bold text-gray-500 hover:text-blue-600 transition">
          ← I need to see the Seed Phrase again
        </button>
      </div>
    </div>
  );
};
