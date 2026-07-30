<p class="eyebrow">Référentiel logistique</p>

# Familles de pièces — poids & volumes

<p class="deck">Référentiel des 17 groupes de pièces détachées utilisés par le moteur d'arbitrage de logistique.pieces.ci : fourchettes de poids et de volume, poids taxable, restrictions aériennes.</p>

<div class="callout">
<p class="lead">Le devis logistique ne peut pas attendre que le client <strong>pèse sa pièce</strong>.</p>
<p>On code un référentiel de familles avec fourchettes, et on facture au poids taxable. Chaque envoi réel réalimente le référentiel : la marge d'erreur se resserre avec le volume.</p>
</div>

## Règles de taxation

Le transporteur facture le maximum entre le poids réel et le volume converti :

- **Aérien** : `poids taxable = max(poids réel, L×l×h cm ÷ 6000)` — soit **1 m³ = 167 kg** (1 dm³ = 0,167 kg).
- **Maritime groupé (LCL)** : `max(poids réel en tonnes, volume en m³)` — **1 m³ = 1 t** (1 dm³ = 1 kg).
- **Local / pré-positionné** : poids réel, frais de manutention forfaitaires.

La colonne « Poste dominant » indique, en prenant la borne haute de chaque fourchette, si la famille est facturée au poids ou au volume en fret aérien — c'est ce qui détermine l'économie de l'envoi.

## Les 17 familles

| # | Famille | Poids (kg) | Volume (dm³) | Taxable aérien (kg, max) | Poste dominant | Contraintes |
|---|---------|-----------|--------------|--------------------------|----------------|-------------|
| 1 | **Filtres** (huile, air, habitacle) | 0,2 – 1,5 | 1 – 6 | 1,5 | Poids | — |
| 2 | **Plaquettes de frein** (jeu) | 1,5 – 4 | 2 – 4 | 4 | Poids | — |
| 3 | **Disques de frein** (paire) | 8 – 14 | 8 – 14 | 14 | Poids | — |
| 4 | **Amortisseur** (unité) | 3 – 6 | 10 – 18 | 6 | Poids | ⚠️ Restreint aérien (gaz) |
| 5 | **Train roulant** (bras, rotule, silentbloc, roulement) | 2 – 9 | 5 – 20 | 9 | Poids | — |
| 6 | **Alternateur / démarreur** | 3 – 8 | 6 – 12 | 8 | Poids | — |
| 7 | **Kit embrayage** | 8 – 14 | 12 – 20 | 14 | Poids | — |
| 8 | **Radiateur / condenseur** | 5 – 10 | 40 – 70 | 11,7 | Volume | — |
| 9 | **Phare / optique** | 2 – 5 | 25 – 45 | 7,5 | Volume | ⚠️ Fragile |
| 10 | **Pare-chocs** | 5 – 9 | 150 – 250 | 41,7 | Volume (×4,6) | — |
| 11 | **Capot / aile / portière** | 10 – 20 | 120 – 300 | 50 | Volume (×2,5) | — |
| 12 | **Pare-brise / vitrage** | 12 – 20 | 60 – 100 | 20 | Poids | ⚠️ Fragile |
| 13 | **Batterie de démarrage** | 14 – 22 | 12 – 18 | 22 | Poids | ⚠️ Restreint aérien |
| 14 | **Pneumatique** | 8 – 14 | 60 – 90 | 15 | Volume | — |
| 15 | **Boîte de vitesses** | 45 – 90 | 90 – 150 | 90 | Poids | — |
| 16 | **Moteur complet** | 120 – 250 | 250 – 400 | 250 | Poids | — |
| 17 | **Composant haute tension (EV)** — onduleur, chargeur embarqué, convertisseur | 5 – 40 | 20 – 120 | 40 | Poids | ⚠️ Restreint aérien |

**Taxable aérien (kg, max)** : poids taxable maximal en fret aérien, soit `max(poids max, volume max ÷ 6)`. Quand le volume domine, la colonne indique le facteur de multiplication du poids facturé vs le poids réel.

Pièce ne correspondant à aucune famille : gabarit moyen par défaut — **3 – 12 kg / 10 – 40 dm³** (confiance « famille », estimation ± 20 % affichée au client).

## Contraintes spécifiques

- **Restreint aérien** (`airRestricted`) : batteries de démarrage, composants haute tension EV, amortisseurs à gaz — interdits ou fortement surtaxés en fret aérien ; à confirmer avec le transitaire avant tout devis. Le moteur affiche l'avertissement « Matière restreinte en fret aérien » sur les options aériennes concernées.
- **Fragile** : phares / optiques, pare-brise et vitrages — emballage renforcé et assurance recommandés sur tout envoi importé.
- **Sans marché de la casse** : les composants haute tension EV (onduleur, chargeur embarqué, câblage HV) sont chers, spécifiques, et absents du marché de l'occasion — candidats prioritaires au pré-positionnement maritime.

## Niveaux de confiance de l'estimation

Trois niveaux, affichés au client dans la matrice d'arbitrage :

1. **`MEASURED`** — la pièce a été pesée sur un envoi précédent ; le devis peut être instantané et ferme.
2. **`CATALOG`** — fiche technique fournisseur.
3. **`FAMILY`** — fourchette du référentiel ci-dessus ; affiché « estimation, ± 20 % », jamais un prix ferme présenté comme ferme.

Chaque envoi réel fait passer les familles concernées de `FAMILY` vers `MEASURED` : le référentiel est un actif qui se construit tout seul.

## En pratique — ce que la table change sur l'arbitrage

- **Les pièces volumineuses pénalisent l'aérien, pas le maritime.** Un pare-chocs de 9 kg est facturé 41,7 kg en avion mais 0,25 m³ en groupé — c'est la famille où le maritime groupé écrase le plus l'aérien. Pare-chocs, capots, ailes, portières et pneus : à importer **par anticipation, en LCL**.
- **Les pièces denses voyagent mal en bateau, bien en avion.** Moteurs, boîtes, alternateurs, batteries : facturés au poids réel dans les deux cas, le surcoût aérien est limité au différentiel du tarif au kg.
- **Les 3 familles à restriction aérienne verrouillent le réactif.** Si une batterie de traction ou un amortisseur à gaz ne passe pas en fret aérien, il n'y a pas d'option rapide — le pré-positionnement devient la seule réponse possible.

## Référence technique

Source de vérité du référentiel : `packages/shared/constants/logistics.ts` (`PART_LOGISTICS_FAMILIES`, `chargeableWeightKg`, `computeArbitrageMatrix`). Spécification complète du service : `docs/logistique-as-a-service.md` (§3 « Codification poids / volume »). Fourchettes à affiner avec les premiers envois réels (phase 1 livrée, juillet 2026).

_Document interne Pièces — logistique.pieces.ci · Référentiel v1 · Juillet 2026_
