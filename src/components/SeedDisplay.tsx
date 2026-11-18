import { useState } from 'react';
import { Copy, Download, Eye, ShieldAlert } from 'lucide-react';

interface Props {
  seedPhrase: string[];
  onVerified: () => void;
}

export default function SeedDisplay({ seedPhrase, onVerified }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(seedPhrase.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `Me2em Identity Backup\n\n${seedPhrase.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\n⚠️ NEVER SHARE THIS.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'me2em-seed.txt';
    a.click();
  };

  return (
    <div className="seed-display">
      <div className="seed-display-header">
        <h3>Your Recovery Seed</h3>
        <p>
          These {seedPhrase.length} words are the key to your Identity. Write
          them down in order.
        </p>
      </div>

      <div className="seed-grid-wrap">
        <div
          className={`seed-grid ${!isVisible ? 'seed-hidden' : ''}`}
        >
          {seedPhrase.map((word, index) => (
            <div key={index} className="seed-word">
              <span className="seed-word-num">{index + 1}.</span>
              <span className="seed-word-text">{word}</span>
            </div>
          ))}
        </div>
        {!isVisible && (
          <button className="reveal-btn" onClick={() => setIsVisible(true)}>
            <Eye size={18} /> Reveal Seed Phrase
          </button>
        )}
      </div>

      <div className="seed-actions">
        <button onClick={handleCopy} disabled={!isVisible} className="seed-action-btn">
          {copied ? '✓ Copied' : (<><Copy size={16} /> Copy</>)}
        </button>
        <button onClick={handleDownload} disabled={!isVisible} className="seed-action-btn">
          <Download size={16} /> Save .txt
        </button>
      </div>

      <div className="seed-warning">
        <ShieldAlert size={16} />
        <span>
          <strong>Security:</strong> This phrase never leaves your device. If
          you lose these words, your identity is lost forever.
        </span>
      </div>

      <button onClick={onVerified} disabled={!isVisible} className="primary-btn w-full">
        I have secured my Seed →
      </button>
    </div>
  );
}
