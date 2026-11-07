import {
  Activity, AlertTriangle, Droplet, HeartPulse, Minus, Moon,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { TONE, STATUS_KIND } from '../../../utils/vibeStatus.js';

// `color` = titre et icône, `bg` = fond de la bande : couples déjà validés AA
// par DESIGN.md §1, identiques à DiagnosisCard/NeatCard.
//
// `line` = la courbe, et il se sépare de `color` sur la SEULE tonalité neutre.
// Mesuré au validateur de palette : `muted` contre le guide `tick` donne ΔE 7.5
// en vision NORMALE (seuil dur 15) — deux gris qu'on ne distingue pas, et
// qu'aucun encodage secondaire ne rachète. `ink` remonte la paire à ΔE 36.
export const TONES = {
  [TONE.ALERT]: { color: PALETTE.alert, bg: PALETTE.alertSoft, line: PALETTE.alert },
  [TONE.WARN]: { color: PALETTE.warn, bg: PALETTE.warnSoft, line: PALETTE.warn },
  [TONE.GOOD]: { color: PALETTE.deep, bg: PALETTE.deepSoft, line: PALETTE.deep },
  [TONE.IDLE]: { color: PALETTE.muted, bg: PALETTE.surface, line: PALETTE.ink },
};

export const ICONS = {
  [STATUS_KIND.NEAT_DRIFT]: TrendingDown,
  [STATUS_KIND.NEAT_DROP]: TrendingDown,
  [STATUS_KIND.NEAT_IMPROVING]: TrendingUp,
  [STATUS_KIND.PLATEAU]: Minus,
  // La tension se lit sur la VFC et la FC repos — un cœur, pas une lune ; la
  // dette est une affaire de durée — une lune, comme `SleepCard`.
  [STATUS_KIND.SLEEP_STRAIN]: HeartPulse,
  [STATUS_KIND.SLEEP_DEBT]: Moon,
  [STATUS_KIND.WATER_RETENTION]: Droplet,
  [STATUS_KIND.LOW_ADHERENCE]: AlertTriangle,
  [STATUS_KIND.PROGRESSING]: TrendingDown,
  [STATUS_KIND.TREND]: Activity,
  [STATUS_KIND.CALIBRATING]: Activity,
  [STATUS_KIND.PLATEAU_SUSPENDED]: Minus,
  [STATUS_KIND.MEASURE_IMPLAUSIBLE]: AlertTriangle,
  [STATUS_KIND.TREND_UNREADABLE]: Activity,
};
