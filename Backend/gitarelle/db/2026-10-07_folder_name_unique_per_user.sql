-- Con l'autenticazione ogni utente ha le sue cartelle (2026-10-07): il nome non è più unico
-- in assoluto ma per utente (controllo in FolderService).
-- Hibernate ddl-auto=update non rimuove i vincoli esistenti: va eseguito a mano una volta.
-- Il nome del vincolo è generato da Hibernate, quindi lo si cerca: unico su folder con la sola colonna "name".
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'folder'
          AND con.contype = 'u'
          AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'name')]::smallint[]
    LOOP
        EXECUTE format('ALTER TABLE folder DROP CONSTRAINT %I', c.conname);
        RAISE NOTICE 'Rimosso vincolo %', c.conname;
    END LOOP;
END $$;
