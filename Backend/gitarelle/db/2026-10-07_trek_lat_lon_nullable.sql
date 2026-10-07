-- Rende facoltativo il punto sulla mappa di un trek (2026-10-07).
-- Hibernate ddl-auto=update non rimuove i vincoli NOT NULL esistenti: va eseguito a mano una volta.
ALTER TABLE trek ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE trek ALTER COLUMN lon DROP NOT NULL;
