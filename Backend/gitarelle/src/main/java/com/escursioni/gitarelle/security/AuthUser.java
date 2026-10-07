package com.escursioni.gitarelle.security;

import com.escursioni.gitarelle.entities.AppUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

// Utente autenticato tenuto in sessione: porta con sé l'id, così i service filtrano i dati senza query in più
public record AuthUser(Long id, String username, String passwordHash) implements UserDetails {

    public static AuthUser from(AppUser user) {
        return new AuthUser(user.getId(), user.getUsername(), user.getPasswordHash());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(); // per ora nessun ruolo
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }
}
