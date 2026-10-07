package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.entities.AppUser;

import java.time.Instant;

// Utente/profilo restituito al frontend (mai l'hash della password).
// avatarVersion: null se non c'è avatar, altrimenti cambia a ogni nuova immagine
public record UserResponseDto(
        Long id,
        String username,
        String firstName,
        String lastName,
        Long avatarVersion,
        Instant createdAt
) {

    public static UserResponseDto from(AppUser user, Instant avatarUpdatedAt) {
        return new UserResponseDto(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                avatarUpdatedAt != null ? avatarUpdatedAt.toEpochMilli() : null,
                user.getCreatedAt()
        );
    }
}
