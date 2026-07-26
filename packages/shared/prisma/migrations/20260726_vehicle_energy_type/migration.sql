-- Motorisation du véhicule : pilote le coût d'immobilisation et le panier de pièces.
CREATE TYPE "VehicleEnergyType" AS ENUM ('ICE', 'EV', 'HYBRID');

ALTER TABLE "vehicles" ADD COLUMN "energy_type" "VehicleEnergyType";
