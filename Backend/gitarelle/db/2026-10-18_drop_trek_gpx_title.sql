-- Il titolo del gpx non esiste più (2026-10-18): il nome che conta è il titolo del trek.
-- Hibernate ddl-auto=update non elimina le colonne: va eseguito a mano una volta (facoltativo, la colonna è solo inutilizzata).
ALTER TABLE trek_gpx DROP COLUMN IF EXISTS title;
