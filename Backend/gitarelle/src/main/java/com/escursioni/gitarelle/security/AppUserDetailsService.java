package com.escursioni.gitarelle.security;

import com.escursioni.gitarelle.repositories.AppUserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

// Usato da Spring Security al login per caricare l'utente e confrontare la password
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final AppUserRepository userRepository;

    public AppUserDetailsService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        return this.userRepository.findByUsername(username.trim().toLowerCase(Locale.ROOT))
                .map(AuthUser::from)
                .orElseThrow(() -> new UsernameNotFoundException(username));
    }
}
