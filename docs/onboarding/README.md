# Onboarding d'une flotte — modèle Excel

`modele-onboarding-flotte.xlsx` est la fiche à remplir pour enregistrer une
entreprise et sa flotte sur Pièces. Le même fichier sert à importer les
**véhicules** et les **chauffeurs** depuis le tableau de bord entreprise.

## Onglets

| Onglet | Usage |
|---|---|
| **Mode d'emploi** | Marche à suivre + règles de saisie |
| **Entreprise** | Coordonnées de l'entreprise (renseignées une fois) |
| **Véhicules** | Une ligne par véhicule (marque, modèle, année obligatoires) |
| **Chauffeurs** | Une ligne par chauffeur (nom et téléphone obligatoires) |

Les indices de saisie sont en **commentaires de cellule** (survol) ; les données
commencent en ligne 2 pour que le fichier soit importable directement.

## Ordre d'import recommandé

1. **Chauffeurs d'abord** — tableau de bord → *Chauffeurs → Importer*.
   Téléphone au format `+225XXXXXXXXXX` ; les doublons de numéro sont signalés
   et ignorés.
2. **Véhicules ensuite** — *Véhicules → Importer*.
   La colonne **« Chauffeur attitré »** crée l'affectation chauffeur ↔ véhicule
   automatiquement, par correspondance de nom. Un nom introuvable est signalé
   ligne par ligne, mais le véhicule est tout de même créé.

CSV également accepté (en-têtes en français ou en anglais). Les lignes invalides
sont rapportées une par une ; les lignes valides sont créées normalement.

## Régénérer le modèle

```bash
python3 docs/onboarding/build_template.py
```

Le script écrit le fichier dans `docs/onboarding/` **et** dans
`apps/web/public/` (servi en téléchargement depuis la page d'import).
