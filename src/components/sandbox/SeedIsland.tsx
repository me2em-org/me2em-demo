import { useState, useCallback, useEffect, useRef, useReducer, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Fingerprint,
  Copy,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Identity, generateSeedPhrase, get64ByteSeedFromMnemonic } from '@me2em/core';
import { logger } from '../../utils/logger';
import {
  sandboxReducer,
  initialState,
  canCopy,
  shouldWarnBeforeUnload,
} from './sandboxState';

// ─── Parse paper text into words ──────────────────────────────────────────────
export function parsePaperWords(raw: string): string[] {
  const tokens = raw
    .replace(/[\r\n\t]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const words: string[] = [];
  for (const token of tokens) {
    const stripped = token.replace(/^\d+\.\s*/, '');
    if (!stripped) continue;
    if (/^\d+$/.test(stripped)) continue;
    const clean = stripped.replace(/[.,;:!?"'(){}[\]]+$/g, '');
    if (!clean) continue;
    words.push(clean);
    if (words.length >= 24) break;
  }
  return words;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PaperWordBadge({
  index,
  word,
  onClick,
}: {
  index: number;
  word: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Word ${index + 1}: ${word}`}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 text-xs font-mono text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
    >
      <span className="text-[var(--text-subtle)] font-semibold">{index + 1}.</span>
      <span>{word}</span>
    </button>
  );
}

function PaperBlock({
  title,
  note,
  value,
  onChange,
}: {
  title: string;
  note?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]/50">
      <p className="text-sm text-[var(--text-dim)] text-center">{title}</p>
      {note && <p className="text-sm text-[var(--text-dim)]">{note}</p>}
      <textarea
        rows={4}
        aria-label={title}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-mono focus:border-[var(--accent)] transition-colors outline-none resize-y"
      />
    </div>
  );
}

// ─── Verify Form ───────────────────────────────────────────────────────────────

function VerifyForm({
  realWords,
  verifyIndices,
  paperText,
  onPaperChange,
  onVerified,
  onError,
  onSeeAgain,
}: {
  realWords: string[];
  verifyIndices: readonly [number, number, number];
  paperText: string;
  onPaperChange: (v: string) => void;
  onVerified: () => void;
  onError: () => void;
  onSeeAgain: () => void;
}) {
  const [inputs, setInputs] = useState<string[]>(['', '', '']);
  const [errorShown, setErrorShown] = useState(false);
  const [focusedInput, setFocusedInput] = useState<number | null>(null);

  const expected = verifyIndices.map((i) => realWords[i].toLowerCase());

  const dynamicPrompt = `Enter words #${verifyIndices[0] + 1}, #${verifyIndices[1] + 1}, and #${verifyIndices[2] + 1} from your paper.`;

  const paperWords = useMemo(() => parsePaperWords(paperText), [paperText]);
  const hasPaper = paperWords.length >= 12;

  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  const handleBadgeClick = (word: string) => {
    setInputs((prev) => {
      const next = [...prev];
      const target =
        focusedInput !== null && !next[focusedInput]
          ? focusedInput
          : next.findIndex((v) => !v.trim());
      if (target === -1) return prev;
      next[target] = word;
      return next;
    });
    const nextEmpty = inputs.findIndex((v, i) => !v.trim() && i !== focusedInput);
    if (nextEmpty !== -1) inputRefs.current[nextEmpty]?.focus();
  };

  const handleChange = (idx: number, value: string) => {
    setInputs((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleConfirm = () => {
    const trimmed = inputs.map((i) => i.trim().toLowerCase());
    const allFilled = trimmed.every(Boolean);
    if (!allFilled) return;

    const match = trimmed.every((v, i) => v === expected[i]);
    if (match) {
      onVerified();
    } else {
      setErrorShown(true);
      onError();
    }
  };

  const isDisabled = inputs.some((i) => !i.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 w-full max-w-xl mx-auto"
    >
      <p className="text-center text-sm text-[var(--text-dim)]">{dynamicPrompt}</p>

      {hasPaper ? (
        <>
          <p className="text-center text-sm text-[var(--text-dim)]">
            Click the words from your paper below:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {paperWords.map((word, i) => (
              <PaperWordBadge
                key={i}
                index={i}
                word={word}
                onClick={() => handleBadgeClick(word)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <PaperBlock
            title="Your paper — paste the 12 words here"
            note="Simulates writing the seed on a physical sheet of paper."
            value={paperText}
            onChange={onPaperChange}
          />
          <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]/50 px-4 py-3">
            <XCircle size={18} className="text-[var(--text-dim)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text)]">
              Paste your paper here to enable verification.
            </p>
          </div>
        </div>
      )}

      {hasPaper && (
        <div className="flex flex-col gap-3">
          {verifyIndices.map((wordIdx, inputIdx) => {
            const padded = String(wordIdx + 1).padStart(2, '0');
            const isCorrect =
              inputs[inputIdx]?.trim().toLowerCase() === expected[inputIdx];
            return (
              <div key={inputIdx} className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-dim)] font-mono">
                  Word #{padded}
                </label>
                <input
                  ref={(el) => {
                    inputRefs.current[inputIdx] = el;
                  }}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Click a word from your paper"
                  value={inputs[inputIdx]}
                  onChange={(e) => handleChange(inputIdx, e.target.value)}
                  onFocus={() => setFocusedInput(inputIdx)}
                  className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-mono focus:border-[var(--accent)] transition-colors outline-none"
                />
                {isCorrect && inputs[inputIdx].trim() && (
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasPaper && errorShown && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3">
          <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">
            Words don't match. Check your paper.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 items-center">
        {hasPaper && (
          <button
            onClick={handleConfirm}
            disabled={isDisabled}
            className="primary-btn"
          >
            Confirm & Create Identity
          </button>
        )}
        <button
          onClick={onSeeAgain}
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-2 transition-colors"
        >
          Show seed again
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type PanelState = 'idle' | 'generating' | 'hidden' | 'revealed' | 'copied' | 'verify' | 'created';

interface SeedIslandProps {
  onIdentityReady: (identity: Identity, seedBytes: Uint8Array) => void;
}

export default function SeedIsland({ onIdentityReady }: SeedIslandProps) {
  const [state, dispatch] = useReducer(sandboxReducer, initialState);
  const [generatedWords, setGeneratedWords] = useState<string[] | null>(null);
  const [paperText, setPaperText] = useState('');
  const identityRef = useRef<Identity | null>(null);
  const copyRef = useRef(false);

  // beforeunload guard
  useEffect(() => {
    if (shouldWarnBeforeUnload(state.status)) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        (e as unknown as { returnValue: string }).returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [state.status]);

  const handleGenerate = useCallback(async () => {
    dispatch({ type: 'startGenerating' });
    logger.info('Generating 12-word BIP39 seed phrase…');
    const phrase = generateSeedPhrase(128);
    setGeneratedWords(phrase);
    dispatch({ type: 'phraseGenerated' });
    logger.success('Seed phrase generated', phrase.join(' '));
  }, []);

  const handleReveal = useCallback(() => {
    dispatch({ type: 'reveal' });
  }, []);

  const handleCopyAll = useCallback(() => {
    if (!copyRef.current && generatedWords && canCopy(state)) {
      copyRef.current = true;
      navigator.clipboard.writeText(generatedWords.join(' ')).catch(() => {});
      dispatch({ type: 'copyUsed' });
    }
  }, [generatedWords, state]);

  const handleHide = useCallback(() => {
    dispatch({ type: 'hide' });
  }, []);

  const handleVerified = useCallback(async () => {
    if (!generatedWords) return;
    try {
      logger.info('Deriving 64-byte BIP39 seed (PBKDF2-HMAC-SHA512)…');
      const seed = await get64ByteSeedFromMnemonic(generatedWords);

      logger.info('Creating root Identity from 64-byte seed…');
      const id = await Identity.fromSeed(seed);
      identityRef.current = id;

      const pubKeyHex = Array.from(id.getPublicKey())
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
      logger.success('Identity created', `pub: ${pubKeyHex.slice(0, 16)}…`);

      dispatch({ type: 'verifyPassed' });
      onIdentityReady(id, seed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Identity creation failed', msg);
      dispatch({ type: 'verifyFailed' });
    }
  }, [generatedWords, onIdentityReady]);

  const handleVerifyError = useCallback(() => {
    dispatch({ type: 'verifyFailed' });
  }, []);

  const handleBackToRevealed = useCallback(() => {
    dispatch({ type: 'backToRevealed' });
  }, []);

  const handleRestart = useCallback(() => {
    if (identityRef.current) {
      identityRef.current.dispose();
      identityRef.current = null;
    }
    setGeneratedWords(null);
    setPaperText('');
    copyRef.current = false;
    dispatch({ type: 'restart' });
  }, []);

  const panel: PanelState =
    state.status === 'revealed' && state.copyUsed ? 'copied' : state.status;

  return (
    <div className="seed-island">
      {/* ── Mentor Panel ── */}
      <div className="mentor-panel" role="status" aria-live="polite">
        {panel === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 items-center">
            <p className="text-sm text-[var(--text-dim)] text-center max-w-md">
              Your Me2eM Identity is generated from a 12-word BIP39 seed.
              This demo runs entirely in your browser — nothing leaves your device.
            </p>
            <button onClick={handleGenerate} className="primary-btn">
              <Fingerprint size={18} />
              Generate My Identity
            </button>
          </motion.div>
        )}

        {panel === 'generating' && (
          <p className="text-[var(--text-dim)] text-center">
            <Loader2 size={16} className="inline spin" /> Generating…
          </p>
        )}

        {panel === 'hidden' && generatedWords && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 items-center">
            <p className="text-sm text-[var(--text)] text-center">
              Your seed has been generated. Keep it secret.
            </p>
            <button onClick={handleReveal} className="primary-btn">
              <Eye size={18} /> Reveal Seed
            </button>
          </motion.div>
        )}

        {panel === 'revealed' && generatedWords && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text)] text-center">
              Write these words down in order. This is your only backup.
            </p>
            <div className="seed-panel">
              {generatedWords.map((word, i) => (
                <span key={i} className="seed-word">{word}</span>
              ))}
            </div>
            <button onClick={handleCopyAll} className="primary-btn self-center">
              <Copy size={16} /> Copy All
            </button>
          </motion.div>
        )}

        {panel === 'copied' && generatedWords && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <p className="text-sm font-medium text-[var(--text)] text-center">✓ Copied to clipboard</p>
            <div className="seed-panel">
              {generatedWords.map((word, i) => (
                <span key={i} className="seed-word">{word}</span>
              ))}
            </div>
            <PaperBlock
              title="Your paper — paste the 12 words here"
              note="Simulates writing the seed on a physical sheet of paper."
              value={paperText}
              onChange={setPaperText}
            />
            <button onClick={handleHide} disabled={!paperText.trim()} className="primary-btn self-center">
              Verify Seed on Paper
            </button>
            {!paperText.trim() && (
              <p className="verify-disabled-hint text-center">
                Paste the 12 words into your paper above to enable verification.
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Verify Form ── */}
      {panel === 'verify' && generatedWords && state.verifyIndices && (
        <VerifyForm
          realWords={generatedWords}
          verifyIndices={state.verifyIndices}
          paperText={paperText}
          onPaperChange={setPaperText}
          onVerified={handleVerified}
          onError={handleVerifyError}
          onSeeAgain={handleBackToRevealed}
        />
      )}

      {/* ── Created ── */}
      {panel === 'created' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <h2 className="text-2xl font-bold text-[var(--text)]">
            Your Identity is Born
          </h2>
          <p className="text-[var(--text-dim)] max-w-lg">
            A root Identity with an Ed25519 keypair has been created from your
            seed. Handles, SubHandles, and wallets are derived deterministically
            from this key.
          </p>
          <button
            onClick={handleRestart}
            className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-2 transition-colors"
          >
            <RefreshCw size={12} className="inline" /> Start over
          </button>
        </motion.div>
      )}
    </div>
  );
}
