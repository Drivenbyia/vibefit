import DiagnosisCard from './DiagnosisCard.jsx';
import NeatCard from './NeatCard.jsx';
import SleepDiagnosisCard from './SleepDiagnosisCard.jsx';

/**
 * Les trois diagnostics de l'onglet Semaine (plateau, activité, sommeil).
 * Extrait de `WeekView` (règle des 80 lignes) — purement présentationnel :
 * chaque diagnostic arrive déjà calculé par son hook.
 */
export default function WeekDiagnostics({ diagnosis, neat, sleep }) {
  return (
    <>
      <DiagnosisCard
        status={diagnosis.status}
        label={diagnosis.label}
        detail={diagnosis.detail}
        weeksEvaluated={diagnosis.weeksEvaluated}
      />
      <NeatCard
        status={neat.status}
        label={neat.label}
        detail={neat.detail}
        currentSteps={neat.currentSteps}
        baselineSteps={neat.baselineSteps}
      />
      <SleepDiagnosisCard
        status={sleep.status}
        label={sleep.label}
        detail={sleep.detail}
        avgDurationMin={sleep.avgDurationMin}
      />
    </>
  );
}
