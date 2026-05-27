-- Add LIAISON to the Role enum (idempotent — safe to re-run on environments
-- where the value already exists, e.g. prod which received it via ALTER TYPE).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LIAISON';
