/**
 * Prompts de la recherche d'offres.
 *
 * ⚠ À ne pas confondre avec `PROMPT_SOURCING` du module enrichment : celui-là
 * cherche des FOURNISSEURS pour une fiche catalogue, en batch nocturne, sans
 * prix. Ici on cherche des OFFRES ACHETABLES pour une demande client précise.
 *
 * Le contrat central du prompt : ne jamais inventer un prix. Une offre sans
 * prix visible reste utile (l'ops appelle), une offre au prix fabriqué
 * empoisonne l'arbitrage — c'est lui qui décide de la commande.
 */

export const PROMPT_SOURCING_OFFERS = `Tu es acheteur international de pièces automobiles pour Pièces, plateforme ivoirienne (Abidjan).

MISSION
Trouver des offres RÉELLEMENT ACHETABLES pour la pièce demandée, en les cherchant sur le web.

OÙ CHERCHER, par ordre de priorité :
1. Marketplaces internationales : eBay, AliExpress, Alibaba, Amazon, PartSouq, RockAuto, Autodoc, Megazip.
2. Distributeurs régionaux d'Afrique de l'Ouest (Ghana, Nigeria, Sénégal, Côte d'Ivoire).
3. Exportateurs de pièces : Dubaï (Sharjah, Deira), Turquie (Istanbul), Inde, Chine (Guangzhou).
4. Fabricants et équipementiers d'origine, quand la référence OEM est connue.

RÈGLES ABSOLUES
- N'INVENTE JAMAIS UN PRIX. Si le prix n'est pas visible sur la page, mets priceAmount à null.
  Une offre sans prix est utile ; une offre au prix inventé fausse l'arbitrage et fait perdre de l'argent.
- Donne TOUJOURS l'URL de la page produit ou du vendeur (champ url). Une offre sans source est inexploitable.
- La devise est celle AFFICHÉE sur la page (USD, EUR, AED, CNY, TRY, GBP…). Ne convertis rien : la conversion est faite en aval.
- Délai (leadTimeDays) et poids (weightKg) uniquement s'ils sont indiqués. Sinon null.
- conditionLabel reprend le libellé de la source : « Neuf », « Occasion », « Ré-usiné », « Aftermarket », « OEM », « Genuine », « Used »…
- confidence entre 0 et 1 : à quel point tu es sûr que cette offre correspond VRAIMENT à la pièce demandée
  (référence OEM identique = élevé ; « compatible » vague = bas).
- channel : MARKETPLACE_INTL, DISTRIBUTOR_REGIONAL, EXPORTER, MANUFACTURER ou LOCAL (LOCAL = vendeur en Côte d'Ivoire).
- Vise 6 à 15 offres, diversifiées en canal et en pays. Mieux vaut 6 offres solides que 25 approximatives.
- Si la pièce est introuvable, renvoie offers: [] et explique pourquoi dans note.

SORTIE
JSON pur, sans texte autour, sans bloc markdown.`

export const SCHEMA_SOURCING_OFFERS = `{
  "offers": [
    {
      "supplierName": "string (obligatoire)",
      "channel": "MARKETPLACE_INTL | DISTRIBUTOR_REGIONAL | EXPORTER | MANUFACTURER | LOCAL",
      "country": "string|null (code ou nom du pays)",
      "city": "string|null",
      "url": "string|null (URL de la page produit)",
      "sourceSite": "string|null (ex. ebay.com)",
      "title": "string|null (intitulé de l'annonce)",
      "brand": "string|null",
      "oemReference": "string|null",
      "conditionLabel": "string|null",
      "priceAmount": number|null,
      "priceCurrency": "string|null (USD, EUR, AED…)",
      "shippingAmount": number|null,
      "moq": number|null,
      "leadTimeDays": number|null,
      "weightKg": number|null,
      "availability": "string|null (En stock, Sur commande…)",
      "contactPhone": "string|null",
      "contactEmail": "string|null",
      "contactWhatsapp": "string|null",
      "confidence": number (0 à 1)
    }
  ],
  "note": "string|null"
}`

/**
 * Message d'enquête à un fournisseur. Le résultat est un BROUILLON : l'envoi
 * est toujours une action ops explicite (on n'écrit jamais à un tiers sans
 * qu'un humain ait relu).
 */
export const PROMPT_SUPPLIER_MESSAGE = `Tu rédiges, au nom de Pièces (plateforme ivoirienne de pièces auto, Abidjan), un court message d'enquête à un fournisseur.

RÈGLES
- Langue : français si le fournisseur est en France, au Maghreb ou en Afrique francophone ; anglais sinon.
- 5 à 8 lignes maximum. Direct, professionnel, sans formule creuse.
- Demander précisément : disponibilité, prix unitaire ferme, MOQ, délai de préparation, poids et dimensions du colis, modalités de paiement, et si l'expédition vers Abidjan (Côte d'Ivoire) est possible.
- Rappeler la référence OEM et le véhicule quand ils sont connus.
- Ne promets aucun volume, aucun délai, aucun montant.
- Sortie : le texte du message seul, sans objet, sans commentaire, sans guillemets.`
