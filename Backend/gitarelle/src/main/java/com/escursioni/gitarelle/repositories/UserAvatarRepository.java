package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.UserAvatar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {

    // solo la data di aggiornamento, senza caricare l'immagine
    @Query("select a.updatedAt from UserAvatar a where a.userId = :userId")
    Optional<Instant> findUpdatedAt(@Param("userId") Long userId);
}
