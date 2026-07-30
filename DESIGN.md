# DESIGN.md — Direction artistique VibeFit

> **Ce fichier est la mémoire de direction artistique du repo.**
> À relire avant toute tâche UI, puis à appliquer sans redemander la direction.
> Il n'est pas descriptif mais **prescriptif** : si une proposition le contredit,
> c'est la proposition qui change.

Direction retenue : **« Los Santos Dusk »** — San Andreas / Californie 90s /
hip-hop West Coast / ciné 80s / streetwear actuel, assumé et sourcé
explicitement par le développeur (référence nommée : GTA San Andreas).

> Historique : deux directions précédentes ont été livrées et remplacées le
> même jour. (1) « Millimétré » — claire, gris froid, registre instrument de
> labo — rejetée au premier rendu, jugée triste. (2) « Signal » — reprise en
> dark-first façon wearable de performance (référence Whoop) — pas rejetée
> techniquement, mais le développeur a ensuite donné une référence culturelle
> beaucoup plus spécifique et personnelle (son univers, pas une catégorie de
> produit) : GTA San Andreas. Cette section **remplace entièrement** la
> précédente. Ce qui survit d'une direction à l'autre, à chaque fois : le
> système de tokens centralisé et la distinction état/décoration — pas les
> couleurs, pas la typo, pas la signature visuelle elle-même.

---

## 0. Interdits (refus fermes)

Ces points ne sont pas des préférences, ce sont des refus. Aucune exception.

- **Polices** : jamais Inter (ni Inter Tight), Roboto, Arial, Space Grotesk, ni
  police système par défaut.
- **Jamais de police graffiti / tag / bombe dans l'UI.** Refus explicite du
  développeur, pas une préférence de style : ça abîme l'UI et l'UX. Trois
  raisons qui tiennent quel que soit l'univers visuel — c'est illisible en
  français accentué, ça crie l'intention au point de faire déguisement plutôt
  que direction, et ça dégrade la lecture des données, qui est la fonction
  même de l'app. La culture rue passe par le **traitement** (blackletter
  contenu, chrome, capitales larges, patch sérigraphié), jamais par des
  lettres décoratives illisibles. Ne pas rouvrir ce point.
- **Palette** : jamais fond crème + accent terracotta ; jamais gris papier
  froid façon carnet de labo (direction 1) ; jamais noir neutre de wearable
  générique (direction 2) — le fond est **presque noir mais chaud**, teinté
  violet de crépuscule, pas un gris/noir neutre.
- **Contenu** : le brief cite « pornographie » dans une liste de références
  culturelles (GTA SA, hip-hop, ciné 80s, streetwear). VibeFit est un tracker
  nutritionnel — aucun contenu sexuel explicite n'y a sa place, quel que soit
  le thème visuel. Ce qui est retenu de l'univers GTA SA ici est son
  esthétique (couleurs, architecture, lettrage, culture rue), pas son
  contenu adulte.
- **Effets** : jamais de glassmorphism ni de `backdrop-filter`. Le **glow**
  et l'**ombre dure décalée façon sticker** (`sticker()` dans `config.js`)
  sont la signature de cette direction — à ne pas confondre avec l'ombre
  portée générique floue et grise, toujours interdite.
- **Layout** : jamais « hero + 3 feature cards + dégradé » générique.

---

## 1. Palette — Grove Street la nuit

Presque noir, mais **chaud** : un ciel de Los Santos au crépuscule, pas un
gris/noir neutre de dashboard. Source de vérité unique :
`src/constants/config.js` → `PALETTE`.

### Fonds & encre

| Token | Hex | Rôle |
|---|---|---|
| `bg` | `#150F1A` | fond de l'app — nuit violette |
| `surface` | `#241A26` | feuille surélevée — stuc éclairé au néon |
| `surfaceRaised` | `#2E212F` | niveau au-dessus — inputs, éléments imbriqués |
| `ink` | `#F7F0E8` | texte, chiffres — blanc chaud |
| `inkSoft` | `#150F1A` | texte sur remplissage saturé (boutons/pills actifs) |
| `muted` | `#A091A3` | marginalia, labels |
| `line` | `#3D2C40` | bordures de séparation — décoratives |
| `tick` | `#8A7A8D` | réservé si une future jauge a besoin de graduations |

`ink` et `inkSoft` sont quasi opposés. Un bouton/pill **actif** prend un fond
saturé (couleur d'état ou `ink`) : son texte doit être `inkSoft`, jamais
`ink`, sinon il disparaît sur son propre fond.

### États — des couleurs de gang détournées en couleurs d'état

| Token | Hex | Signifie | Référence |
|---|---|---|---|
| `deep` | `#3FC94F` | **dans la cible** / atteint / marque VibeFit | Grove Street green |
| `deepSoft` | `#132918` | fond badge, texte `deep` dessus | |
| `warn` | `#FFB627` | **en dessous de la cible** (un manque) | Vagos gold |
| `warnSoft` | `#2B2008` | | |
| `alert` | `#FF3D68` | **hors bornes** (dépassement, erreur, perte de données) | néon coucher de soleil |
| `alertSoft` | `#2B121A` | | |

Coïncidence exploitée, pas forcée : Grove Street (vert) est la faction du
joueur dans GTA SA, ce qui rend « vert = bon/chez soi » doublement juste, pour
l'état de la donnée ET pour la référence. `warn`/`alert` restent la règle la
plus facile à casser : **un manque ordinaire n'est pas une alerte.**

### Rampe catégorielle — distingue des natures, pas des états

| Token | Hex | Rôle | Référence |
|---|---|---|---|
| `slate` | `#FF2E9A` | jour OFF / glucides | magenta synthwave, ciné 80s |
| `umber` | `#B27CE8` | lipides | Ballas purple |

La couleur n'est jamais porteuse seule : label, valeur et cible sont toujours
écrits à côté (cf. `Bar.jsx`, `MacroBar.jsx`).

### Dégradé décoratif — SUNSET

```js
export const SUNSET = 'linear-gradient(180deg, #241645 0%, #7A2D6B 55%, #FF7A3D 100%)';
```

**Réservé aux surfaces décoratives** (header, splash, halo). Jamais sous du
texte hors de la bande sombre du haut (`#241645`) : au milieu et en bas, le
contraste texte échoue l'AA (vérifié — `ink` sur le stop du bas : 2.29:1).
Le header place tout son texte dans la bande sombre et laisse le dégradé
« ouvrir » vers le bas, en zone purement décorative (silhouette, pas de texte).

### Contraste

Toutes les paires utilisées passent **WCAG AA** (contrainte non négociable du
`1_project_bible.md`), y compris les textes sur remplissage saturé (`inkSoft`
sur `deep`/`warn`/`alert`/`slate` : 5.5 à 10.7:1). `umber` (Ballas purple) a
été éclairci jusqu'à `#B27CE8` précisément pour passer l'AA en texte — un
violet plus proche du violet de gang réel dans le jeu échouait à 4.04:1.
Toute nouvelle couleur d'état doit être vérifiée avant d'entrer.

---

## 2. Typographie — le cœur de la direction

**Cinq rôles.** C'est ici que l'ADN hip-hop LA se joue vraiment : une palette
peut évoquer un univers, seul le lettrage l'incarne. Affectation dans
`src/components/ui/FontStyles.jsx`, `@font-face` dans `src/styles/fonts.css`.

| Classe | Famille | Rôle | Référence |
|---|---|---|---|
| `.vf-gothic` | **UnifrakturCook** 700 | wordmark, nom de preset, date de semaine | blackletter LA — *The Chronic*, Cypress Hill, plaques lowrider, tatouage chicano |
| `.vf-hero` | **Anton** 400 | gros chiffres | poster condensé — flyers, jaquettes West Coast |
| `.vf-display` | **Archivo Black** 400 | capitales tracées (labels, titres de carte) | flocage de maillot, box logo streetwear |
| `.vf-body` | **Barlow** 400/600/700 | tout le texte lisible | grotesque de signalétique, faible contraste |
| `.vf-mono` | **Azeret Mono** var. | données tabulaires | mono brutaliste |

> **IBM Plex Sans/Mono ont été retirées.** C'était un reliquat de la première
> direction (« instrument de labo ») qui avait survécu à deux re-directions :
> la police corporate d'IBM composait encore tout le texte réellement lisible
> d'une app d'ADN californien. C'est le plus gros écart qui restait entre la
> palette et le lettrage.

### Règles dures

- **Blackletter (`.vf-gothic`) : casse mixte, ≥16px, chaînes courtes.**
  Jamais en capitales — « VIBEFIT » en textura est un mur illisible ; le
  wordmark est donc « VibeFit ». Jamais en texte courant. **Trois
  emplacements autorisés** : le wordmark, le nom de preset
  (`PresetPickerCard`), la date de semaine (`WeekSummary`). En ajouter un
  quatrième demande de vérifier la longueur — testé jusqu'à
  « Diet Break (Vacances) » (21 caractères, 216 px à 25px, tient sur une
  ligne).
- **Anton et Archivo Black n'ont qu'une graisse réelle (400).** Ne jamais
  leur passer un `fontWeight` inline : le navigateur synthétiserait un faux
  gras par-dessus une fonte déjà noire, ce qui bave. Les deux classes forcent
  `font-weight: 400`, et comme un style inline gagne toujours sur une classe,
  la règle est de **ne pas écrire de `fontWeight`** sur un élément portant
  `.vf-hero` ou `.vf-display`.
- **Archivo Black est large.** Le remplacer sur un libellé existant peut le
  faire déborder. Cas réel : la légende centrale de `BalanceRing`
  (« SOUS LA CIBLE », le libellé le plus long possible) passait de 92 px de
  passage libre à 101 px de texte et mordait sur l'arc — redimensionnée à
  `fontSize: 9` / `letterSpacing: 0.05em` (82.9 px). Mesurer avant de
  substituer.
- **Pas de police graffiti/tag** — voir §0, c'est un refus ferme et non un
  arbitrage typographique. Le blackletter porte la culture rue sans sacrifier
  la lecture ; c'est le seul véhicule autorisé pour ça.
- `.vf-tabular` reste obligatoire sur toute valeur qui change dans le temps.

### Lettrage chromé — `.vf-chrome`

Dégradé argent clippé sur le texte (`background-clip: text`), appliqué au
« Vibe » du wordmark : le chrome sur coucher de soleil, c'est la plaque de
club lowrider. « Fit » reste en vert Grove Street pour garder l'accent de
marque.

Le fallback compte : sans garde, un navigateur sans `background-clip: text`
afficherait du texte transparent, donc **invisible**. La couleur pleine
(`#EFE7DC`) est la valeur par défaut et n'est retirée que dans un
`@supports`. Contraste vérifié sur la bande haute du header (`#241645`) :
tous les stops du dégradé passent l'AA texte normal, le plus sombre
(`#9C93A8`) à 5.61:1, et le fallback à 13.43:1.

**Polices auto-hébergées** : 13 fichiers woff2, sous-ensembles latin +
latin-ext, 276 Ko, précachées par Workbox. UnifrakturCook n'existe qu'en
`latin` chez Google — suffisant, ce sous-ensemble couvre U+0000-00FF donc
tous les accents français. **Ne pas réintroduire de `<link>` Google Fonts
dans `index.html`.**

---

## 3. Layout & motifs

**Concept en une phrase** : la jaquette du jeu, jamais le dashboard — un
horizon de coucher de soleil en haut d'écran, un canvas de nuit violette
en dessous, des données qui glowent comme des néons.

- **Header** (`Header.jsx`) : fond `SUNSET`, wordmark en blackletter chromé
  (`.vf-gothic` + `.vf-chrome`, voir §2), et une **skyline** décorative
  (silhouette d'immeubles bas + palmiers, composant `Skyline`) découpée sur la
  bande basse du dégradé. C'est la pièce la plus identifiable de cette
  direction — l'écho direct du loading screen GTA SA.
- **Icône/favicon** (`public/pwa-icon.svg`, `index.html`) : même logique
  condensée — un disque « soleil » en dégradé, un palmier en silhouette.
- **Rayons** : cartes 16–20px, contrôles/pills 12px, chips 999px (rond
  complet). Hérité de la direction précédente, conservé : l'arrondi généreux
  reste juste pour ce registre aussi.
- **Sticker** (`sticker(hex, offset)` dans `config.js`) : ombre dure décalée,
  sans flou — le patch sérigraphié plutôt que la carte à ombre floue
  (interdite). Utilisé sur les pills actives de `DayTypeSwitcher`, combiné au
  glow. **Ne pas l'étendre aux grandes cards** : sur une grande surface
  l'effet tourne au bruit visuel plutôt qu'à la signature — réservé aux
  petits éléments d'accent.
- **Grain** (`index.css`, `body::after`) : texture de bruit très légère
  (opacité 0.035, `mix-blend-mode: overlay`) sur tout l'écran — la patine VHS
  du ciné 80s. Volontairement discrète : présente au regard attentif,
  invisible en usage courant. Ne pas monter l'opacité au-delà de ~0.05, ça
  se transforme vite en bruit de compression plutôt qu'en grain de pellicule.

```
TODAYVIEW (390 px)
┌──────────────────────────┐
│ VIBE·FIT      AUJOURD'HUI│ ← SUNSET, bande sombre du haut
│  ‹   Jeudi 30 Juillet  › │
│ (TRAIN) ( OFF ) (  WE  ) │ ← sticker + glow sur l'actif
│  🌆 skyline + palmiers   │ ← décoratif, découpe sur le bas du dégradé
├──────────────────────────┤
│ BILAN DU JOUR             │
│     ╭──────╮   APPORT     │
│    ╱ -220  ╲  2180        │ ← anneau glow (gold = sous la cible)
│    ╲ SOUS  ╱   kcal       │
│     ╰CIBLE─╯               │
├──────────────────────────┤
│ MACRONUTRIMENTS            │
│ PROTÉINES      148/160g   │
│ ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░ (green) │
│ GLUCIDES       305/280g   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (red, over)│
└──────────────────────────┘
```

---

## 4. Signature — L'ANNEAU/LA PISTE LUMINEUSE (inchangée dans son mécanisme)

Héritée de la direction précédente et **conservée telle quelle** : c'est un
mécanisme, pas une couleur, et il sert toujours aussi bien ici. Chaque
métrique est un remplissage plein, à bouts ronds, qui glowe dans sa couleur
d'état, avec un **marqueur de cible** — le repère que ni un cadran GTA ni un
cadran Whoop générique n'ont, parce qu'aucun des deux ne suit une valeur
*contre une cible fixe*. Voir `Bar.jsx` et `BalanceRing.jsx`.

Ce qui change dans cette direction : la couleur (vert Grove Street / gold
Vagos / rouge néon coucher-de-soleil au lieu du vert/ambre/rouge neutres) et
le cadre autour (le header sunset + skyline qui encadre l'anneau au lieu d'un
simple fond noir). Le mécanisme — échelle à 125 %, bouts ronds, glow qui suit
l'état — n'a pas de raison de rechanger tant que la direction visuelle change
de palette sans changer de nature (wearable-like → toujours wearable-like,
juste habillé différemment).

---

## 5. Contraintes PWA

- **Mobile-first.** Cadre de référence 390 px, `maxWidth: 720` centré au-delà.
- **Cibles tactiles ≥ 44 px.** Vérifié après chaque changement de direction —
  piège connu dans `NumberInput` (padding vertical sur l'`<input>`, pas son
  conteneur).
- **États vides = du contenu.** L'anneau/la piste vides montrent l'échelle
  complète avec son marqueur de cible : l'instrument est calibré et en
  attente, pas cassé.
- **Offline-first.** Polices et grain précachés, aucune requête tierce.
  `background_color`/`theme_color` du manifest = `bg`.
- **Dark uniquement.** Toujours pas de variante claire — encore plus vrai ici
  (un coucher de soleil ne se lit pas sur fond blanc).

---

## 6. Reste à faire

- Reliquat hors direction, non traité ici : `NumberInput` ignore les props
  `step` / `inputMode` passées pour le poids.
