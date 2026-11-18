import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Download, Eye, ShieldAlert, CheckCircle2, XCircle, Loader2, PenLine } from 'lucide-react';

interface Props {
  seedPhrase: string[];
  onVerified: () => void;
}

type Phase = 'reveal' | 'write' | 'checking' | 'success' | 'error';

export default function SeedPaper({ seedPhrase, onVerified }: Props) {
  const [phase, setPhase] = useState<Phase>('reveal');
  const [isVisible, setIsVisible] = useState(false);
  const [paper, setPaper] = useState('');
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

  const handleStartWriting = () => {
    setIsVisible(true);
    setPhase('write');
  };

  const handleVerify = () => {
    setPhase('checking');
    const expected = seedPhrase.join(' ').toLowerCase().trim();
    const actual = paper.toLowerCase().trim();
    const words = actual.split(/\s+/).filter(Boolean);
    const correct =
      words.length === seedPhrase.length &&
      words.every((w, i) => w === seedPhrase[i].toLowerCase());

    setTimeout(() => {
      if (correct) {
        setPhase('success');
        setTimeout(onVerified, 800);
      } else {
        setPhase('error');
      }
    }, 500);
  };

  return (
    <div className="seed-paper">
      <div className="seed-paper-header">
        <PenLine size={20} />
        <h3>Your Recovery Seed</h3>
        <p>
          These {seedPhrase.length} words are the key to your Identity.
          Write them down on paper — then copy them into the box below to
          confirm you have them.
        </p>
      </div>

      {/* Phase: reveal */}
      {phase === 'reveal' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="seed-grid-wrap">
            <div className={`seed-grid ${!isVisible ? 'seed-hidden' : ''}`}>
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

          <button onClick={handleStartWriting} disabled={!isVisible} className="primary-btn w-full">
            I've written it down — continue →
          </button>
        </motion.div>
      )}

      {/* Phase: write */}
      {(phase === 'write' || phase === 'checking' || phase === 'success' || phase === 'error') && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="paper-box">
            <label className="paper-label">
              Your paper — type the {seedPhrase.length} words here, in order:
            </label>
            <textarea
              className="paper-textarea"
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              placeholder="word1 word2 word3 …"
              rows={4}
              disabled={phase === 'checking' || phase === 'success'}
            />
          </div>

          <AnimatePresence>
            {phase === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="verify-error"
              >
                <XCircle size={14} />
                <span>Doesn't match. Check the order and spelling.</span>
              </motion.div>
            )}
            {phase === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="verify-success"
              >
                <CheckCircle2 size={14} />
                <span>Seed verified. Creating your Identity…</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleVerify}
            disabled={phase === 'checking' || phase === 'success' || !paper.trim()}
            className="primary-btn w-full"
          >
            {phase === 'checking' ? (
              <><Loader2 size={16} className="spin" /> Verifying…</>
            ) : phase === 'success' ? (
              <><CheckCircle2 size={16} /> Verified</>
            ) : (
              'Verify my paper'
            )}
          </button>
        </motion.div>
      )}

      <div className="seed-warning">
        <ShieldAlert size={16} />
        <span>
          <strong>Security:</strong> This phrase never leaves your device. If
          you lose these words, your identity is lost forever.
        </span>
      </div>
    </div>
  );
}
