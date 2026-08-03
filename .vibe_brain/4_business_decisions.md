---
type: RÉFÉRENCE — lire avant toute proposition architecturale
---

# ⚖️ Business Decisions — VibeFit

> Ce fichier documente toutes les décisions techniques et produit significatives, avec leur contexte et leur justification. Toute proposition architecturale doit être confrontée à ce document avant validation.

---

## Template de décision
```
### [DATE] — [Titre court]
- **Décision** : …
- **Contexte** : …
- **Alternatives considérées** : …
- **Raison du choix** : …
- **Impact** : …
- **Réversibilité** : Facile / Moyenne / Difficile
```

---

## Décisions enregistrées

### 2026-08-03 — Le sommeil devient un diagnostic, placé avant le plateau
- **Décision** : Créer `utils/sleepDiagnosis.js` (module pur, sur le modèle de `neatDrift.js`) publiant deux statuts distincts — **DETTE** (durée moyenne < 6 h 30, seuil absolu) et **TENSION** (VFC < 85 % de sa ligne de base ou FC repos > baseline + 5 bpm, seuils relatifs). Non soumis à la porte d'adhérence. Dans `summarizeStatus`, **TENSION est arbitrée AVANT le plateau confirmé**.
- **Contexte** : `SleepCard` structure 4 champs depuis fin juillet. Vérification par grep : ils n'apparaissaient que dans `aggregateSleep` (affichage) et `formatSleep` (export). Aucun des quatre diagnostics du produit ne les lisait. Le développeur saisissait donc score, durée, VFC et FC repos chaque matin sans qu'aucune conclusion n'en soit jamais tirée.
- **Alternatives considérées** : (a) ne rien faire — écarté, c'est une corvée de saisie sans contrepartie ; (b) un seul statut « sommeil dégradé » mêlant durée et récupération — écarté, les deux n'appellent pas la même réponse (une dette se corrige en se couchant plus tôt, une tension en allégeant la charge) ; (c) des seuils absolus partout — écarté pour la VFC ; (d) des seuils relatifs partout — écarté pour la durée.
- **Raison du choix** : Le mélange de seuils absolus et relatifs est **volontaire et asymétrique**. Une VFC ne se compare qu'à elle-même — 38 ms n'est « bas » que si l'habitude est 49 — d'où le relatif. Une durée de sommeil, à l'inverse, ne se juge PAS contre une habitude : s'habituer à dormir 6 h ne fait pas disparaître le coût de dormir 6 h, d'où l'absolu. Sur l'ordre d'arbitrage : placer TENSION avant PLATEAU applique exactement le raisonnement déjà retenu pour la rétention d'eau (2026-07-30) — un plateau annoncé sur un organisme mal récupéré appelle une coupe calorique, qui est la mauvaise réponse. **L'ordre encode une règle de sécurité, pas une hiérarchie de gravité.**
- **Impact** :
  - `computeWeeklyHistory` expose désormais `sleep` (via `aggregateSleep`) et `heavyWorkDays` par semaine — additif, aucun appelant existant modifié.
  - Exemption de la porte d'adhérence héritée de `neatDrift`, avec un argument plus fort : un mauvais sommeil dégrade le contrôle alimentaire, donc les semaines où la saisie s'effondre sont les moins bien placées pour rester muettes sur leur cause probable.
  - Exige ≥ 2 semaines de ligne de base avant de parler de tension : une seule semaine de recul ne distingue pas une chute d'une valeur habituelle.
  - `STATUS_KIND` gagne `SLEEP_STRAIN` / `SLEEP_DEBT`, avec icônes `HeartPulse` / `Moon`. Titre le plus long, « RÉCUPÉRATION DÉGRADÉE », fait 21 caractères — exactement la longueur de « PAS ENCORE DE VERDICT » déjà mesurée à 177 px pour 282 px de passage libre (DESIGN.md §3), donc dans le budget sans nouvelle mesure.
  - `SleepDiagnosisCard` ajoutée à `WeekView` : la bande promet que le détail s'y trouve, ce contrat serait rompu sinon.
  - 18 tests ajoutés.
- **Réversibilité** : Facile. Module pur + hook + une carte ; retirer les deux blocs de `summarizeStatus` suffit à revenir en arrière.

### 2026-08-03 — Le jour de chantier devient une donnée structurée, séparée de la séance
- **Décision** : Ajouter `heavyWork: false` au modèle de jour, avec une bascule dans `ExpenditureCard`. Le comptage sur la fenêtre TDEE (`signals.heavyWorkDays`) est publié dans l'en-tête du rapport. **Ne corrige aucun calcul.**
- **Contexte** : Les week-ends de rénovation (3000+ kcal) sont irréguliers et sans date de fin. Une fenêtre TDEE de 14 jours contient 4 jours de week-end : selon qu'ils aient été chantier ou repos, la dépense mesurée se décale de plusieurs centaines de kcal. L'information n'existait qu'en texte libre dans les notes.
- **Alternatives considérées** : (a) laisser dans les notes — écarté, exactement l'argument qui avait fait structurer le sommeil : en texte libre, l'information n'est exploitable qu'à la lecture ; (b) réutiliser `workout` avec une valeur `chantier` — **écarté, et c'est le point important** ; (c) corriger automatiquement le TDEE sur les jours de chantier — écarté.
- **Raison du choix** : (b) est piégeux parce qu'il paraît économe. Mais `workout` **pilote `dayType`** : une séance loggée bascule le jour en TRAIN, donc change sa cible calorique. Un samedi de travaux serait alors servi à la cible d'un jour d'entraînement programmé. Un test dédié verrouille cette séparation. (c) supposerait un coût calorique connu du chantier, qu'on n'a pas — et fabriquerait une correction invérifiable dans le seul chiffre qui sert d'arbitre. Le marquage reste donc une **mesure de représentativité** : deux fenêtres de même qualité formelle ne décrivent pas la même vie, et c'est au lecteur d'en tenir compte, pas à l'algorithme de le masquer.
- **Impact** :
  - Couleur du pill prise à la rampe **catégorielle** (`umber`) et non aux couleurs d'état : un chantier qualifie la nature d'une journée, il n'est ni un manque (`warn`) ni un dépassement (`alert`). Aucune couleur nouvelle introduite, donc aucun contraste à revérifier.
  - `heavyWork` suffit à rendre un jour non vide dans le rapport : un samedi de chantier sans pesée reste une information.
  - Champ additif — les jours antérieurs le reçoivent par le spread d'`emptyDay()`.
- **Réversibilité** : Facile pour l'UI et l'export. Le champ lui-même reste dans les données déjà saisies, mais son absence est sans effet (`!!day.heavyWork`).

### 2026-08-03 — Deux chemins d'import : restaurer (remplace) et fusionner (complète)
- **Décision** : Ajouter `backupUtils.mergeDays`, une fusion **champ à champ non destructive**, exposée comme un second bouton distinct de la restauration. En cas de désaccord entre une valeur importée et une valeur saisie, **la saisie gagne**.
- **Contexte** : `useBackupManager` fusionnait via `{ ...prev.days, ...parsed.days }`, soit un remplacement au niveau du JOUR. Correct pour restaurer une sauvegarde sur un appareil neuf ; destructeur dès qu'un import devient récurrent et partiel — un fichier ne portant que dépense, pas et sommeil effacerait les macros déjà saisies à la main, sans le moindre signal.
- **Alternatives considérées** : (a) rendre l'unique import non destructif — écarté, ça casse la restauration de sauvegarde, dont le sens est justement d'écraser ; (b) demander à l'utilisateur quoi faire champ par champ — écarté, insoutenable ; (c) laisser l'import écraser et prévenir dans le texte — écarté, un avertissement ne rattrape pas une perte de données.
- **Raison du choix** : Les deux usages sont réellement distincts et méritent deux chemins ; les confondre force l'un des deux à être faux. Sur l'arbitrage saisie > import : c'est le seul choix sûr, parce que **l'utilisateur peut corriger une valeur qu'il voit, jamais en retrouver une qu'il n'a pas vu disparaître**.
- **Impact** :
  - `fillBlanks` est récursif : les groupes imbriqués (`intake`, `expenditure`, `sleep`) se complètent champ à champ, pas en bloc.
  - Un jour absent est créé sur la forme d'`emptyDay()`, jamais recopié tel quel — un objet partiel priverait les vues des clés qu'elles déstructurent.
  - La fusion est **sans `window.confirm`** : rien n'est écrasé, il n'y a rien à confirmer. Elle ne restaure pas non plus les réglages (cibles, preset, TDEE) — un fichier de données n'a pas à changer le protocole en cours.
  - Le résumé est calculé **avant** `setData` : un updater React doit rester pur, et React peut le rejouer.
  - `BackupCard` dépassait les 80 lignes avec un troisième bouton → `BackupButton.jsx` extrait (react-rules §3).
  - 8 tests ajoutés.
- **Réversibilité** : Facile. Fonction pure additive ; le chemin de restauration existant n'a pas été touché.

### 2026-08-03 — L'export publie le protocole en vigueur
- **Décision** : Ajouter une ligne `🎯 Preset / Cibles TRAIN-OFF-WE / plancher protéines / objectif de pas` sous la ligne de diagnostic, plus le nombre de jours de chantier de la fenêtre à côté de la période.
- **Contexte** : Le rapport publiait des mesures sans dire à quoi elles étaient censées obéir. Un lecteur extérieur — ou un coach — devait deviner le preset, ou se fier à des chiffres mémorisés hors de l'app.
- **Alternatives considérées** : Demander à l'utilisateur de préciser son réglage à côté du rapport. Écarté : c'est confier à une saisie humaine faillible la donnée la plus structurante du document, et elle périme à chaque recalibration.
- **Raison du choix** : Cas concret qui tranche — le preset **Sèche forte impose 170 g de protéines et non 160**. Un lecteur travaillant de mémoire applique le mauvais plancher sans jamais s'en apercevoir. Les cibles sont **lues** depuis `data.targets` et jamais recalculées : la source de vérité reste le state, sans quoi le rapport pourrait annoncer un réglage que l'app ne sert pas.
- **Impact** :
  - Dégradation propre sur un state incomplet (`TRAIN —`) plutôt qu'un export cassé.
  - **Régression corrigée au passage** : le prédicat de non-vacuité de la semaine ignorait le sommeil et la dépense en kcal, alors que celui du jour les comptait. Une semaine où seules les nuits étaient renseignées s'annonçait « Aucune donnée saisie pour cette semaine » tout en listant ses relevés. Prédicat `hasAnyData` unique, partagé par les deux appels.
  - 12 tests ajoutés.
- **Réversibilité** : Facile.

### 2026-07-30 — Refus d'une page d'accueil : bande d'état dans `TodayView`
- **Décision** : Ne PAS créer d'écran d'accueil ni de cinquième onglet. Le jour à renseigner reste l'écran d'atterrissage. Les diagnostics existants (`plateauProtocol`, `neatDrift`, `adaptiveTDEE`) sont remontés en une **bande d'état** en haut de `TodayView`, affichée sur le jour courant uniquement, qui publie **un verdict et une ligne de mesure**, et renvoie vers `WeekView` d'un tap.
- **Contexte** : Le développeur trouvait pratique de tomber directement sur la saisie, mais voulait « une page d'accueil montrant les tendances ou mon état de forme actuel » — en demandant explicitement qu'on lui dise si l'idée était mauvaise.
- **Alternatives considérées** : (A) une vraie page d'accueil / 5e onglet devenant l'écran d'atterrissage ; (B) ne rien changer ; (C) la bande d'état — retenue.
- **Raison du choix** : (A) coûte un tap sur **100 % des ouvertures** pour servir une information consultée une fois par semaine, dans une app dont `TodayView` est le seul écran où l'on *produit* de la donnée ; et elle serait un **troisième** rendu des mêmes chiffres, après `WeekView` qui contient déjà `DiagnosisCard`, `NeatCard`, `KcalTrendCard`, `WeightCard`, `AveragesCard` — trois endroits à garder cohérents. (B) laisse intact le vrai défaut, qui n'est pas l'absence d'une page : l'intelligence du produit est **muette**. `diagnose()` et `diagnoseNeat()` ne vivent que dans un onglet qu'il faut penser à ouvrir, alors que le cas terrain fondateur de R3 est précisément celui qu'on n'ouvre pas (pas effondrés de 62 % pendant deux mois sans signal). Un diagnostic qui attend qu'on vienne le chercher n'est pas un diagnostic.
- **Impact** :
  - Nouveau module pur `utils/vibeStatus.js` : `summarizeStatus()` **ne recalcule rien**, il arbitre entre deux diagnostics déjà produits et réécrit leur `detail` en version courte. Ordre de priorité documenté dans le fichier ; le point non évident est que la **rétention d'eau passe avant les avertissements** — son rôle étant de bloquer une coupe calorique injustifiée, la taire au profit d'un signal plus alarmant produirait exactement la décision qu'elle interdit.
  - `hooks/useVibeStatus.js` rejoue `usePlateauDiagnosis` et `useNeatDrift` avec la **même** résolution de cibles que `useWeekStats` (`targets ?? DEFAULT_TARGETS`). C'est la condition pour que la bande et l'onglet Semaine ne puissent jamais annoncer deux diagnostics différents — la duplication redoutée en (A) est écartée par construction, pas par vigilance.
  - Règle de non-duplication tenue : la bande affiche la **conclusion**, plus le couple tendance/TDEE ; jamais un chiffre que `WeekView` montre déjà en grand.
  - Deux silences volontaires : masquée en feuilletant le journal sur un jour passé (`isToday`, ajouté à `useDayMetrics` — elle parle de MAINTENANT), et masquée entièrement sur installation neuve (`summarizeStatus` retourne `null` sans le moindre chiffre) plutôt que d'occuper l'écran avec un statut vide au-dessus de la saisie.
  - `extractSignals` est désormais évalué 3× par rendu de `TodayView`. Balayage de 30 jours en mémoire, déjà payé 2× par `WeekView` : mutualiser exigerait de réécrire les deux hooks existants pour un gain non mesurable.
  - 10 tests ajoutés (106 au total).
- **Réversibilité** : Facile. La bande est un composant + un hook + un util, branchés en une ligne dans `TodayView` ; aucun diagnostic existant n'a été modifié.

### 2026-07-30 — Tracé de tendance : la signature « valeur contre cible » étendue au temps
- **Décision** : Doter la bande d'état d'un **tracé** (`ui/Sparkline.jsx`) opposant le poids lissé 30 jours à la **trajectoire prévue par le preset**. Premier graphique de série temporelle du projet.
- **Contexte** : Demande explicite de vérifier la cohérence de la bande avec la DA, quitte à créer des graphiques inexistants jusqu'ici. L'audit a donné raison à la demande : la bande livrée au tour précédent était un rectangle à bordure colorée avec trois lignes de texte — l'élément le **moins** VibeFit de l'app. La signature du projet (piste/anneau lumineux + marqueur de cible, DESIGN.md §4) en était totalement absente, et la tendance de poids s'affichait en **texte** dans une application où chaque valeur est un tracé qui glowe.
- **Alternatives considérées** : (a) une simple sparkline du poids, sans cible — écartée : elle aurait apporté la forme sans le mécanisme, or c'est le couple *réel contre cible* qui est la signature, pas la courbe ; (b) habiller la bande de glow/sticker sans rien ajouter d'informatif — écarté, c'est du vernis ; (c) ne rien changer.
- **Raison du choix** : `presetWeeklyRate()` existait déjà et fournit le rythme que l'objectif en cours prédit. Le poids était donc la seule métrique du produit qui échappait au mécanisme « valeur contre cible », faute d'une cible exprimée — et elle existait, juste inexploitée. Le marqueur de cible devient une ligne de guide, et **l'écart entre les deux courbes est littéralement la perte de poids qui manque**. Le guide vient de la même source que le libellé de `PresetPickerCard` : il ne peut pas annoncer un rythme différent de l'écran Cibles.
- **Impact** :
  - `extractSignals` expose `weightSeries` (additif). `x` reste l'index réel dans l'horizon de scan : un trou de pesée s'affiche comme un segment plus long, il ne comprime pas le temps.
  - **Plancher d'amplitude `minSpan`** — le paramètre le plus important du composant, et une correction trouvée au rendu seulement. Une échelle qui s'ajuste toujours au contenu ment : un guide « maintenance » écarté de 0,12 kg occupait 40 % de la hauteur et se lisait comme une divergence grave. Sans axe chiffré, rien ne disait au lecteur si l'écart valait 0,1 kg ou 5 kg.
  - **Correction de couleur trouvée par calcul, invisible à l'œil** : en tonalité neutre la courbe devait être `muted`, à ΔE 7.5 du guide `tick` en vision **normale** (seuil dur 15). Deux gris indiscernables, qu'aucun encodage secondaire ne rachète. Passée à `ink` (ΔE 36). La paire `alert`/`tick` reste à ΔE 6.0 en protanopie, tolérable uniquement parce que le guide est tireté.
  - Le tireté est ici légitime alors qu'il est un anti-pattern sur une grille : la ligne *est* une projection.
  - Le point d'arrivée n'est pas un `<circle>` mais un sous-tracé de longueur nulle à bout rond — le viewBox étant étiré en x, un cercle deviendrait une ellipse.
  - La ligne de mesure **cède** la tendance au tracé : la répéter en texte à 3 cm de la courbe serait exactement la duplication refusée à une page d'accueil.
  - Pas de survol/infobulle, contrairement au défaut d'un graphique HTML : la bande est une cible tactile unique vers `WeekView`, où `WeightCard` liste déjà les mêmes pesées en tableau.
  - 5 tests ajoutés (111 au total).
- **Réversibilité** : Facile. `Sparkline` est une primitive `ui/` autonome et paramétrée (`minSpan`, `guide` optionnel) ; la retirer de la bande est une suppression de bloc JSX.

### 2026-05-04 — Pas de state manager externe
- **Décision** : Utiliser uniquement `useState`, `useReducer` et le Context API natif de React.
- **Contexte** : Application de taille modeste (tracker personnel), surcharge cognitive d'une librairie externe non justifiée à ce stade.
- **Alternatives considérées** : Zustand, Jotai, Redux Toolkit.
- **Raison du choix** : Minimalisme de la stack, zéro dépendance supplémentaire, facilité de maintenance solo.
- **Impact** : Toute logique d'état complexe doit être gérée via des custom hooks.
- **Réversibilité** : Moyenne (migration vers Zustand possible sans refactoring total).

### 2026-05-04 — Vite comme build tool
- **Décision** : Conserver Vite 5 comme bundler principal.
- **Contexte** : Déjà en place à l'initialisation du projet.
- **Alternatives considérées** : Create React App (déprécié), Parcel.
- **Raison du choix** : DX supérieur (HMR ultra-rapide), taille de bundle optimisée, support ESM natif.
- **Impact** : Configuration dans `vite.config.js`.
- **Réversibilité** : Difficile.

### 2026-05-04 — Déploiement Netlify
- **Décision** : Déployer sur Netlify via `netlify.toml`.
- **Contexte** : Fichier `netlify.toml` présent dès le commit initial.
- **Alternatives considérées** : Vercel, GitHub Pages.
- **Raison du choix** : Configuration déjà en place, tier gratuit suffisant.
- **Impact** : Le build command est `vite build`, output dir `dist`.
- **Réversibilité** : Facile.

### 2026-05-04 — Architecture Local First (0 DB cloud)
- **Décision** : L'application est totalement autonome. Aucune donnée ne quitte l'appareil sans action explicite de l'utilisateur (bouton export).
- **Contexte** : Tracker personnel, données de santé sensibles, volonté de simplicité maximale.
- **Alternatives considérées** : Firebase Firestore, Supabase, PocketBase.
- **Raison du choix** : Zéro RGPD, zéro backend, zéro coût d'infra, zéro latence réseau. `localStorage` + export/import JSON suffisent pour un usage solo.
- **Impact** : `useVibefitStorage` est le seul point de persistance. La clé `vibefit_v1` dans localStorage est l'unique source de vérité.
- **Réversibilité** : Moyenne (migration possible vers une DB si multi-device requis un jour).

### 2026-05-04 — Architecture modulaire (refactoring du monolithe)
- **Décision** : Découper `App.jsx` (1478 lignes) en modules cohérents selon Clean Architecture.
- **Contexte** : Le monolithe devenait difficile à maintenir et à étendre.
- **Alternatives considérées** : Garder le monolithe, utiliser un générateur de structure.
- **Raison du choix** : Séparation stricte constantes / utils / hooks / UI / layout / vues, conforme aux react-rules du projet.
- **Impact** : Structure `src/constants/`, `src/utils/`, `src/hooks/`, `src/models/`, `src/components/ui/`, `src/components/layout/`, `src/components/views/`.
- **Réversibilité** : Facile (imports directs, pas de magie).

### 2026-05-04 — Feature Freeze V1.0 & entrée en phase RUN
- **Décision** : Gel immédiat et total de toutes les nouvelles fonctionnalités. VibeFit V1.0 est déclaré **Golden Master**. Le produit entre en cycle de test terrain intensif (RUN) pour une durée minimale de 4 semaines, jusqu'au 2026-06-01.
- **Contexte** : Le scope V1.0 est complet — tracker quotidien, WeekView analytique, poids, backup JSON, PWA offline-first, gestion des objectifs. Aucun bug bloquant connu. Le produit est prêt pour une évaluation en conditions réelles.
- **Alternatives considérées** : Continuer à itérer (historique graphique multi-semaines, notifications), lancer une bêta ouverte.
- **Raison du choix** : Toute fonctionnalité ajoutée avant test terrain est du gaspillage potentiel. La priorité est de valider les hypothèses d'usage réel avant d'investir davantage.
- **Impact** :
  - Aucune PR de feature ne sera mergée avant la fin du cycle RUN.
  - Les bugs critiques (perte de données, crash) restent éligibles à un patch d'urgence.
  - Le backlog post-RUN est documenté dans `2_project_overview.md`.
- **Réversibilité** : Facile (décision de process, non technique — peut être levée à tout moment par décision explicite).

### 2026-07-30 — Direction artistique « Millimétré » & DESIGN.md
- **Décision** : Figer une direction visuelle propre à VibeFit, registre *instrument de mesure*, et la persister dans `DESIGN.md` à la racine — document **prescriptif**, relu avant toute tâche UI. Palette gris froid + vert instrument, typographie Archivo / IBM Plex Sans / IBM Plex Mono auto-hébergée, signature « règle graduée ».
- **Contexte** : Le système visuel V1 violait deux interdits explicites du développeur — fond crème `#F6F2EC` + accent orange `#FF5A1F` (le pairing crème/terracotta refusé), et `Inter Tight` comme police de corps (Inter est banni). Il n'existait aucun document de direction : la charte se redonnait à chaque session.
- **Alternatives considérées** : (A) « Millimétré » clair et froid, signature = règle graduée ; (B) « Console » sombre, signature = trace OLS brute sur nuage de points ; (C) « Fiche clinique » typographique, signature = chiffre géant + marginalia. Également considéré : ne produire que `DESIGN.md` sans toucher au code, et un re-skin complet des 4 vues.
- **Raison du choix** : (A) tient WCAG AA le plus facilement, reste clair-first pour un usage diurne, et sa signature est la plus ancrée dans le sujet (mesurer un corps dans le temps) donc la moins générique. (B) était la plus distinctive mais aussi la plus proche du cliché « dashboard terminal ». (C) est fragile sur des écrans très denses.
- **Impact** :
  - `PALETTE` reste la source de vérité unique. Les clés `accent` / `accentDark` sont **supprimées** : leur sémantique était ambiguë (à la fois emphase décorative et « hors cible »). Leurs 37 sites d'appel ont été routés explicitement vers `deep` / `warn` / `alert` / `slate` / `ink`.
  - Nouvelle règle de couleur, à tenir : `deep` = dans la cible, `warn` = **manque**, `alert` = **hors bornes**. Un manque ordinaire n'est pas une alerte — diluer `alert` lui retire sa valeur de signal.
  - `tick` est séparé de `line` (WCAG 1.4.11 : les graduations portent l'information, ≥ 3:1 requis).
  - Polices auto-hébergées dans `public/fonts` : les 2 règles `runtimeCaching` Google Fonts de `vite.config.js` et le `<link>` CDN d'`index.html` sont retirés, devenus morts.
  - Zéro `box-shadow` dans le projet ; rayons ramenés à 0 / 2 / 3.
  - Cibles tactiles portées à ≥ 44 px partout (`NumberInput`, `Pill`, chrome du header).
- **Réversibilité** : Moyenne. Changer de palette ou de typo reste peu coûteux (tokens centralisés, 3 classes typographiques). Revenir sur la signature « règle graduée » demanderait de réécrire `Bar.jsx` et `BalanceRing.jsx`.

### 2026-07-30 — Rejet de « Millimétré », nouvelle direction « Signal » (dark, glow, référence Whoop)
- **Décision** : Abandonner la direction « Millimétré » (entrée ci-dessus, livrée le même jour) et la remplacer intégralement par « Signal » — dark-first presque noir, couleurs d'état saturées avec **glow** (halo coloré), anneaux et pistes à bouts ronds. Registre explicitement calqué sur Whoop. `DESIGN.md` réécrit en totalité, pas complété : ce n'est pas une variante de la direction précédente.
- **Contexte** : Au premier rendu de « Millimétré », le développeur l'a jugée « triste et froide », sans rapport avec une application moderne, et a cité Whoop comme référence explicite. C'est le développeur lui-même qui avait guidé la direction précédente (choix « Instrument de mesure » / palette froide) — le retour n'était donc pas une question mal comprise mais un jugement sur le résultat une fois vu en vrai, ce que la palette de propositions textuelles en amont n'avait pas permis de tester.
- **Alternatives considérées** : Ajuster « Millimétré » en surface (juste assombrir la palette en gardant la règle graduée) plutôt que changer de signature. Écarté : la règle graduée (bouts droits, ticks fins, aucun remplissage plein) est intrinsèquement le contraire du langage visuel Whoop (arcs épais à bouts ronds, glow). Un compromis aurait produit un entre-deux sans identité claire plutôt que la direction demandée.
- **Raison du choix** : Whoop est une référence nommée et non ambiguë (contrairement à un round de « 2-3 directions contrastées » sans référence) — le travail devient de traduire fidèlement cette référence dans le vocabulaire de VibeFit (macros/calories *contre une cible*, ce que Whoop ne fait pas) plutôt que d'en inventer une nouvelle.
- **Impact** :
  - `PALETTE` renommée en profondeur : `paper`→`bg`, `highlight` supprimé (routé vers `warnSoft`/`alertSoft` selon contexte), couleurs d'état resaturées pour glow (green `#2FEA7A` / amber `#FFB020` / red `#FF4D5E`), rampe catégorielle passée à blue/purple.
  - Nouveau helper `glow(hex, size)` dans `config.js` — halo `box-shadow` teinté par l'état, utilisé sur pills actives, pistes non nulles, onglet actif.
  - Rayons inversés : l'ancienne règle « 0/2/3 uniquement » est remplacée par 12–20px + `999` (rond complet) sur pistes/chips. Bouts de tracé passés de `butt` à `round`.
  - `BalanceRing` et `Bar` réécrits : l'ancienne « règle graduée » (graduations physiques, encoche gravée) devient une piste/anneau plein qui glowe, avec un marqueur de cible plus discret — la seule pièce conservée de l'ancienne signature, car propre à VibeFit (Whoop n'a pas de cible fixe).
  - `PALETTE.ink`/`PALETTE.inkSoft` inversent de rôle par rapport à avant (ink devient le texte quasi-blanc, inkSoft le texte sur remplissage saturé) — tous les sites `color: PALETTE.surface` utilisés comme "texte clair sur fond sombre" dans l'ancienne palette ont dû être réaudités un par un, pas remplacés en masse, car `surface` a changé de luminance (clair → sombre) entre les deux directions.
  - Contraste AA revérifié intégralement sur la nouvelle palette (paires bg/surface/états + texte sur remplissage saturé) ; cibles tactiles ≥44px reconfirmées après le passage aux nouveaux rayons.
- **Réversibilité** : Moyenne, comme la décision précédente. Le coût dominant n'est pas le remplacement de valeurs (tokens centralisés) mais l'audit ligne à ligne des usages sémantiquement ambigus (`PALETTE.surface` comme couleur de texte) qu'un renommage global aurait cassés silencieusement.

### 2026-07-30 — Troisième direction « Los Santos Dusk » (San Andreas / Cali 90s / hip-hop / ciné 80s / streetwear)
- **Décision** : Remplacer « Signal » (Whoop, dark neutre) par « Los Santos Dusk » — palette détournée des couleurs de gang de GTA San Andreas (vert Grove Street = dans la cible, gold Vagos = manque, néon coucher-de-soleil = hors bornes), fond presque noir mais CHAUD (violet de crépuscule, pas neutre), header en dégradé coucher de soleil avec skyline/palmiers en silhouette, nouvelle fonte hero (Anton, poster condensé) pour le wordmark et les gros chiffres, ombre dure « sticker » en complément du glow. `DESIGN.md` réécrit en totalité pour la 3e fois de la journée.
- **Contexte** : Contrairement aux deux tours précédents, ce n'est pas un rejet du rendu précédent — c'est le développeur qui a explicitement demandé d'aller plus loin, en donnant sa propre référence personnelle plutôt qu'une catégorie de produit : « GTA San Andreas, la Californie des années 90 », l'architecture, le hip-hop, les couleurs du cinéma 80s, le streetwear actuel, formulé comme un test délibéré de la capacité à pousser une direction artistique.
- **Alternatives considérées** : Traiter la demande comme un ajustement de palette sur « Signal » (juste recolorer en orange/violet en gardant l'anneau neutre). Écarté : la demande porte explicitement sur une identité culturelle entière (architecture, typographie de rue, motifs), pas une teinte — un simple recolorage aurait manqué l'essentiel de ce qui était demandé et le sens du test posé par le développeur.
- **Raison du choix** : Les couleurs de gang du jeu (vert Grove Street, gold/purple Vagos/Ballas) mappent directement et sans forcer sur la sémantique déjà en place (bon/manque/hors-bornes), ce qui a permis de traduire la référence sans sacrifier l'utilisabilité déjà obtenue au tour précédent — le point de friction identifié au tour « Signal » (protéger le mécanisme fonctionnel d'un changement d'habillage esthétique) s'est reproduit à l'identique et a été résolu de la même manière : renommer les valeurs des tokens, jamais leur rôle.
- **Impact** :
  - `PALETTE` : mêmes noms de tokens qu'à « Signal » (aucun renommage cette fois — leçon retenue du tour précédent), seules les valeurs hex changent. Élimine le risque d'audit ligne-à-ligne qui avait coûté cher au tour précédent.
  - Nouveau token décoratif `SUNSET` (dégradé) — explicitement documenté comme réservé aux surfaces non-textuelles après vérification que le texte échoue l'AA sur le milieu/bas du dégradé (2.29:1).
  - Nouvelle fonte auto-hébergée : Anton (1 graisse, 2 sous-ensembles, ~50 Ko), nouveau rôle typographique `.vf-hero` réservé aux gros chiffres/wordmark — ne remplace pas Archivo, s'ajoute.
  - Nouveau helper `sticker(hex, offset)` dans `config.js` — ombre dure décalée, combiné au `glow()` existant sur les pills actives de `DayTypeSwitcher`.
  - `Header.jsx` : composant `Skyline` (silhouette immeubles + palmiers en SVG inline) ajouté, fond passé au dégradé `SUNSET`.
  - PWA (favicon, apple-touch-icon, `pwa-icon.svg`) : nouveau motif disque-soleil en dégradé + palmier, remplace l'ancien anneau vert.
  - Ballas purple éclairci de la teinte de gang réelle (`#9354D9`, 4.04:1) vers `#B27CE8` (6.22:1) pour passer l'AA en texte — la fidélité à la référence s'arrête là où elle casserait l'accessibilité.
- **Réversibilité** : Facile pour la couleur (tokens identiques, hex à remplacer) ; moyenne pour les motifs (`Skyline`, grain, sticker) qui sont des ajouts de composants/CSS, pas de simples valeurs.

### 2026-07-30 — Refonte typographique de « Los Santos Dusk » : 5 rôles, sortie d'IBM Plex, blackletter
- **Décision** : Porter le système typographique de 4 à 5 rôles et **retirer IBM Plex Sans/Mono**. Nouveau rôle `.vf-gothic` en blackletter (UnifrakturCook), `.vf-display` passé d'Archivo variable @900 à **Archivo Black** (famille distincte, plus large), corps passé à **Barlow**, données à **Azeret Mono**. Ajout d'un utilitaire `.vf-chrome` (dégradé argent clippé sur le texte) pour le wordmark.
- **Contexte** : Le développeur a validé la direction visuelle mais jugé que la typographie ne portait pas encore l'ADN hip-hop LA. Constat à l'audit qui lui donne raison de façon très concrète : `.vf-body` et `.vf-mono` étaient encore **IBM Plex**, un reliquat de la première direction (« instrument de labo ») ayant survécu à deux re-directions complètes. Autrement dit la police corporate d'IBM composait encore 80 % du texte réellement lu dans une app d'univers californien — Anton ne couvrait que les gros chiffres.
- **Alternatives considérées** : (a) N'ajouter qu'une fonte d'accent et garder IBM Plex en corps — écarté, c'est précisément le vernis dénoncé. (b) Utiliser une police graffiti/tag — **refusé explicitement** : illisible en français accentué, et l'effet « déguisement » nuit à la crédibilité de la direction plutôt qu'il ne la sert. (c) Garder Archivo variable pour le display — écarté, trop étroit pour l'effet flocage-de-maillot recherché ; Archivo Black est une famille distincte et sensiblement plus large.
- **Raison du choix** : Le blackletter est l'ADN typographique le plus identifiable de Los Angeles (*The Chronic*, Cypress Hill, plaques de clubs lowrider, tatouage chicano) — c'est le manque le plus criant. Barlow apporte un grotesque de signalétique à faible contraste, plus chaud que Plex. Le découpage en 5 rôles garde chaque fonte dans un emploi où elle est lisible : c'est ce qui permet d'utiliser du blackletter sans casser l'app.
- **Impact** :
  - Poids : 13 fichiers woff2 / 276 Ko (contre 11 / 268 Ko) — +8 Ko seulement pour 5 familles au lieu de 4, en supprimant Plex (6 fichiers) et Archivo variable (2), et en n'embarquant que 400/600/700 pour Barlow (le font-matching CSS redescend sur 400 pour un `font-weight: 500`).
  - **Nouvelle règle à tenir** : ne jamais écrire de `fontWeight` inline sur un élément `.vf-hero` ou `.vf-display`. Anton et Archivo Black n'ont qu'une graisse réelle (400) et un style inline gagne sur la classe — un `fontWeight: 900` résiduel produit un faux gras synthétique baveux. Les 11 sites convertis ont eu leur `fontWeight` retiré explicitement.
  - **Régression trouvée au rendu, pas au build** : Archivo Black étant nettement plus large, la légende centrale de `BalanceRing` (« SOUS LA CIBLE », pire cas à 13 caractères) passait à 101 px pour 92 px de passage libre et mordait sur l'arc. Mesurée au `getBBox()` en navigateur puis redimensionnée (`fontSize: 9`, `letterSpacing: 0.05em` → 82.9 px). Aucun test ni build ne pouvait détecter ça.
  - `.vf-chrome` porte un risque de disparition : `color: transparent` sans `background-clip: text` supporté rendrait le wordmark invisible. Encadré par un `@supports`, avec couleur pleine en défaut (13.43:1 sur le header).
  - Blackletter volontairement limité à 3 emplacements (wordmark, nom de preset, date de semaine) — casse mixte obligatoire, ≥16px. Pire cas testé : « Diet Break (Vacances) », 21 caractères, tient sur une ligne.
- **Réversibilité** : Facile. Les 5 rôles sont des classes CSS dans un seul fichier (`FontStyles.jsx`) et les `@font-face` dans un autre (`fonts.css`) : changer une famille = changer une ligne. La seule contrainte à ne pas oublier en cas de substitution est la vérification de largeur sur les libellés contraints (cf. `BalanceRing`).

---
