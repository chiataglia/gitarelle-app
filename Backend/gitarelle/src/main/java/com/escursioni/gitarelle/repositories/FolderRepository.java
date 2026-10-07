package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.AppUser;
import com.escursioni.gitarelle.entities.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, Long> {

    List<Folder> findAllByOwnerIdOrderByNameAsc(Long ownerId);

    Optional<Folder> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByOwnerIdAndNameIgnoreCase(Long ownerId, String name);

    boolean existsByOwnerIdAndNameIgnoreCaseAndIdNot(Long ownerId, String name, Long id);

    // dati creati prima dell'autenticazione → al primo utente registrato
    @Modifying
    @Query("update Folder f set f.owner = :owner where f.owner is null")
    int assignOrphansTo(@Param("owner") AppUser owner);
}
