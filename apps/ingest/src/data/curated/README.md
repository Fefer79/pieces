# Référentiel curé de générations

Un fichier JSON par modèle. Chaque fichier décrit les générations d'un modèle et,
pour chacune, la liste **exhaustive** de ses motorisations relevée sur Wikipédia.

## Pourquoi

La source Global Auto date mal les motorisations (elle rattache parfois toutes
celles d'un modèle à une seule génération) et en ignore beaucoup : 40 modèles du
référentiel n'en avaient aucune. Une fenêtre curée corrige les deux :

- une motorisation de la source qui figure dans la fenêtre prend les années curées ;
- une motorisation de la source absente de la fenêtre en est exclue ;
- une variante curée qu'aucune motorisation de la source ne recouvre est ajoutée.

## Règle à ne pas enfreindre

**Ne créer une génération curée que si la liste de variantes est crédiblement
exhaustive.** La fenêtre fait autorité : une liste partielle cacherait des
motorisations réelles. Quand l'article Wikipédia ne donne qu'une partie des
variantes (puissances manquantes, tableau absent), il vaut mieux ne rien curer
pour cette génération et laisser la source opérer.

## Ajouter un modèle

1. Demander à Wikipédia la liste des motorisations au format attendu, une par ligne :

   ```
   CODE_GEN|DÉBUT_GEN|FIN_GEN|NOM|PETROL ou DIESEL|cylindrée|puissance_ch|DÉBUT|FIN|TECH|TRANSMISSION
   ```

   Les puissances sont en chevaux DIN (convertir les kW par ×1,36) ; pour un
   hybride, celle du moteur thermique. `TECH` = la famille du bloc telle qu'elle
   est badgée (dCi, TCe, D-4D, CRDi, BoosterJet…). `TRANSMISSION` ne sert qu'à
   repérer une transmission intégrale.

2. `pnpm -F ingest curated:add "MARQUE" "Modèle" "URL" < lignes.txt`
   Le nom du modèle doit être celui du référentiel (`vehicles-data.ts`), à la
   casse près.

3. `pnpm -F ingest annotate:engine-years` puis vérifier la gamme par millésime.

Wikipédia FR a souvent un article par génération pour les modèles européens, avec
les puissances déjà en chevaux ; Wikipédia EN regroupe plus volontiers toutes les
générations dans un seul article.

## Couvert — 56 modèles, 111 générations, 857 variantes

**Allemandes** Audi A4 (B6) · BMW Série 1 (E87, F20) · Mercedes-Benz Classe C
(W205), Sprinter, Vito
**Françaises** Citroën Berlingo, C3 Aircross, C4, C5 · Peugeot 205, 206, 207,
307, 308, 308 SW, 3008, 406, 508, Partner · Renault Captur, Clio, Duster, Kwid,
Laguna, Logan, Sandero, Scénic, Symbol, Trafic
**Asiatiques** Hyundai Accent, Elantra, Tucson · Isuzu D-Max · Kia Cerato,
Picanto, Rio, Sportage · Mitsubishi Canter · Nissan Micra, Qashqai · Suzuki APV,
Baleno, Celerio, Ciaz, Ignis, Jimny, S-Presso, Splash, Vitara, Wagon R, XL7 ·
Toyota Corolla, Land Cruiser Prado, Probox, Rav4, Yaris

## À curer — modèles encore sans aucune motorisation

BMW Série 2, Série 4, Série 6 · Chrysler Voyager · Ford Explorer ·
Mercedes-Benz Classe CLS · Renault Master · Suzuki Super Carry · Volkswagen Jetta

Cinq d'entre eux ont été tentés puis écartés faute de tableau de motorisations
exploitable sur Wikipédia — Master, Jetta, Classe CLS, Super Carry, et les
générations 2 à 4 du Cerato. Voir la règle d'exhaustivité ci-dessus : mieux vaut
laisser la source opérer que revendiquer une fenêtre incomplète. Il faudra une
autre source pour ceux-là.

## À curer — modèles datés seulement par la source

259 modèles ont encore au moins une motorisation sans plage exploitable. Ils
restent utilisables — le filtre par millésime retombe sur la liste complète
quand il ne trouve rien. Les plus coûteux d'abord (nombre de motorisations non
datées) :

Mitsubishi Outlander (42), Peugeot Expert (34), BMW X4 (28), VW Transporter (27),
Opel Astra et Astra G (23 + 23), VW Multivan (22), Alfa Romeo 156 (21),
Mercedes Classe GLA (19), Peugeot 5008 (19), Ford Kuga (18), Peugeot 407 (17),
Mitsubishi ASX et L200 (16 + 15), VW Polo (15), Alfa Romeo MI.TO (15),
Citroën C4 Grand Picasso (15), Volvo V90 (15), Jaguar XE (14), Fiat Bravo (14),
Mitsubishi Pajero (14).

Écartés faute de tableau exploitable sur Wikipédia, à retenter ailleurs :
Toyota Hilux (AN10, AN120), Toyota Land Cruiser (J200), Nissan Sunny (N17),
Toyota Yaris (XP90), Renault Master, Volkswagen Jetta, Mercedes-Benz Classe CLS,
Suzuki Super Carry, Kia Cerato (générations 2 à 4).
Mitsubishi Outlander : l'article français donne des puissances fantaisistes
(V6 à 300 ch, TDI à 190 ch) — ne pas l'utiliser tel quel.

## Motorisations qu'aucune fenêtre curée n'accueille

Le script les signale à chaque passe (`22` au dernier relevé : Peugeot 205,
Citroën C5, Peugeot 406, 206, 308, Nissan Qashqai). Ce sont des libellés de la
source dont la puissance ne correspond à aucune variante curée — souvent des
versions GPL ou des marchés hors Europe. Ils gardent leur plage d'origine ; les
traiter, c'est compléter la génération curée correspondante.
