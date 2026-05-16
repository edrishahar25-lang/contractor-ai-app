import { useState } from 'react';
import type { AiBlueprintState } from './blueprintAiTypes';

// Placeholder hook — replace with real API call when AI endpoint is ready.
// The hook signature and returned state shape must stay stable so callers don't need to change.
export function useBlueprintAi(): AiBlueprintState & { analyze: () => void; clearSuggestions: () => void } {
  const [state] = useState<AiBlueprintState>({
    isLoading: false,
    error: null,
    suggestions: [],
    lastAnalyzedAt: null,
  });

  function analyze() {
    // TODO: send blueprint image to AI endpoint, populate suggestions
    // For now, this is a no-op placeholder
  }

  function clearSuggestions() {
    // TODO: reset suggestions state
  }

  return { ...state, analyze, clearSuggestions };
}
