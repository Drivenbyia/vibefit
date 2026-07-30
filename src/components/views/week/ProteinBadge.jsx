import { AlertTriangle } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';

/**
 * Alerte plancher protéines, comptée en JOURS sur la semaine calendaire.
 *
 * L'ancienne version comparait une moyenne divisée par les jours saisis :
 * logger 3 jours à 180 g masquait le badge malgré 4 jours vides. Un plancher
 * quotidien ne se contrôle pas par une moyenne.
 *
 * Style aligné sur les deux autres alertes inline de l'app (`showUndereatAlert`
 * dans IntakeCard, `showMacroWarning` dans MacrosCard) : icône Lucide, fond
 * `*Soft` + bordure pleine, rayon 12px. La version précédente avait dérivé de ce
 * patron — bordure carrée à 2px (un rayon d'aucun palier de DESIGN.md §3,
 * fossile de la toute première direction rejetée) et un `⚠` emoji brut au lieu
 * d'une icône, donc hors palette et sans glow.
 */
export default function ProteinBadge({ daysUnder, daysNotLogged, floor }) {
  const parts = [];
  if (daysUnder > 0) parts.push(`${daysUnder} j < ${floor} g`);
  if (daysNotLogged > 0) parts.push(`${daysNotLogged} j non loggé${daysNotLogged > 1 ? 's' : ''}`);
  if (parts.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      marginBottom: 12,
      background: PALETTE.warnSoft,
      border: `1px solid ${PALETTE.warn}`,
      borderRadius: 12,
      fontSize: 12,
      color: PALETTE.warn,
    }}>
      <AlertTriangle size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      <span>
        <strong>Protéines</strong> · {parts.join(' · ')}
      </span>
    </div>
  );
}
