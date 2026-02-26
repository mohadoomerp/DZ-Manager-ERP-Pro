# Version exécutive — DZ-Manager-ERP-Pro

## Résumé (1 minute)
DZ-Manager-ERP-Pro est une application ERP front-end ambitieuse (React + TypeScript) avec une forte couverture métier locale (vente, stock, RH, finance, CRM, événements), un mode PWA et des capacités IA. Le produit a un bon potentiel, mais sa base technique doit être consolidée rapidement pour éviter un ralentissement des évolutions.

## Ce qui fonctionne bien
- Large couverture fonctionnelle ERP déjà en place.
- Orientation marché algérien pertinente (parcours métiers et fiscalité locale).
- Support multilingue et logique de rôles/permissions.
- Approche offline-first avec persistance locale.

## Risques majeurs identifiés
1. **Architecture trop centralisée** : une grande partie de la logique est concentrée dans `App.tsx`.
2. **Structure du code dupliquée** : coexistence de versions racine et `src/`.
3. **Pipeline build ambigu** : build très léger, signe possible d’un point d’entrée mal aligné.
4. **Sync réseau simplifiée** : résolution de conflits basée surtout sur timestamp.
5. **Sécurité opérationnelle** : données sensibles gérées côté client sans garde-fous avancés.

## Recommandations prioritaires (90 jours)
### 0–30 jours (stabilisation)
- Unifier l’arborescence et clarifier l’unique point d’entrée Vite.
- Décomposer `App.tsx` en modules (state, sync, persistance, auth).
- Ajouter checks CI minimum: typecheck + build.

### 30–60 jours (fiabilisation)
- Introduire un store central (ex: Zustand/Redux Toolkit).
- Formaliser la sync (stratégie de conflits, cas réseau dégradé, tests).
- Renforcer la politique de configuration/secrets.

### 60–90 jours (scalabilité)
- Mettre en place tests ciblés sur flux critiques (facturation, sync, RH).
- Documenter architecture et conventions de contribution.
- Préparer une roadmap produit/tech unifiée.

## Décision recommandée
**Prioriser la dette technique structurante avant d’ajouter de nouveaux modules métier.** C’est la voie la plus rapide pour améliorer fiabilité, vitesse d’exécution et capacité d’évolution.
