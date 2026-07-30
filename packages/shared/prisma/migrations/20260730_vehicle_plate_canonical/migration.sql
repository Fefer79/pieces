-- Plaque canonique : clé de déduplication d'un parc.
--
-- L'import de véhicules ne dédoublonnait pas contre la base : réimporter le
-- même fichier dupliquait la flotte, et l'abonnement se facturant au véhicule,
-- la facture doublait avec elle.
--
-- On garde `plate` tel que saisi (affichage) et on déduplique sur une forme
-- canonique : majuscules, sans séparateur (« 1749-WW-CI-01 » → « 1749WWCI01 »).
--
-- L'index UNIQUE n'est volontairement PAS créé ici : la prod contient déjà des
-- doublons, la migration échouerait et bloquerait le déploiement. Il arrive
-- dans une migration séparée, une fois le parc fusionné.

ALTER TABLE "vehicles" ADD COLUMN "plate_canonical" TEXT;

UPDATE "vehicles"
   SET "plate_canonical" = UPPER(REGEXP_REPLACE("plate", '[^A-Za-z0-9]', '', 'g'))
 WHERE "plate" IS NOT NULL AND TRIM("plate") <> '';

-- Une plaque réduite à la chaîne vide après nettoyage n'est pas une plaque.
UPDATE "vehicles" SET "plate_canonical" = NULL WHERE "plate_canonical" = '';

CREATE INDEX "idx_vehicles_enterprise_plate_canonical"
    ON "vehicles" ("enterprise_id", "plate_canonical");
