import { PALETTE } from '../../../constants/config.js';

/**
 * Alerte plancher protéines, comptée en JOURS sur la semaine calendaire.
 *
 * L'ancienne version comparait une moyenne divisée par les jours saisis :
 * logger 3 jours à 180 g masquait le badge malgré 4 jours vides. Un plancher
 * quotidien ne se contrôle pas par une moyenne.
 */
export default function ProteinBadge({ daysUnder, daysNotLogged, floor }) {
  const parts = [];
  if (daysUnder > 0) parts.push(`${daysUnder} j < ${floor} g`);
  if (daysNotLogged > 0) parts.push(`${daysNotLogged} j non loggé${daysNotLogged > 1 ? 's' : ''}`);
  if (parts.length === 0) return null;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 8px',
      marginBottom: 6,
      background: PALETTE.warnSoft,
      border: `1px solid ${PALETTE.warn}`,
      borderRadius: 2,
      fontSize: 10,
      fontWeight: 700,
      color: PALETTE.warn,
      letterSpacing: '0.06em',
    }}>
      ⚠ Protéines · {parts.join(' · ')}
    </div>
  );
}
