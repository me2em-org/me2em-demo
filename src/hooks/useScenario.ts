import { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

export type ScenarioId = 'human' | 'satellite' | 'agent';

export function useScenario<T>(fn: () => Promise<T>) {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    setResult(null);
    setLoading(true);
    try {
      const res = await fnRef.current();
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Scenario failed', msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setLoading(false);
  }, []);

  return { result, loading, run, clear };
}
