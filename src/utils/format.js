/**
 * Formats d'affichage français, partagés par les écrans.
 *
 * Une même mesure doit s'écrire de la même façon partout : « 78,0 kg » dans
 * le bilan et « 78.0 kg » dans la carte Poids se lisaient comme deux sources.
 * Virgule décimale, espace des milliers, signe typographique (U+2212).
 */

/** « 1 956 » */
export const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR');

/** « 78,0 » — décimales fixes, virgule. */
export const fmtDec = (n, digits = 1) => Number(n).toFixed(digits).replace('.', ',');

/** « +0,6 » / « −1,0 » / « 0,0 » */
export const fmtSigned = (n, digits = 1) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtDec(Math.abs(n), digits)}`;

/** « +120 » / « −218 » / « 0 » */
export const fmtSignedInt = (n) => {
  const r = Math.round(n);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${fmtInt(Math.abs(r))}`;
};

/** Clé de jour `YYYY-MM-DD` → « 31/10 ». Chaîne vide si absente. */
export const fmtDayMonth = (key) => (key ? `${key.slice(8, 10)}/${key.slice(5, 7)}` : '');

/** « semaine » / « semaines » — accord sur le nombre, plus de « (s) ». */
export const plural = (n, word, pluralWord = `${word}s`) => (Math.abs(n) > 1 ? pluralWord : word);
