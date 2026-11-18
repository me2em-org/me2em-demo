import React, { useState } from 'react';
import { Copy, Download, Eye, ShieldAlert } from 'lucide-react';

interface Props {
  seed: string[];
  onConfirm: () => void;
}

export const SeedDisplay: React.FC<Props> = ({ seed, onConfirm }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(seed.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `Me2em Identity Backup\n\n${seed.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\n⚠️ NEVER SHARE THIS.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'me2em-seed.txt';
    a.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Your Recovery Seed</h2>
        <p className="text-gray-500">These 12 words are the key to your Identity. Write them down in order.</p>
      </div>

      <div className="relative group">
        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 rounded-2xl border-2 border-blue-500/20 bg-white transition-all duration-500 ${!isVisible ? 'blur-md grayscale opacity-40 select-none' : 'blur-0 grayscale-0 opacity-100'}`}>
          {seed.map((word, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[10px] font-bold text-blue-500/50 w-4">{index + 1}.</span>
              <span className="font-mono font-bold text-gray-800">{word}</span>
            </div>
          ))}
        </div>
        {!isVisible && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button onClick={() => setIsVisible(true)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 transition">
              <Eye size={20} /> Reveal Seed Phrase
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={handleCopy} disabled={!isVisible} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
          {copied ? 'Copied!' : <><Copy size={18} /> Copy</>}
        </button>
        <button onClick={handleDownload} disabled={!isVisible} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
          <Download size={18} /> Save .txt
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm">
        <ShieldAlert className="shrink-0 mt-0.5" size={18} />
        <span><strong>Security Protocol:</strong> This phrase never leaves your device. If you lose these words, your identity is lost forever.</span>
      </div>

      <button onClick={onConfirm} disabled={!isVisible} className="w-full py-4 text-lg font-bold rounded-2xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
        I have secured my Seed →
      </button>
    </div>
  );
};
