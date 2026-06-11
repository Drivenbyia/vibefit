import { useCallback } from 'react';
import { useTransientValue } from './useTransientValue.js';

/**
 * Copie un texte dans le presse-papiers avec feedback transitoire.
 * Échec clipboard (permission refusée) → silencieux, conforme au comportement V1.
 */
export function useClipboardCopy(duration = 2000) {
  const [copied, trigger] = useTransientValue(duration);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      trigger(true);
    } catch (_) {
      // clipboard refusé — silencieux
    }
  }, [trigger]);

  return [!!copied, copy];
}
