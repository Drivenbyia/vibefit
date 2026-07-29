# Configuration et Protocoles de Sécurité Claude Code
- Protocole anti-suppression : Interdiction formelle de supprimer des fichiers ou du code sans accord explicite.
- Optimisation des tokens : Interdiction de lire la documentation ou de lister des répertoires entiers aveuglément. Force l'utilisation de `grep` pour trouver les références.
- Règle d'Architecture : Tu DOIS lire le fichier `.vibe_brain/4_business_decisions.md` avant toute proposition architecturale.

# Sécurité des fichiers .vibe_brain
- 1_project_bible.md : LECTURE SEULE.
- 2_project_overview.md : AUTO-SAVE & UPDATE (maintiens l'état du projet à jour ici ; inclus la mise à jour dans le commit de travail de fin de session, jamais dans un commit séparé).
- 3_dev_journal.md : APPEND ONLY (ajoute tes notes de session uniquement à la fin du fichier).

# Bypass Permissions
- Exécution silencieuse autorisée pour les linters et tests : `npm run lint`, `npx eslint`, `npm test` et `git status`.
