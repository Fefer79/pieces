/**
 * Identité vendeur sentinelle pour la clé composite `(externalSource, externalSellerId)`.
 * Les sources qui n'ont qu'un vendeur fantôme par plateforme (Jumia, 3H, BCG…) ou qui
 * n'ont pas pu déterminer le vendeur réel (CoinAfrique, détail KO) l'utilisent comme
 * `externalSellerId`, garantissant un unique vendeur fallback par source.
 */
export const SHADOW_SELLER_ID = '__shadow__'
