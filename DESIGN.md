# DESIGN.md — Direction artistique VibeFit

> **Ce fichier est la mémoire de direction artistique du repo.**
> À relire avant toute tâche UI, puis à appliquer sans redemander la direction.
> Il n'est pas descriptif mais **prescriptif** : si une proposition le contredit,
> c'est la proposition qui change.

Direction retenue : **« Millimétré »** — registre *instrument de mesure*.

---

## 0. Interdits (refus fermes)

Ces points ne sont pas des préférences, ce sont des refus. Aucune exception.

- **Polices** : jamais Inter (ni Inter Tight), Roboto, Arial, Space Grotesk, ni
  police système par défaut. `system-ui` n'apparaît dans aucune pile.
- **Palette** : jamais fond crème (#F4F1EA et voisins) + accent terracotta
  (#D97757 et voisins) ; jamais dégradé violet/bleu sur fond blanc.
- **Effets** : jamais de glassmorphism, de `backdrop-filter`, de spark lines, de
  bordure d'accent en biseau, ni de card à ombre portée générique.
  **Zéro `box-shadow` dans le projet** — la séparation se fait au filet 1px.
- **Layout** : jamais « hero + 3 feature cards + dégradé ».
- **Numérotation** 01/02/03 seulement si le contenu est réellement une séquence.

> Historique : VibeFit violait deux de ces points jusqu'au 2026-07-30 (fond
> `#F6F2EC` + accent `#FF5A1F`, et `Inter Tight` en police de corps). La
> re-direction a supprimé les deux.

---

## 1. Palette

Le concept impose un gris **froid** : le grain d'un carnet de labo, jamais celui
du kraft ou du papier recyclé. Source de vérité unique :
`src/constants/config.js` → `PALETTE`.

### Fonds & encre

| Token | Hex | Rôle |
|---|---|---|
| `paper` | `#E8EBED` | fond de l'app |
| `surface` | `#F8FAFB` | feuille surélevée — bordure 1px, **sans ombre** |
| `highlight` | `#DDE3E6` | encart consultatif — papier recessé |
| `ink` | `#0F1419` | texte, chiffres, **cran « aujourd'hui »** |
| `inkSoft` | `#1C232A` | fonds inversés |
| `muted` | `#56616B` | marginalia, labels |
| `line` | `#C2CBD1` | bordures de séparation — décoratives |
| `tick` | `#7C868D` | **graduations de la règle** |

`line` et `tick` sont séparés à dessein. Les graduations *portent* l'information
d'échelle : elles tombent sous WCAG 1.4.11 (contraste non-textuel ≥ 3:1). Une
bordure de card n'est pas le seul indice de la limite du composant et peut donc
rester légère. Ne pas refusionner ces deux tokens.

### États — une couleur signifie un état, jamais une décoration

| Token | Hex | Signifie |
|---|---|---|
| `deep` | `#0B6E4F` | **dans la cible** / atteint / marque VibeFit |
| `deepSoft` | `#DCE9E3` | fond de l'état atteint |
| `warn` | `#8A5A0B` | **en dessous de la cible** (un manque) |
| `alert` | `#C6321E` | **hors bornes** (dépassement, erreur, perte de données) |
| `alertSoft` | `#F9EDEA` | fond de l'état hors bornes |

La distinction `warn` / `alert` est la règle la plus facile à casser et la plus
importante à tenir : **un manque ordinaire n'est pas une alerte.** Colorer en
vermillon des pas en retard ou une séance non faite dilue `alert` jusqu'à lui
retirer toute valeur de signal. `alert` doit rester rare.

### Rampe catégorielle — distingue des natures, pas des états

| Token | Hex | Rôle |
|---|---|---|
| `slate` | `#2E5E8A` | jour OFF / glucides |
| `umber` | `#5F5348` | lipides |

`umber` est volontairement **désaturé**. Un brun saturé (l'ancien `#8A5A2B`) se
confondait avec `alert` sur un filet de 4 px : à l'écran, « lipides » et
« glucides en dépassement » devenaient le même objet. L'écart de saturation
(ΔS = 0.61) est ce qui lève la confusion — ne pas resaturer.

La couleur n'est jamais porteuse seule : label, valeur et cible sont toujours
écrits à côté (cf. `Bar.jsx`, `MacroBar.jsx`). C'est ce qui rend la rampe
acceptable en déficience de vision des couleurs.

### Contraste

Toutes les paires utilisées passent **WCAG AA** (contrainte non négociable du
`1_project_bible.md`) : `ink`/`paper` 15.46:1, `muted`/`paper` 5.29:1,
`deep`/`surface` 5.97:1, `warn`/`highlight` 4.57:1, `alert`/`alertSoft` 4.73:1,
`tick`/`surface` 3.55:1. Toute nouvelle paire doit être vérifiée avant d'entrer.

---

## 2. Typographie

Trois rôles, trois familles. Affectation dans
`src/components/ui/FontStyles.jsx`, `@font-face` dans `src/styles/fonts.css`.

| Classe | Famille | Rôle |
|---|---|---|
| `.vf-display` | **Archivo** 700/900 | chiffres-vedettes, titres de cadran |
| `.vf-body` | **IBM Plex Sans** 400/600 | corps, labels, interface |
| `.vf-mono` | **IBM Plex Mono** 500/600 | données, ratios, valeurs relevées |

`.vf-tabular` (`font-variant-numeric: tabular-nums`) est **obligatoire** sur
toute valeur qui change dans le temps : sans elle les chiffres dansent d'un
rendu à l'autre et l'app cesse de ressembler à un instrument.

**Polices auto-hébergées.** Elles sont servies depuis `/fonts` (8 fichiers
woff2, sous-ensembles latin + latin-ext, 216 Ko) et précachées par Workbox.
Aucun appel CDN au chargement : un CDN laisserait l'app retomber sur la police
système au premier lancement hors réseau, ce qui casse à la fois
« offline-first » et l'interdit typographique. **Ne pas réintroduire de `<link>`
Google Fonts dans `index.html`.**

**Échelle en usage** (px) : 9 · 10 · 11 · 12 · 13 · 14 · 16 · 18 · 22 · 30 · 32.
Le bas de l'échelle (9–11) est réservé aux labels capitales tracées ; le haut
(22–32) aux chiffres-vedettes en `.vf-display`. Pas de taille intermédiaire
nouvelle sans raison.

---

## 3. Layout

**Concept en une phrase** : l'app est le relevé papier d'un instrument calibré —
une pile de feuilles à filet, sur laquelle chaque mesure repose sur une échelle
graduée partagée.

Rayons : **0 / 2 / 3 uniquement**. Une card à `borderRadius: 14` est hors
direction — elle ramène l'app vers le défaut mou générique.

```
TODAYVIEW (390 px)                    WEEKVIEW
┌──────────────────────────┐          ┌──────────────────────────┐
│ VIBE·FIT      AUJOURD'HUI│ ← ink    │ SEMAINE DU    SOLDE NET  │
│  ‹   Jeudi 30 Juillet  › │          │ lundi 27 juillet  +1840  │
│ [TRAIN] [ OFF ] [  WE  ] │          │ 1 / 7 jours saisis       │
├══════════════════════════┤ ← deep   ├──────────────────────────┤
│ BILAN DU JOUR            │          │ LUN MAR MER ┏JEU┓ VEN …  │
│      ╭─┼─┼─┼─╮   APPORT  │          │  27  28  29 ┃ 30┃  31    │
│    ╫─┤  -220 ├─  2180    │          │             ┗━━━┛ ↑ cran │
│      ╰─┼─┼─┼─╯   kcal    │          ├──────────────────────────┤
│       ↑ encoche de cible │          │ BILAN NET                │
├──────────────────────────┤          │ [APPORT][DÉPENSE][SÉANCE]│
│ MACRONUTRIMENTS          │          ├──────────────────────────┤
│ PROTÉINES      148 / 160g│          │ TENDANCE CALORIQUE       │
│ ├──┬──┬──┬──╫──┬──┬──┬──┤│          │ barres/jour, cran = jour │
│ GLUCIDES       305 / 280g│          ├──────────────────────────┤
│ ├──┬──┬──┬──╫━━┬──┬──┬──┤│ ← alert  │ MOYENNES / JOUR SAISI ÷ 1│
│ LIPIDES         61 /  70g│          └──────────────────────────┘
│ ├──┬──┬──┬──╫──┬──┬──┬──┤│
├──────────────────────────┤          Chaque vue = orchestrateur
│ APPORT · DÉPENSE · SÉANCE│          pur ≤ 50 lignes ;
│ POIDS · TAILLE · SOMMEIL │          sous-composants ≤ 80.
├──────────────────────────┤
│ Jour  Semaine  Cibles  … │ ← surface + filet supérieur
└──────────────────────────┘
```

---

## 4. Signature — LA RÈGLE GRADUÉE

**Le détail qui rend VibeFit reconnaissable.** Aucune barre de progression
remplie nulle part. Chaque métrique repose sur une échelle physique graduée, et
**la cible est une encoche, pas une fin de course**.

```
KCAL        1 840 / 2 400
├──┬──┬──┬──┬──╫──┬──┬──┬──┤
              ↑
     ╫ = encoche de cible (cran lourd, ink, 2px)
```

Trois règles qui font tenir la signature :

1. **L'échelle court jusqu'à 125 % de la cible** (`SCALE = 1.25`), ce qui place
   l'encoche à 80 % de la largeur. Dépasser reste donc *lisible* au lieu de
   saturer la barre — c'est tout l'intérêt par rapport à une barre classique.
2. **Bouts droits, jamais arrondis.** `strokeLinecap: 'butt'`, aucun
   `border-radius` sur les filets de valeur. Le bout arrondi est la mollesse
   générique que la direction refuse.
3. **L'arc de valeur ne recouvre jamais les graduations.** Sur le cadran
   (`BalanceRing`) la règle est le cercle **extérieur** (`R_RULE = 64`) et la
   valeur une bande **intérieure** (`R_ARC = 47`). Les faire coïncider annule la
   signature : l'arc masque l'échelle et on retombe sur un donut ordinaire.

Corollaire : **« aujourd'hui » est un cran, pas une couleur.** Le jour courant se
marque en `ink` lourd (bloc inversé dans `WeekCalendar`, contour dans `DayBar`) —
c'est le curseur sur le mètre-ruban, pas une pastille colorée.

Implémentations de référence : `src/components/ui/Bar.jsx` (règle linéaire,
primitive partagée par MacrosCard / ExpenditureCard) et
`src/components/views/today/BalanceRing.jsx` (règle refermée en cadran).

---

## 5. Contraintes PWA

- **Mobile-first.** Cadre de référence 390 px, `maxWidth: 720` centré au-delà,
  encadré de filets 1px.
- **Cibles tactiles ≥ 44 px.** Vérifié : zéro élément interactif sous 44 px.
  Attention au piège corrigé dans `NumberInput` — le padding vertical doit vivre
  sur l'`<input>`, pas sur son conteneur, sinon le champ *paraît* faire 45 px
  alors que la zone réellement cliquable n'en fait que 25.
- **États vides = du contenu.** L'écran sans données affiche la règle complète,
  graduée, avec son encoche de cible et une valeur à zéro : l'instrument est
  calibré et en attente. Ne jamais remplacer ça par un texte « aucune donnée »
  seul — l'échelle vide *est* le message.
- **Offline-first.** Polices précachées, aucune requête tierce au chargement.
  `background_color` du manifest = `paper`, `theme_color` = `ink` (la barre
  système prolonge l'encre, jamais un accent).
- **Pas de dark mode.** Choix assumé : la direction est clair-first, et un
  second thème doublerait la surface de dérive de la palette pour un gain faible
  sur un usage majoritairement diurne. À rouvrir explicitement si besoin.
- **Marque** : la règle graduée avec son encoche verte (favicon inline SVG dans
  `index.html`, `public/pwa-icon.svg`). Plus d'haltère — c'était un registre
  « coach », pas « instrument ».

---

## 6. Reste à faire

- `MacroBar.jsx` (WeekView) est aligné en couleur et en forme mais n'est pas
  encore gradué : sa géométrie place la cible en fin de course, donc l'encoche
  n'a pas de place. À reprendre avec la même échelle 125 % que `Bar.jsx`.
- Reliquat hors direction, non traité ici : `NumberInput` ignore les props
  `step` / `inputMode` passées pour le poids.
