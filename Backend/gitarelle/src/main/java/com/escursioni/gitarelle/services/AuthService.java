package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.LoginRequestDto;
import com.escursioni.gitarelle.dto.RegisterRequestDto;
import com.escursioni.gitarelle.entities.AppUser;
import com.escursioni.gitarelle.exceptions.InvalidCredentialsException;
import com.escursioni.gitarelle.exceptions.UsernameAlreadyExistsException;
import com.escursioni.gitarelle.repositories.AppUserRepository;
import com.escursioni.gitarelle.repositories.FolderRepository;
import com.escursioni.gitarelle.repositories.TrekRepository;
import com.escursioni.gitarelle.repositories.WishRepository;
import com.escursioni.gitarelle.security.AuthUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final TrekRepository trekRepository;
    private final FolderRepository folderRepository;
    private final WishRepository wishRepository;

    public AuthService(AppUserRepository userRepository, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                       TrekRepository trekRepository, FolderRepository folderRepository, WishRepository wishRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.trekRepository = trekRepository;
        this.folderRepository = folderRepository;
        this.wishRepository = wishRepository;
    }

    @Transactional
    public AuthUser register(RegisterRequestDto requestDto) {
        String username = normalize(requestDto.username());
        if (this.userRepository.existsByUsername(username)) {
            throw new UsernameAlreadyExistsException(username);
        }
        boolean firstUser = this.userRepository.count() == 0;

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(this.passwordEncoder.encode(requestDto.password()));
        user = this.userRepository.save(user);

        // i dati creati prima dell'autenticazione non hanno proprietario: vanno al primo utente
        if (firstUser) {
            int treks = this.trekRepository.assignOrphansTo(user);
            int folders = this.folderRepository.assignOrphansTo(user);
            int wishes = this.wishRepository.assignOrphansTo(user);
            log.info("Primo utente '{}': assegnati {} trek, {} cartelle, {} idee esistenti", username, treks, folders, wishes);
        }
        return AuthUser.from(user);
    }

    public AuthUser login(LoginRequestDto requestDto) {
        try {
            var auth = this.authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(normalize(requestDto.username()), requestDto.password()));
            return (AuthUser) auth.getPrincipal();
        } catch (AuthenticationException e) {
            throw new InvalidCredentialsException();
        }
    }

    private static String normalize(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }
}
