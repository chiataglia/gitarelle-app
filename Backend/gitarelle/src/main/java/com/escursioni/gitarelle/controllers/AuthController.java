package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.dto.LoginRequestDto;
import com.escursioni.gitarelle.dto.RegisterRequestDto;
import com.escursioni.gitarelle.dto.UserResponseDto;
import com.escursioni.gitarelle.security.AuthUser;
import com.escursioni.gitarelle.security.CurrentUser;
import com.escursioni.gitarelle.services.AuthService;
import com.escursioni.gitarelle.services.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

// Registrazione, login, logout e utente corrente. La sessione vive in un cookie HttpOnly (JSESSIONID)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;
    private final SecurityContextRepository securityContextRepository;
    private final ProfileService profileService;

    public AuthController(AuthService authService, CurrentUser currentUser, SecurityContextRepository securityContextRepository,
                          ProfileService profileService) {
        this.authService = authService;
        this.currentUser = currentUser;
        this.securityContextRepository = securityContextRepository;
        this.profileService = profileService;
    }

    // crea l'account e fa subito il login
    @PostMapping("/register")
    public UserResponseDto register(@Valid @RequestBody RegisterRequestDto requestDto, HttpServletRequest request, HttpServletResponse response) {
        return startSession(this.authService.register(requestDto), request, response);
    }

    @PostMapping("/login")
    public UserResponseDto login(@Valid @RequestBody LoginRequestDto requestDto, HttpServletRequest request, HttpServletResponse response) {
        return startSession(this.authService.login(requestDto), request, response);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler().logout(request, response, SecurityContextHolder.getContext().getAuthentication());
    }

    // usato dal frontend all'avvio per sapere se c'è già una sessione valida (401 se no), con i dati del profilo
    @GetMapping("/me")
    public UserResponseDto me() {
        return this.profileService.getProfile(this.currentUser.id());
    }

    private UserResponseDto startSession(AuthUser user, HttpServletRequest request, HttpServletResponse response) {
        // in sessione non serve (e non si tiene) l'hash della password
        AuthUser principal = new AuthUser(user.id(), user.username(), null);
        var authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());

        // nuovo id di sessione dopo il login, contro la session fixation
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        this.securityContextRepository.saveContext(context, request, response);
        return this.profileService.getProfile(principal.id());
    }
}
