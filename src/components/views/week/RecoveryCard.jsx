import { HeartPulse } from 'lucide-react';
import { PALETTE, MEASURE_SOURCES } from '../../../constants/config.js';
import { useRecovery } from '../../../hooks/useRecovery.js';
import { ddmm } from '../../../utils/recoveryCopy.js';
import { BASELINE_NIGHTS } from '../../../utils/recoveryBaseline.js';
import Card from '../../ui/Card.jsx';
import RecoveryMetric from './RecoveryMetric.jsx';

/**
 * Récupération — VFC (RMSSD) et FC repos contre ta propre référence, sur les
 * nuits de la montre portée aujourd'hui. Lecture seule ; pendant l'arrêt
 * médical, affichage seul (décision du 2026-10-24).
 */
export default function RecoveryCard({ data }) {
  const rec = useRecovery(data);
  if (rec.hrv.nights === 0 && rec.rhr.nights === 0) return null;
  const nights = Math.max(rec.hrv.nights, rec.rhr.nights);
  const progress = Math.min(1, nights / BASELINE_NIGHTS);
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HeartPulse size={16} color={PALETTE.ink} strokeWidth={2.5} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, letterSpacing: '0.03em' }}>
          RÉCUPÉRATION
        </div>
        <div className="vf-mono" style={{ marginLeft: 'auto', fontSize: 10, color: PALETTE.muted }}>
          {rec.source ? MEASURE_SOURCES[rec.source] : 'toutes sources'}
          {rec.since ? ` · depuis le ${ddmm(rec.since)}` : ''}
        </div>
      </div>
      {progress < 1 && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={BASELINE_NIGHTS} aria-valuenow={nights}
          aria-label="Nuits réunies pour la référence"
          style={{ height: 6, borderRadius: 999, background: PALETTE.line, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 999, background: PALETTE.ink }} />
        </div>
      )}
      <RecoveryMetric title="VFC nuit (RMSSD)" unit="ms" metric={rec.hrv} minSpan={10}
        label="VFC RMSSD nuit par nuit sur 28 jours" />
      <RecoveryMetric title="FC repos" unit="bpm" metric={rec.rhr} minSpan={6}
        label="Fréquence cardiaque au repos nuit par nuit sur 28 jours" />
      <div style={{ fontSize: 11, color: PALETTE.muted, lineHeight: 1.5, marginTop: 10 }}>
        {rec.displayOnly
          ? 'Arrêt médical : mesures affichées, aucun verdict. '
          : ''}
        Seules les nuits de la montre actuelle comptent ; jours partiels exclus.
      </div>
    </Card>
  );
}
