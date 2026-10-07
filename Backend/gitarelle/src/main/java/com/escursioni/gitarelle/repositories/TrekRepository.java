package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.AppUser;
import com.escursioni.gitarelle.entities.Trek;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrekRepository extends JpaRepository<Trek, Long> {

    List<Trek> findAllByOwnerId(Long ownerId);

    Optional<Trek> findByIdAndOwnerId(Long id, Long ownerId);

    // toglie la cartella a tutti i suoi trek (prima di eliminarla)
    @Modifying
    @Query("update Trek t set t.folder = null where t.folder.id = :folderId")
    void clearFolder(@Param("folderId") Long folderId);

    // dati creati prima dell'autenticazione → al primo utente registrato
    @Modifying
    @Query("update Trek t set t.owner = :owner where t.owner is null")
    int assignOrphansTo(@Param("owner") AppUser owner);
}
