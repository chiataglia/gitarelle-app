package com.escursioni.gitarelle.security;

import com.escursioni.gitarelle.entities.AppUser;
import com.escursioni.gitarelle.repositories.AppUserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// Accesso all'utente della richiesta corrente, per i service che filtrano i dati per proprietario
@Component
public class CurrentUser {

    private final AppUserRepository userRepository;

    public CurrentUser(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public AuthUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser user)) {
            // non dovrebbe succedere: la SecurityConfig blocca le richieste non autenticate
            throw new IllegalStateException("Nessun utente autenticato");
        }
        return user;
    }

    public Long id() {
        return get().id();
    }

    // riferimento leggero (senza query) da usare come proprietario di una nuova entity
    public AppUser reference() {
        return this.userRepository.getReferenceById(id());
    }
}
