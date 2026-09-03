-- Libère le verrou consultatif de `prisma migrate` (clé 72707369) tenu par une
-- session zombie — typiquement un déploiement Render tué en cours de migration.
-- Symptôme : `migrate resolve` / `migrate deploy` échoue en P1002
-- « Timed out trying to acquire a postgres advisory lock ».
--
-- Garde-fou : on ne termine que les sessions INACTIVES. Une session qui exécute
-- réellement une migration à cet instant n'est jamais touchée.

SELECT pg_terminate_backend(l.pid)
FROM pg_locks l
JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.locktype = 'advisory'
  AND l.classid = 0
  AND l.objid = 72707369
  AND l.objsubid = 1
  AND l.pid <> pg_backend_pid()
  AND a.state LIKE 'idle%';
