# Anarchy Client – site

Site en une page (présentation, modules, dashboard) écrit en TypeScript.

## Structure
- `src/index.html` : markup et styles (la page finale en est générée)
- `src/main.ts` : navigation, modules, dashboard, offres
- `src/fx.ts` : animations (particules, compteurs, apparitions au scroll, inclinaison 3D, halo)
- `src/data.ts` : **liste des modules et leurs statuts detected / undetected** (à modifier)
- `src/types.ts`, `src/dom.ts` : types et utilitaires
- `dist/index.html` : page prête à héberger (déjà générée)

## Build
Il faut Node.js et TypeScript (`npm i -g typescript` ou `npm i`).

    npm run typecheck   # vérifie les types
    npm run build       # compile et génère dist/index.html

## À brancher
Les données de licence, les prix, les liens de téléchargement et le paiement sont des exemples.
