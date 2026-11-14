export const DEFAULT_STEPS_TARGET = 8000;
export const STORAGE_KEY = 'vibefit_v1';
// Version du schéma stocké sous STORAGE_KEY. La clé ne change pas : la
// migration est additive (voir models/protocol.js), un ancien export reste lisible.
//   1 — implicite : { days, targets, presetId, baseTDEE, stepsTarget }
//   2 — + periods (coupures), phases (protocoles datés), devices (montres)
export const SCHEMA_VERSION = 2;

// Sources d'une mesure de montre. `iphone` = iPhone seul, pas sous-estimés
// dès que le téléphone n'est pas sur soi : jamais mélangé à une référence montre.
export const MEASURE_SOURCES = {
  garmin: 'Garmin',
  apple_watch: 'Apple Watch',
  iphone: 'iPhone seul — sous-estimé',
  manual: 'Saisie manuelle',
};

// Règles d'une phase datée (voir models/protocol.js). Une phase ne change
// aucune donnée : elle change la LECTURE des jours qu'elle couvre.
//   cycling: false  — cyclage TRAIN/OFF suspendu, cible unique tous les jours
//   training: false — séance et chantier hors sujet : non saisissables
export const PHASE_TYPES = {
  medical_stop: { label: 'Arrêt médical', cycling: false, training: false },
};
// Sources qui comptent comme « pas montre » — les seules admises dans une
// moyenne ou une référence de pas. `iphone` (sous-estimé dès que le téléphone
// n'est pas porté) et `manual` (origine inconnue) en sont exclus.
export const WATCH_SOURCES = ['garmin', 'apple_watch'];

// Semaines complètes de la montre COURANTE exigées avant qu'un seuil VFC / FC
// repos puisse s'appliquer. Une VFC ne se compare qu'à elle-même, mesurée par
// le même capteur et le même algorithme : changer de montre remet ce compteur
// à zéro.
export const SLEEP_STRAIN_MIN_BASELINE_WEEKS = 4;

// Calibration du TDEE après une reprise : aucune valeur mesurée n'est publiée
// avant ce nombre de jours croisant poids ET apport depuis le début de la
// calibration. Strict à dessein — 14 et non les 10 du moteur ordinaire.
export const CALIBRATION_REQUIRED_DAYS = 14;

// Rappel de sauvegarde : au-delà de ce nombre de jours sans export JSON, la
// carte de rappel apparaît sur Aujourd'hui. 7 = « chaque dimanche ».
export const BACKUP_REMINDER_DAYS = 7;

// Type de jour pendant une phase sans cyclage — clé de la cible unique.
export const REST_DAY_TYPE = 'rest';

// --- Garde-fou de plausibilité du TDEE mesuré ---
// Un TDEE sous 1,1 × le métabolisme de base (Mifflin-St Jeor) ou au-dessus de
// 4000 kcal n'est pas une mesure : c'est une tendance de poids faussée
// (balance imprécise, début de fenêtre atypique). Il n'est pas publié comme
// valide et n'ouvre aucune recalibration.
// Entre 1,1 et 1,25 × : valide, mais « TDEE bas — à confirmer sur la
// prochaine fenêtre », et il n'ouvre pas de recalibration à lui seul.
export const TDEE_MIN_BMR_FACTOR = 1.1;
export const TDEE_LOW_BMR_FACTOR = 1.25;
export const TDEE_MAX_PLAUSIBLE_KCAL = 4000;

// --- Résolution de la balance et lisibilité de la tendance ---
// Pas d'affichage de la balance (kg). Une pesée lue au 0,5 kg près porte un
// bruit de quantification de variance résolution²/12, invisible dans les
// résidus quand les lectures se répètent (78, 78, 78…) : il est AJOUTÉ à la
// variance résiduelle de la régression.
export const SCALE_RESOLUTIONS = [0.1, 0.5, 1];
export const DEFAULT_SCALE_RESOLUTION = 0.5;
// Au-delà de ±300 kcal (intervalle à 95 %), la tendance n'est pas lisible :
// la fenêtre s'allonge (21 puis 28 jours) et aucune recalibration n'est proposée.
export const TREND_MAX_CI95_KCAL = 300;
export const TREND_WINDOW_SIZES = [14, 21, 28];
// Rupture : coupure, début de calibration ou jour atypique (jeûne, resto).
// L'allongement de la fenêtre ne remonte ni sur une rupture ni sur les
// N jours qui la SUIVENT (glycogène et eau qui se reconstituent : le 24/10,
// un jeûne en début de fenêtre a fabriqué +0,49 kg/sem et un TDEE de 1375).
export const TDEE_RUPTURE_MARGIN_DAYS = 3;
// Précision affichée : ≤ 150 bonne, ≤ 300 moyenne, au-delà insuffisante.
export const TREND_GOOD_CI95_KCAL = 150;

// Profil physiologique — bornes de saisie (au-delà : valeur écartée).
export const PROFILE_SEXES = { male: 'Homme', female: 'Femme' };
export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 230;
export const BIRTH_YEAR_MIN = 1920;

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
// Protéines de la cible unique d'une phase sans entraînement (arrêt médical) :
// 130 g ≈ 1,7 g/kg à 78 kg. Sans stimulus de musculation, 160 g n'était jamais
// atteint (93 g/j mi-novembre) et une cible jamais tenue ne protège rien.
// Règle de LECTURE de la phase : à sa clôture, les cibles cyclées (≥ 160 g)
// reprennent sans migration. Décision du 2026-11-14.
export const REST_PROTEIN_G = 130;
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

// --- Direction artistique « Los Santos Dusk » — voir DESIGN.md ---
// Grove Street la nuit : San Andreas / Californie 90s / hip-hop West Coast /
// ciné 80s / streetwear actuel. Presque noir mais CHAUD (violet de crépuscule,
// pas un gris neutre), couleurs de gang détournées en couleurs d'état,
// dégradé coucher de soleil réservé aux surfaces décoratives.
//
// Règle de couleur : une couleur signifie un ÉTAT, jamais une décoration.
//   green (Grove Street) → dans la cible / atteint / marque VibeFit
//   gold  (Vagos)         → EN DESSOUS de la cible (un manque)
//   coral (néon coucher de soleil) → HORS BORNES (dépassement, erreur, perte de données)
// `alert` reste rare par construction : le diluer sur des manques ordinaires lui
// ferait perdre sa valeur de signal.
export const PALETTE = {
  // Fonds & encre — presque noir, mais chaud : violet de nuit, pas gris neutre
  bg: '#150F1A',            // fond de l'app — ciel de Los Santos à la nuit tombée
  surface: '#241A26',       // feuille surélevée — stuc éclairé au néon
  surfaceRaised: '#2E212F', // niveau au-dessus (inputs, éléments imbriqués)
  ink: '#F7F0E8',           // texte, chiffres — blanc chaud, pas clinique
  inkSoft: '#150F1A',       // texte sur remplissage saturé (boutons actifs)
  muted: '#A091A3',         // marginalia, labels — AA sur bg et surface
  line: '#3D2C40',          // bordures de séparation — décoratives, non porteuses
  // `tick` est distinct de `line` à dessein : les graduations de l'anneau
  // PORTENT l'information d'échelle, elles tombent donc sous WCAG 1.4.11
  // (contraste non-textuel ≥ 3:1). Une bordure de card peut rester plus discrète.
  tick: '#8A7A8D',          // graduations — 4.20:1 sur surface, 4.71:1 sur bg

  // États — couleurs de gang détournées, saturées pour glower (voir `glow()`)
  deep: '#3FC94F',      // Grove Street green — signal : dans la cible
  deepSoft: '#132918',  // fond badge/encart, texte `deep` dessus
  warn: '#FFB627',      // Vagos gold — en dessous de la cible
  warnSoft: '#2B2008',
  alert: '#FF3D68',     // néon coucher de soleil — hors bornes
  alertSoft: '#2B121A',

  // Rampe catégorielle — distingue des natures, pas des états.
  // La couleur n'y est jamais porteuse seule : label, valeur et cible sont
  // toujours écrits à côté (cf. Bar.jsx, MacroBar.jsx).
  slate: '#FF2E9A',   // magenta synthwave — jour OFF / glucides
  umber: '#B27CE8',   // Ballas purple — lipides
};

// Dégradé coucher de soleil San Andreas — RÉSERVÉ aux surfaces décoratives
// (header, splash, halo derrière l'anneau). Jamais sous du texte hors de la
// bande sombre du haut : au milieu/bas, le contraste texte ne passe plus AA
// (vérifié — voir DESIGN.md). Le texte du header reste dans la bande #241645.
export const SUNSET = 'linear-gradient(180deg, #241645 0%, #7A2D6B 55%, #FF7A3D 100%)';

// Rayon de flou du glow d'accent (halo coloré derrière un état actif — anneau,
// pill sélectionnée). Différent d'une ombre portée générique : la couleur suit
// TOUJOURS l'état affiché, jamais un gris neutre décoratif.
export const glow = (hex, size = 18) => `0 0 ${size}px ${hex}66, 0 0 ${Math.round(size / 3)}px ${hex}99`;

// Ombre dure décalée, sans flou — le patch/sticker sérigraphié plutôt que la
// carte à ombre portée générique (interdite, voir DESIGN.md §0). Réservé aux
// petits éléments d'accent (pills, badges) : sur une grande card, l'effet
// tourne au bruit visuel plutôt qu'à la signature.
export const sticker = (hex, offset = 3) => `${offset}px ${offset}px 0 0 ${hex}`;
