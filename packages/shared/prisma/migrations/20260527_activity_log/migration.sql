-- Activity log: append-only record of significant user actions
-- (initially focused on LIAISON actions for the admin oversight page).

CREATE TABLE "activity_logs" (
  "id"          TEXT PRIMARY KEY,
  "actor_id"    TEXT NOT NULL,
  "actor_role"  "Role" NOT NULL,
  "action"      TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id"   TEXT,
  "payload"     JSONB,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "activity_logs_actor_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_activity_logs_actor"      ON "activity_logs"("actor_id", "created_at" DESC);
CREATE INDEX "idx_activity_logs_action"     ON "activity_logs"("action", "created_at" DESC);
CREATE INDEX "idx_activity_logs_target"     ON "activity_logs"("target_type", "target_id");
CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs"("created_at" DESC);
