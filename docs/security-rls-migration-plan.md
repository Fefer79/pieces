# Plan — Vrai RLS pour Pièces (défense en profondeur DB)

> Rédigé le 2026-06-24 après audit de sécurité. **Le RLS est impossible sur la base
> actuelle** : `db.prisma.io` n'expose qu'un rôle superuser (`prisma_migration`,
> `rolsuper=true`) qui bypasse tout RLS, et `CREATE ROLE` y est refusé. Toute policy
> écrite aujourd'hui serait du théâtre. Ce plan décrit ce qu'il faut faire pour que le
> RLS protège réellement.

## 0. Faut-il vraiment le faire ?

La base **n'est pas exposée aux clients** : seul l'API Fastify y accède, l'autorisation
est applicative (`requireAuth`/`requireRole` + checks d'ownership en service). Le RLS
serait une **2ᵉ ligne** : il rattrape les bugs d'autorisation applicatifs (type IDOR) et
limite la casse si la connexion DB fuit. Bénéfice réel mais non urgent. **Priorité réelle =
fermer les trous applicatifs** (fait pour les routes Orders ; reste à auditer vendor /
delivery / dispute / admin).

## 1. Pré-requis bloquant : changer d'hébergeur Postgres

Il faut une base où **on contrôle les rôles**. Options :

| Option | Avantage | Inconvénient |
|--------|----------|--------------|
| **Render Postgres** (recommandé) | Déjà sur Render (API), un seul fournisseur, rôles libres, `psql` direct | Migration de données depuis Prisma Postgres |
| Supabase Postgres | `auth.uid()` natif, on y fait déjà l'auth | Mélange auth + data ; coût ; lock-in PostgREST |
| Postgres auto-hébergé | Contrôle total | Ops à charge |

Supabase reste **auth-only** dans tous les cas (OTP/JWT). On ne migre QUE la base de données applicative.

## 2. Étapes (Render Postgres)

1. **Provisionner** une instance Render Postgres (même région que l'API).
2. **Migrer le schéma** : `prisma migrate deploy` sur la nouvelle base (les migrations
   existantes suffisent).
3. **Migrer les données** : `pg_dump --data-only` depuis db.prisma.io → `psql` vers Render.
   Fenêtre de maintenance courte (la base est petite). Vérifier les counts par table.
4. **Créer le rôle applicatif non-privilégié** :
   ```sql
   CREATE ROLE app_runtime LOGIN PASSWORD '…' NOSUPERUSER NOBYPASSRLS;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
   GRANT USAGE ON SCHEMA public TO app_runtime;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
   ```
   Les migrations restent jouées par le rôle owner ; **le runtime utilise `app_runtime`**.
5. **Pointer `DATABASE_URL` de l'API** (Render env) sur `app_runtime`. Garder une
   `DIRECT_DATABASE_URL` owner pour les migrations.

## 3. Injection du contexte utilisateur par requête

Sans PostgREST, il faut transmettre l'identité à la base. Pattern Prisma :

- **Extension client Prisma** qui, sur chaque opération, ouvre une transaction et fait
  `SET LOCAL app.user_id = '<id>'` + `SET LOCAL app.roles = '<csv>'` avant la requête.
- L'`user_id` vient du `requireAuth` (déjà sur `request.user`). Le passer via AsyncLocalStorage
  pour que l'extension le lise sans modifier chaque appel service.

Esquisse :
```ts
// als.ts — contexte par requête
export const requestCtx = new AsyncLocalStorage<{ userId: string; roles: string[] }>()

// prisma.ts — extension
prisma.$extends({
  query: { $allModels: { async $allOperations({ args, query }) {
    const ctx = requestCtx.getStore()
    if (!ctx) return query(args) // jobs/migrations : pas de RLS user
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.user_id = '${ctx.userId}'`)
      return query(args)
    })
  }}},
})
```
⚠️ Coût : chaque requête devient une transaction. Mesurer la latence. Échapper/valider
`user_id` (UUID) pour éviter l'injection dans le `SET LOCAL`.

Les jobs (cron, webhooks, ingest) tournent **sans** contexte user → prévoir un rôle/mode
bypass explicite pour eux, sinon le RLS bloquera leurs écritures.

## 4. Activer RLS + policies

Pour chaque table à données utilisateur :
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;  -- s'applique même au owner

CREATE POLICY orders_read ON orders FOR SELECT USING (
  current_setting('app.user_id', true) = initiator_id
  OR enterprise_id IN (
    SELECT enterprise_id FROM enterprise_members
    WHERE user_id = current_setting('app.user_id', true)
  )
  OR EXISTS (
    SELECT 1 FROM order_items oi JOIN vendors v ON v.id = oi.vendor_id
    WHERE oi.order_id = orders.id AND v.user_id = current_setting('app.user_id', true)
  )
);
-- policies INSERT/UPDATE/DELETE séparées selon les règles métier
```

Tables prioritaires : `orders`, `order_items`, `vehicles`, `enterprises`,
`enterprise_members`, `vendors`, `disputes`, `escrow_transactions`, `deliveries`,
`invoices`. Tables catalogue public (`catalog_items` publiés) : policy de lecture ouverte.

Reproduire la logique des helpers applicatifs (`assertOrderReadAccess`, `assertMember`)
en SQL — **garder les deux en phase** (les policies doublent les checks service, pas les
remplacent).

## 5. Rollout

1. Staging : nouvelle base + `app_runtime` + RLS, faire tourner la suite de tests d'intégration.
2. Tests RLS dédiés : un user A ne voit pas la commande de B (via `SET app.user_id`).
3. Bascule prod en fenêtre de maintenance (étape 2–3), puis activer RLS table par table.
4. Surveiller les erreurs `permission denied` (jobs oubliés) et la latence.

## 6. Estimation & risques

- **Effort** : ~3–5 j (migration data + extension Prisma + policies + tests + bascule).
- **Risques** : latence (transaction/requête), jobs cassés par RLS, divergence policy↔service,
  fenêtre de migration de données.
- **Réversible** : `DATABASE_URL` peut repointer l'ancienne base tant que les données sont synchro.

## 7. Décision

À trancher : (a) on lance la migration Render maintenant, (b) on la planifie après avoir
fini l'audit applicatif des autres modules, ou (c) on s'en tient à la sécurité applicative
(suffisante tant que la base n'est pas exposée) et on garde ce plan en réserve.
