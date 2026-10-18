package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.AppUser;
import com.escursioni.gitarelle.entities.Trek;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TrekRepository extends JpaRepository<Trek, Long> {

    // con le cartelle già caricate: la lista le restituisce per ogni trek
    @EntityGraph(attributePaths = "folders")
    List<Trek> findAllByOwnerId(Long ownerId);

    // trek di una cartella (per colorarli tutti insieme)
    @EntityGraph(attributePaths = "folders")
    List<Trek> findAllByOwnerIdAndFolders_Id(Long ownerId, Long folderId);

    Optional<Trek> findByIdAndOwnerId(Long id, Long ownerId);

    @EntityGraph(attributePaths = "folders")
    List<Trek> findAllByIdInAndOwnerId(Collection<Long> ids, Long ownerId);

    // trek a cui manca la regione ma che hanno da dove ricavarla (punto o gpx): creati prima del calcolo automatico
    @Query("select t from Trek t where t.owner.id = :ownerId and t.region is null "
            + "and (t.lat is not null or exists (select 1 from TrekGpx g where g.trekId = t.id))")
    List<Trek> findWithoutRegionByOwnerId(@Param("ownerId") Long ownerId);

    // toglie la cartella da tutti i suoi trek (prima di eliminarla)
    @Modifying
    @Query(value = "delete from trek_folder where folder_id = :folderId", nativeQuery = true)
    void clearFolder(@Param("folderId") Long folderId);

    // dati creati prima dell'autenticazione → al primo utente registrato
    @Modifying
    @Query("update Trek t set t.owner = :owner where t.owner is null")
    int assignOrphansTo(@Param("owner") AppUser owner);
}
