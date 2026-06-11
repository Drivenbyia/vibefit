import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Valeur transitoire auto-effacée après `duration` ms.
 * Utilisée pour les feedbacks UI éphémères (ENREGISTRÉ, Copié !, statut d'import).
 * Le timer est réarmé à chaque déclenchement et nettoyé à l'unmount.
 */
export function useTransientValue(duration = 1500) {
  const [value, setValue] = useState(null);
  const timer = useRef(null);

  const trigger = useCallback((v) => {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setValue(null), duration);
  }, [duration]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return [value, trigger];
}
