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

// --- Direction artistique « Millimétré » — voir DESIGN.md ---
// L'app est le relevé papier d'un instrument calibré : fond gris FROID (grain
// labo, jamais crème), feuilles à bordure 1px et ZÉRO ombre, graduations
// physiques plutôt que barres remplies.
//
// Règle de couleur : une couleur signifie un ÉTAT, jamais une décoration.
//   deep  → dans la cible / atteint / marque VibeFit
//   warn  → EN DESSOUS de la cible (un manque : pas, séances, apport)
//   alert → HORS BORNES (dépassement, erreur de saisie, perte de données)
// `alert` reste rare par construction : le diluer sur des manques ordinaires
// lui ferait perdre sa valeur de signal.
export const PALETTE = {
  // Fonds & encre
  paper: '#E8EBED',      // fond de l'app — gris froid
  surface: '#F8FAFB',    // feuille surélevée (bordure 1px, sans ombre)
  highlight: '#DDE3E6',  // encart consultatif — papier recessé, froid
  ink: '#0F1419',        // texte, chiffres, cran « aujourd'hui »
  inkSoft: '#1C232A',    // fonds inversés (header, nav)
  muted: '#56616B',      // marginalia, labels — AA sur paper et surface
  line: '#C2CBD1',       // bordures de séparation — décoratives, non porteuses
  // `tick` est distinct de `line` à dessein : les graduations de la règle
  // PORTENT l'information d'échelle, elles tombent donc sous WCAG 1.4.11
  // (contraste non-textuel ≥ 3:1). Une bordure de card, elle, n'est pas le seul
  // indice de la limite du composant et peut rester légère.
  tick: '#7C868D',       // graduations — 3.55:1 sur surface, 3.10:1 sur paper

  // États
  deep: '#0B6E4F',       // signal : dans la cible
  deepSoft: '#DCE9E3',
  warn: '#8A5A0B',       // en dessous de la cible
  alert: '#C6321E',      // hors bornes
  alertSoft: '#F9EDEA',

  // Rampe catégorielle — distingue des natures, pas des états.
  // La couleur n'y est jamais porteuse seule : label, valeur et cible sont
  // toujours écrits à côté (cf. Bar.jsx, MacroBar.jsx).
  slate: '#2E5E8A',      // jour OFF / glucides
  umber: '#5F5348',      // lipides — volontairement DÉSATURÉ : un brun saturé
                         // (l'ancien #8A5A2B) se confondait avec `alert` sur un
                         // filet de 4 px. Ici ΔS = 0.61, la confusion est levée.
};
