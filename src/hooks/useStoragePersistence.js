import { useEffect, useState } from 'react';

/**
 * Demande au navigateur de ne pas purger le stockage de l'app.
 *
 * Sans cette demande, le stockage est « au mieux » : le navigateur peut
 * l'effacer sous pression d'espace ou après une période sans usage (Safari),
 * et les données n'existent nulle part ailleurs. La demande ne coûte rien ;
 * le navigateur décide, l'app se contente d'afficher sa réponse.
 *
 * Statuts : 'pending' · 'persisted' · 'denied' · 'unsupported'.
 */
export function useStoragePersistence() {
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    let cancelled = false;
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persist || !storage?.persisted) {
      setStatus('unsupported');
      return undefined;
    }
    storage.persisted()
      .then((already) => (already ? true : storage.persist()))
      .then((granted) => { if (!cancelled) setStatus(granted ? 'persisted' : 'denied'); })
      .catch(() => { if (!cancelled) setStatus('unsupported'); });
    return () => { cancelled = true; };
  }, []);

  return status;
}
