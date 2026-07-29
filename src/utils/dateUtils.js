/**
 * Clé de jour au format YYYY-MM-DD, en date LOCALE.
 *
 * L'ancienne implémentation (`setHours(12)` puis `toISOString()`) restait une
 * date UTC avec 12 h de marge : correcte en Europe, décalée d'un jour au-delà
 * de UTC+12 où midi local tombe la veille en UTC.
 */
export const toKey = (d) => {
  const x = new Date(d);
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${mm}-${dd}`;
};

export const dayTypeFromKey = (key) => {
  const d = new Date(key + 'T12:00:00').getDay();
  if (d === 1 || d === 3 || d === 5) return 'train';
  if (d === 2 || d === 4) return 'off';
  return 'we';
};

export const fmtFr = (key) =>
  new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

export const shortFr = (key) =>
  new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3);

export const addDays = (key, n) => {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const startOfWeek = (key) => {
  const d = new Date(key + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // start Monday
  d.setDate(d.getDate() + diff);
  return toKey(d);
};
