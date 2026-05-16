import { useState } from 'react';
import type { AiEstimationState, AiEstimationRequest } from './aiEstimationTypes';

// Placeholder hook — stable API for when the real AI endpoint is ready.
// Replace the body of `analyze()` with the real API call. The hook signature stays the same.
export function useAiEstimation(): AiEstimationState & {
  analyze: (req: AiEstimationRequest) => Promise<void>;
  clear: () => void;
} {
  const [state, setState] = useState<AiEstimationState>({
    isLoading: false,
    error: null,
    response: null,
    lastAnalyzedAt: null,
  });

  async function analyze(_req: AiEstimationRequest) {
    // TODO: POST to AI endpoint, set response
    // setState({ isLoading: true, error: null, response: null, lastAnalyzedAt: null });
    // try {
    //   const res = await fetch('/api/ai/estimate', { method: 'POST', body: JSON.stringify(req) });
    //   const data = await res.json();
    //   setState({ isLoading: false, error: null, response: data, lastAnalyzedAt: new Date().toISOString() });
    // } catch (err) {
    //   setState({ isLoading: false, error: String(err), response: null, lastAnalyzedAt: null });
    // }
  }

  function clear() {
    setState({ isLoading: false, error: null, response: null, lastAnalyzedAt: null });
  }

  return { ...state, analyze, clear };
}
