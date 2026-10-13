-- Un trek può stare in più cartelle (2026-10-13): la colonna trek.folder_id diventa la tabella trek_folder.
-- Va eseguito a mano una volta, prima di avviare la nuova versione del backend (che non usa più folder_id).
-- La tabella è la stessa che creerebbe Hibernate: se esiste già non viene toccata.
BEGIN;

CREATE TABLE IF NOT EXISTS trek_folder (
    trek_id   bigint NOT NULL REFERENCES trek (id),
    folder_id bigint NOT NULL REFERENCES folder (id),
    PRIMARY KEY (trek_id, folder_id)
);

INSERT INTO trek_folder (trek_id, folder_id)
SELECT id, folder_id FROM trek WHERE folder_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE trek DROP COLUMN folder_id;

COMMIT;
