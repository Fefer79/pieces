-- Socle de reprise du contrat vendeur v1.2.
--
-- La garantie de fonctionnement de 30 jours n'est plus imposée : le vendeur
-- décide de la garantie pièce par pièce. Ce qui reste dû par tout vendeur, même
-- sans garantie, c'est la reprise — d'où ce nouvel engagement signé.
--
-- Ajout seul, sans renommage : WARRANTY_30D reste une valeur valide pour ne pas
-- réécrire l'engagement des vendeurs ayant signé le contrat v1.1.
ALTER TYPE "GuaranteeType" ADD VALUE IF NOT EXISTS 'DELIVERY_REFUSAL';
