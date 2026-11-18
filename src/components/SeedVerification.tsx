import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Props {
  seedPhrase: string[];
  onSuccess: () => void;
}

export default function SeedVerification({ seedPhrase, onSuccess }: Props) {
  const [positions] = useState(() =>
    Array.from({ length: 3 }, () => Math.floor(Math.random() * seedPhrase.length)),
  );
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  const handleChange = (idx: number, val: string) => {
    const next = [...answers];
    next[idx] = val;
    setAnswers(next);
  };

  const handleVerify = async () => {
    setStatus('checking');
    const correct = positions.every((pos, i) => answers[i].trim().toLowerCase() === seedPhrase[pos].toLowerCase());
    if (correct) {
      setStatus('success');
      setTimeout(onSuccess, 600);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="verify-box">
      {positions.map((pos, i) => (
        <div key={i} className="verify-row">
          <label>
            Word #{pos + 1}:
          </label>
          <input
            type="text"
            value={answers[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={`Enter word ${pos + 1}`}
            autoFocus={i === 0}
          />
        </div>
      ))}

      <button
        className="primary-btn"
        onClick={handleVerify}
        disabled={status === 'checking' || answers.some((a) => !a.trim())}
      >
        {status === 'checking' ? (
          <Loader2 size={16} className="spin" />
        ) : status === 'success' ? (
          <CheckCircle2 size={16} />
        ) : (
          'Verify Seed'
        )}
      </button>

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="verify-error"
        >
          <XCircle size={14} />
          <span>Incorrect words — try again</span>
        </motion.div>
      )}
    </div>
  );
}
