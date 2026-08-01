import { useEffect, useRef, useState } from 'react';
import { toKey } from '../utils/dateUtils.js';

/**
 * PWA installée : iOS/Android suspendent le JS en arrière-plan au lieu de
 * recharger la page. `useState(() => toKey(new Date()))` seul ne se
 * réexécute qu'au montage — l'app rouverte le lendemain matin restait donc
 * figée sur la date d'hier jusqu'à un refresh manuel.
 *
 * On ne fait avancer `dateKey` automatiquement que s'il pointait encore sur
 * l'ancien "aujourd'hui" : une navigation manuelle vers un jour passé
 * (WeekView) n'est jamais écrasée par le réveil de l'app.
 */
export function useCurrentDateKey() {
  const [dateKey, setDateKey] = useState(() => toKey(new Date()));
  const todayRef = useRef(dateKey);

  useEffect(() => {
    const syncToday = () => {
      const now = toKey(new Date());
      if (now === todayRef.current) return;
      const wasOnToday = todayRef.current;
      todayRef.current = now;
      setDateKey((prev) => (prev === wasOnToday ? now : prev));
    };

    document.addEventListener('visibilitychange', syncToday);
    window.addEventListener('focus', syncToday);
    syncToday();

    return () => {
      document.removeEventListener('visibilitychange', syncToday);
      window.removeEventListener('focus', syncToday);
    };
  }, []);

  return [dateKey, setDateKey];
}
