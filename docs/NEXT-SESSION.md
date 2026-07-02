# Prochaine session — Login WhatsApp reverse-OTP (gratuit)

> Checkpoint du 2026-07-02. Lancer depuis n'importe quelle machine :
> `claude` dans le repo, puis « implémente docs/NEXT-SESSION.md ».

## Contexte

L'OTP SMS n'a jamais été branché (payant). Décision prise : **OTP inversé via
WhatsApp** — gratuit à tout volume car les conversations initiées par
l'utilisateur sont gratuites et illimitées chez Meta (depuis nov. 2024), et la
réponse dans la fenêtre de 24 h aussi. WhatsApp est quasi universel en CI.

## Le flux à implémenter

1. `/login` : l'utilisateur entre son numéro (+225…)
2. Back : génère un code court lié au numéro (ex. `P-4832`, TTL 5 min, one-shot)
3. Front : bouton « Vérifier sur WhatsApp » → `wa.me/<numéro-business>?text=P-4832`
   (message pré-rempli, 1 tap) + fallback saisie manuelle du numéro business
4. Le webhook WhatsApp existant (`apps/api/src/modules/whatsapp/`, HMAC SHA-256
   déjà en place) reçoit le message entrant : expéditeur certifié Meta + code
   → preuve de possession du numéro
5. Le front poll `GET /auth/whatsapp/status?code=…` → à la vérification, le back
   émet la session (upsert User + token compatible avec le `requireAuth` Supabase
   existant) et répond « Connecté ✓ » sur WhatsApp (gratuit, fenêtre 24 h)

## Points d'attention

- **Prérequis bloquant** : `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` absents sur
  Render — tous les envois WA sont silencieusement no-op (TODO connu). Compte
  Meta Developer gratuit + numéro de test Meta pour le dev local.
- Intégration session : `requireAuth` valide via Supabase (`auth.getUser`). Deux
  options à trancher en début de session : (a) hook Supabase custom, (b) mint
  d'un JWT signé avec le secret Supabase du projet. Regarder
  `apps/api/src/plugins/auth.ts` d'abord.
- Rate-limit sur la génération de codes (anti-énumération) ; codes à usage
  unique ; ne pas logger les numéros en clair dans activity_logs.
- Module pattern : `module.routes.ts` → `module.service.ts` → tests vitest
  (`app.inject()`, mocks `vi.mock`).

## État de la veille (2026-07-02, nuit)

- ✅ Supabase verrouillé : RLS deny-all + revoke sur les 46 tables fantômes,
  PII purgée (les données app vivent sur db.prisma.io, Supabase = auth only)
- ✅ « Validation failed » onboarding vendeur corrigé : CI rouge depuis le 30/06
  gelait le deploy Render de l'API (skew front/API). Fixes : ff46446 + 2062468,
  vérifié sur l'API live
- ⏳ Optionnel : gater deploy-web.yml sur le CI (2 skews en 3 jours) ;
  HaveIBeenPwned à activer dans le dashboard Supabase

## Rappels machine de travail

- `.env` local pointe la Supabase fantôme, PAS la prod db.prisma.io
- Sur tout bug prod « validation » : vérifier `gh run list --branch main` d'abord
  (Render n'auto-déploie que si les checks GitHub sont verts)
