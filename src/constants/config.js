export const DEFAULT_STEPS_TARGET = 8000;
export const STORAGE_KEY = 'vibefit_v1';

// 1 kg de masse corporelle ≈ 7700 kcal (hypothèse tissus mixtes — adipeux + maigre)
export const KCAL_PER_KG = 7700;

// --- NEAT (dépense d'activité non sportive) ---
// ~0.0005 kcal par pas et par kg : 10 000 pas ≈ 400 kcal pour 80 kg.
// Estimation volontairement conservatrice — attribuer aux pas l'intégralité
// d'une baisse de dépense Garmin surestimerait leur part (les séances y entrent).
export const KCAL_PER_STEP_PER_KG = 0.0005;

// --- Bornes de plausibilité du signal (rejet des erreurs de saisie) ---
// Une valeur hors bornes est écartée (→ null) avant tout calcul : une typo
// `78` → `780` kg se propagerait sinon dans l'interpolation, le lissage et le TDEE.
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 300;
export const INTAKE_MIN_KCAL = 500;
export const INTAKE_MAX_KCAL = 8000;
// Variation j/j physiologiquement impossible — mise à l'échelle par l'écart de
// jours : +2 kg en 3 jours est légitime, +2 kg en 1 jour est une erreur de saisie.
export const MAX_DAILY_WEIGHT_JUMP_KG = 2;

// --- Seuils absolus du protocole ---
// DEFAULT_TARGETS vit dans presetUtils.js : il est DÉRIVÉ de DEFAULT_TDEE via
// computePresetTargets(). Le définir ici créerait un cycle config → presetUtils.
export const KCAL_FLOOR = 1600;    // plancher calorique, hors week-end
export const PROTEIN_FLOOR = 160;  // plancher protéines, tous les jours
export const MIN_BASE_TDEE = 1800; // = KCAL_FLOOR + 200 : garantit OFF ≥ plancher
export const MIN_CYCLE_GAP = 400;  // écart nominal TRAIN − OFF du cyclage

export const PRESETS = {
  maintenance: {
    label: 'Maintenance',
    sub: 'Protocole VIBEFIT par défaut',
    targets: {
      train: { kcal: 2400, protein: 160, carbs: 280, fat: 70, label: 'TRAIN' },
      off:   { kcal: 1900, protein: 160, carbs: 120, fat: 75, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  cut_light: {
    label: 'Sèche légère',
    sub: 'Sèche progressive — glucides réduits les jours OFF',
    targets: {
      train: { kcal: 2200, protein: 160, carbs: 230, fat: 70, label: 'TRAIN' },
      off:   { kcal: 1700, protein: 160, carbs: 90, fat: 70, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  cut_strong: {
    label: 'Sèche forte',
    sub: 'Sèche marquée — protéines relevées à 170 g',
    targets: {
      train: { kcal: 2000, protein: 170, carbs: 180, fat: 65, label: 'TRAIN' },
      off:   { kcal: 1500, protein: 170, carbs: 60, fat: 65, label: 'OFF' },
      we:    { kcal: null, protein: 170, carbs: null, fat: null, label: 'WE' },
    },
  },
  bulk: {
    label: 'Prise de masse',
    sub: 'Surplus contrôlé — recharge les jours TRAIN',
    targets: {
      train: { kcal: 2700, protein: 160, carbs: 350, fat: 75, label: 'TRAIN' },
      off:   { kcal: 2200, protein: 160, carbs: 180, fat: 80, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  diet_break: {
    label: 'Diet Break (Vacances)',
    sub: 'Pause diète — maintien sans stress',
    targets: {
      train: { kcal: 2500, protein: 160, carbs: 290, fat: 80, label: 'TRAIN' },
      off:   { kcal: 2500, protein: 160, carbs: 290, fat: 80, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
};

// --- Direction artistique « Signal » — voir DESIGN.md ---
// Registre wearable de performance (Whoop) : dark-first, presque noir, où les
// couleurs d'état PORTENT une charge lumineuse — glow, pas décor. L'app se lit
// dans une salle de sport ou au lit à côté du téléphone, jamais en plein jour
// sur une feuille de papier.
//
// Règle de couleur : une couleur signifie un ÉTAT, jamais une décoration.
//   green  → dans la cible / atteint / marque VibeFit
//   amber  → EN DESSOUS de la cible (un manque : pas, séances, apport)
//   red    → HORS BORNES (dépassement, erreur de saisie, perte de données)
// `red` reste rare par construction : le diluer sur des manques ordinaires lui
// ferait perdre sa valeur de signal.
export const PALETTE = {
  // Fonds & encre — presque noir, jamais gris papier
  bg: '#0A0B0D',            // fond de l'app
  surface: '#16181B',       // feuille surélevée
  surfaceRaised: '#1E2124', // niveau au-dessus (inputs, éléments imbriqués)
  ink: '#F2F4F6',           // texte, chiffres, cran « aujourd'hui »
  inkSoft: '#0A0B0D',       // texte sur remplissage saturé (boutons actifs)
  muted: '#8B929A',         // marginalia, labels — AA sur bg et surface
  line: '#24282D',          // bordures de séparation — décoratives, non porteuses
  // `tick` est distinct de `line` à dessein : les graduations de l'anneau
  // PORTENT l'information d'échelle, elles tombent donc sous WCAG 1.4.11
  // (contraste non-textuel ≥ 3:1). Une bordure de card peut rester plus discrète.
  tick: '#6B7076',          // graduations — 3.56:1 sur surface, 3.94:1 sur bg

  // États — couleurs saturées, faites pour glower (voir `glow()` ci-dessous)
  deep: '#2FEA7A',      // green — signal : dans la cible
  deepSoft: '#132A1E',  // fond badge/encart, texte `deep` dessus
  warn: '#FFB020',      // amber — en dessous de la cible
  warnSoft: '#2B2008',
  alert: '#FF4D5E',     // red — hors bornes
  alertSoft: '#2B1216',

  // Rampe catégorielle — distingue des natures, pas des états.
  // La couleur n'y est jamais porteuse seule : label, valeur et cible sont
  // toujours écrits à côté (cf. Bar.jsx, MacroBar.jsx).
  slate: '#29C4FF',   // blue — jour OFF / glucides
  umber: '#A78BFA',   // purple — lipides
};

// Rayon de flou du glow d'accent (halo coloré derrière un état actif — anneau,
// pill sélectionnée). Différent d'une ombre portée générique : la couleur suit
// TOUJOURS l'état affiché, jamais un gris neutre décoratif.
export const glow = (hex, size = 18) => `0 0 ${size}px ${hex}66, 0 0 ${Math.round(size / 3)}px ${hex}99`;
