<p class="eyebrow">Note de cadrage — sourcing international</p>

# Où trouver les pièces que la Côte d'Ivoire n'a pas

<p class="deck">Quel gisement de pièces détachées brancher sur la rubrique « à importer », dans quel ordre, et ce que la douane ivoirienne coûte réellement.</p>

<div class="callout">
<p class="lead">Un seul fournisseur ne couvrira jamais le parc ivoirien : il a <strong>deux couches qui ne se recoupent pas</strong>.</p>
<p>77 % du parc est de l'occasion importée d'Europe — Renault, Peugeot, Citroën, Mercedes. Mais à la vente, Toyota et Suzuki cumulent 84 % des parts. Les gisements européens servent la première couche et ratent la seconde.</p>
</div>

## Ce que la rubrique doit servir

Le parc ivoirien compte plus de 600 000 véhicules, dont environ **77 % d'occasion importée**, majoritairement de France, de Belgique et d'Allemagne. Cette origine décide de la nature du stock de pièces dont nous avons besoin.

Mais le flux de renouvellement raconte autre chose : sur les ventes 2025, **Toyota pèse près de 47 %** du marché et Suzuki occupe la deuxième place — les deux marques cumulant 84 % des parts. Le parc roulant est donc européen par héritage et japonais par tendance.

Conséquence directe sur le sourcing : une source unique nous laisserait aveugles sur la moitié de la demande. L'ordre d'intégration doit suivre cette géographie, pas la taille brute des catalogues.

## Les gisements, classés par intégrabilité réelle

Chaque candidat a été testé techniquement : fichier `robots.txt`, accès effectif à une page, structure des données servies.

| Source | Stock indexé | Accès vérifié | Verdict |
|---|---|---|---|
| **Opisto** (France, 230+ centres VHU) | **12,05 M pièces** | Ouvert — index de recherche public, `robots.txt` permissif, quatre sitemaps, aucune protection anti-robot | **Phase 1** |
| **eBay Motors** (API Browse) | Très large — Allemagne, Royaume-Uni, États-Unis | API officielle et gratuite, avec filtre de compatibilité marque / modèle / année / motorisation | **Phase 2** |
| Ovoko (Baltique, pan-européen) | 32 M pièces, 5 000 vendeurs | Bloqué (Cloudflare, HTTP 403) | Partenariat requis |
| Partsouq (Émirats) | Catalogue OEM mondial | Bloqué (Cloudflare, HTTP 403) | Partenariat requis |
| Amayama (Japon) | OEM japonais neuf | Bloqué (Cloudflare, HTTP 403) ; prix et API explicitement interdits au robot | Partenariat requis |
| UpGarage / Croooober (Japon) | 800 000 articles | Accessible | **Écarté** — catalogue JDM de préparation, pas les pièces d'usure |

## Pourquoi Opisto passe en premier

Ce n'est pas le plus gros catalogue accessible : c'est celui dont les données sont **déjà dans notre format**. Les libellés sont en français, la référence constructeur est présente, la garantie est de 24 mois, et le véhicule compatible est décrit champ par champ.

| Donnée Opisto | Champ Pièces |
|---|---|
| **Libellé français** | `name` — aucune traduction à produire |
| **Marque · modèle · finition · année · code moteur** | `CatalogItemFitment` |
| **Référence constructeur** | `oemReference` |
| **Prix, frais et délais de port** | `price`, délai partenaire |
| **Photo, garantie 24 mois, état** | image, `warranty`, `condition` |
| **Vendeur et localisation** | `Vendor` (centre VHU) |

Le normalizer d'ingestion devient un travail de correspondance, pas d'extraction.

Niveau de prix relevé sur les marques japonaises du parc ivoirien :

| Pièce | Stock disponible | Prix médian | Équivalent FCFA |
|---|---|---|---|
| **Démarreur** | 14 827 | 30 € | ~19 500 F |
| **Alternateur** | 11 753 | 40 € | ~26 000 F |
| **Boîte de vitesses** | 11 313 | 80 € | ~52 500 F |
| **Moteur** | 44 215 | 278 € | ~182 000 F |

Une boîte de vitesses à 52 500 F de coût d'achat laisse de la marge pour le fret, la douane et notre rémunération tout en restant défendable face au marché local.

**La limite à connaître avant de s'engager.** Opisto est un réseau français : son stock épouse le parc français. Les marques présentes dans le parc ivoirien y totalisent 5,94 M pièces, mais la répartition est parlante — Renault 2,07 M, Peugeot 1,61 M, contre **Toyota 306 000 et Suzuki 132 000**. Opisto sert la couche « occasion importée d'Europe » ; il ne sert pas la couche Toyota-Suzuki, qui est la plus vendue. D'où eBay en phase 2, dont le filtre de compatibilité correspond exactement à notre modèle de fitment et dont la base de vendeurs allemands et britanniques est mieux fournie en japonaises.

## Le chemin technique n'est pas le chemin durable

La clé de recherche d'Opisto est publique — le navigateur en a besoin pour afficher le catalogue — et l'interroger est techniquement trivial. Mais chaque requête consomme leur quota de recherche payant, et c'est très probablement contraire à leurs conditions d'utilisation.

Or Opisto exploite **une plateforme B2B destinée aux garages**, et Ovoko déclare ouvertement chercher des débouchés à l'export. Nous sommes exactement le client qu'ils cherchent : un canal de vente en Afrique de l'Ouest.

- **Scraper pour prouver le concept** sur quelques milliers de références, mesurer la conversion réelle, établir le panier moyen.
- **Ouvrir la discussion partenariat avant d'en dépendre.** Un accord supprime le risque juridique, survit au prochain changement de leur interface, et surtout donne accès aux **poids réels** — le fret est notre premier poste de coût et Opisto ne publie pas les poids.

## Ce que la douane coûte vraiment

Le taux de 20 % utilisé aujourd'hui dans notre moteur de tarification était un ordre de grandeur de cadrage. Le tarif officiel de la Direction générale des douanes, à jour du **27 mars 2026**, donne des chiffres nettement plus favorables.

| Nature de la pièce | Position | Droit de douane |
|---|---|---|
| **Freins, boîtes, suspension, radiateurs, embrayages, direction, carrosserie, vitrages, roues, ceintures, airbags** | 8708 | **10 %** |
| **Filtres à huile, à air, à carburant** | 8421 | **5 %** |
| **Bougies, démarreurs, alternateurs, bobines** | 8511 | **10 %** |
| **Moteurs diesel, parties de moteurs, pompes, engrenages, éclairage** | 8408 · 8409 · 8413 · 8483 · 8512 | **10 %** |
| **Garnitures de frein sans amiante, roulements** | 6813 · 8482 | **10 %** |
| **Batteries de démarrage** | 8507 | **20 %** |
| **Pneus neufs** | 4011 | **10 %** |
| **Pneus rechapés ou usagés** | 4012 | **20 %** |

S'y ajoutent les prélèvements communautaires et la redevance statistique, identiques sur toutes ces lignes : **PCC 0,5 % + PCS 0,8 % + PUA 0,2 % + RST 1 % = 2,5 %**. La TVA est de 18 %, mais elle est **récupérable** pour un assujetti : c'est une avance de trésorerie, pas un coût.

<div class="callout">
<p class="lead">La charge douanière non récupérable est d'environ <strong>12,5 % de la valeur CAF</strong> sur l'essentiel du catalogue — pas 20 %.</p>
<p>Nous surfacturons donc la ligne « Droits de douane » d'environ 60 %. C'est une perte de compétitivité, et un risque de crédibilité sur une ligne qui porte le nom d'une taxe.</p>
</div>

## Décisions à prendre

- **Corriger le taux douanier** : passer de 20 % forfaitaires à 12,5 % de la valeur CAF, ou mieux, à un taux dérivé de la famille de pièce — 7,5 % pour les filtres, 12,5 % pour le gros du catalogue, 22,5 % pour les batteries et les pneus d'occasion.
- **Faire valider la classification par un transitaire.** Les taux ci-dessus sont ceux du tarif officiel ; c'est la position déclarée à l'arrivée qui fait foi, et elle dépend de la description et de la facture.
- **Lever une incertitude réglementaire.** Le code des douanes prévoit que les listes de marchandises prohibées sont fixées par décret, et ces listes ne sont pas publiées sur le portail. Nous n'avons trouvé **aucune interdiction d'importer des pièces d'occasion** — mais nous ne pouvons pas prouver qu'il n'en existe pas. À confirmer auprès de la DGD avant le premier conteneur, en particulier sur les organes de sécurité.
- **Arbitrer scraping contre partenariat** sur Opisto, sachant que les deux ne s'excluent pas dans le temps.

---

Pièces.ci — Marketplace pièces auto & solutions flotte · Abidjan, Côte d'Ivoire · fernando.kouame@gmail.com

_Volumes, prix et structures de données relevés directement sur les catalogues des sources citées en septembre 2026 ; les prix médians portent sur un échantillon des marques Toyota, Suzuki et Nissan. Taux douaniers extraits du « TEC CEDEAO enrichi des principaux droits et taxes relevant de la taxation nationale », Direction générale des douanes de Côte d'Ivoire, mise à jour du 27 mars 2026. Document interne : il contient notre évaluation d'intégrabilité et notre structure de coût, et n'est pas destiné à être transmis aux sources évaluées._
