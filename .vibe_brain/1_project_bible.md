---
status: LECTURE SEULE — ne jamais modifier ce fichier
---

# 📖 Project Bible — VibeFit

## Vision du produit
VibeFit est une application web de recomposition corporelle. Elle permet un tracking quotidien de l'entraînement, de la nutrition et de la progression physique.

## Stack technique
| Couche | Technologie |
|--------|------------|
| UI | React 18 (composants fonctionnels) |
| Build | Vite 5 |
| Icons | Lucide React |
| Deploy | Netlify |
| Langage | JavaScript (ESM) |

## Principes fondateurs
1. **Simplicité d'abord** — pas de sur-ingénierie, pas de librairies superflues.
2. **Performance** — bundle minimal, chargement instantané sur mobile.
3. **Offline-first** — l'utilisateur doit pouvoir logger sans connexion.
4. **Données privées** — aucune donnée personnelle ne quitte l'appareil sans consentement explicite.

## Contraintes non négociables
- Zéro dépendance de state management externe (pas de Redux, Zustand, etc.) sauf décision documentée dans `4_business_decisions.md`.
- Accessibilité WCAG AA minimum sur tous les écrans.
- Aucune suppression de fichier sans accord explicite du développeur.

## Cible utilisateur
Adultes 20-40 ans pratiquant la musculation ou le fitness, souhaitant suivre leur progression sans friction.
