-- Unicité de la plaque dans une flotte.
--
-- Posée séparément de la migration qui crée `plate_canonical` : l'index devait
-- attendre que le parc de production soit propre. Audit du 2026-07-30 sur
-- db.prisma.io : 37 véhicules en flotte, 36 plaques renseignées, 36 plaques
-- canoniques distinctes — aucun doublon. L'index peut donc être posé.
--
-- Index PARTIEL : un véhicule sans plaque (1 en prod, saisie incomplète) reste
-- autorisé, et plusieurs le sont dans la même flotte. Les véhicules personnels
-- (enterprise_id NULL) ne sont pas contraints — deux NULL sont distincts en SQL.

CREATE UNIQUE INDEX "uq_vehicles_enterprise_plate_canonical"
    ON "vehicles" ("enterprise_id", "plate_canonical")
 WHERE "plate_canonical" IS NOT NULL AND "enterprise_id" IS NOT NULL;
