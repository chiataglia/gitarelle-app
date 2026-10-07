package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.AppUser;
import com.escursioni.gitarelle.entities.Wish;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WishRepository extends JpaRepository<Wish, Long> {

    List<Wish> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    Optional<Wish> findByIdAndOwnerId(Long id, Long ownerId);

    long countByOwnerId(Long ownerId);

    // dati creati prima dell'autenticazione → al primo utente registrato
    @Modifying
    @Query("update Wish w set w.owner = :owner where w.owner is null")
    int assignOrphansTo(@Param("owner") AppUser owner);
}
