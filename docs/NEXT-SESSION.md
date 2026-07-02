# Login WhatsApp reverse-OTP (gratuit) — IMPLÉMENTÉ le 2026-07-02

> Checkpoint du 2026-07-02. Lancer depuis n'importe quelle machine :
> `claude` dans le repo, puis « implémente docs/NEXT-SESSION.md ».

## ✅ Fait (session du 2026-07-02)

Flux complet implémenté et testé (80 tests API verts) :

- **Session** : décision tranchée — variante de l'option (b). On mint un jeton
  **Pièces natif** (HS256, `apps/api/src/lib/piecesToken.ts`, secret =
  `AUTH_SESSION_SECRET` sinon `SUPABASE_SERVICE_ROLE_KEY`, TTL 30 j, claim
  `iss: 'pieces-wa'`). `requireAuth` (`plugins/auth.ts`) reconnaît ce jeton et
  résout l'utilisateur directement via Prisma — pas d'aller-retour GoTrue, donc
  entièrement testable sans Supabase. Les jetons Supabase existants passent par
  le chemin inchangé.
- **Back** : `apps/api/src/modules/auth/whatsappLogin.service.ts` (codes
  `P-XXXX` en mémoire, TTL 5 min, one-shot, idempotent par numéro, numéros
  jamais loggés) + routes `POST /api/v1/auth/whatsapp/start` (rate-limit 5/min)
  et `GET /api/v1/auth/whatsapp/status` (rate-limit 60/min).
- **Webhook** : `whatsapp.routes.ts` détecte un code entrant AVANT le parsing bot ;
  l'expéditeur certifié Meta doit correspondre au numéro déclaré (preuve de
  possession) ; répond « ✅ Connecté ! ».
- **Front** : page `/login/whatsapp` (saisie numéro → bouton « Ouvrir WhatsApp »
  wa.me pré-rempli + fallback numéro business + polling 3 s) ; bouton
  « Se connecter avec WhatsApp (Gratuit) » sur `/login`. Jeton stocké via
  `lib/pieces-session.ts` (localStorage + cookie `pieces_session`) ;
  `auth-context.getAccessToken` et `middleware.ts` le reconnaissent ; `logout`
  le purge.

### ⚠️ Reste à faire pour activer en prod

- Poser `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` et **`WHATSAPP_BUSINESS_NUMBER`**
  (chiffres seuls, ex. `2250700000000`) sur Render — sinon `waLink` est nul et
  les réponses WA restent no-op. Optionnel : `AUTH_SESSION_SECRET` dédié.
- Le store des codes est en mémoire (mono-instance, cohérent avec le bot WA du
  pilote) : passer en table Prisma si l'API scale à plusieurs instances.

---

## Brief d'origine (conservé pour référence)

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
