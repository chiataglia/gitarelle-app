package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.dto.ProfileRequestDto;
import com.escursioni.gitarelle.dto.StatsDto;
import com.escursioni.gitarelle.dto.UserResponseDto;
import com.escursioni.gitarelle.entities.UserAvatar;
import com.escursioni.gitarelle.services.ProfileService;
import com.escursioni.gitarelle.services.StatsService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

// Profilo e statistiche dell'utente collegato
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final StatsService statsService;

    public ProfileController(ProfileService profileService, StatsService statsService) {
        this.profileService = profileService;
        this.statsService = statsService;
    }

    @GetMapping
    public UserResponseDto get() {
        return this.profileService.getProfile();
    }

    @PutMapping
    public UserResponseDto update(@Valid @RequestBody ProfileRequestDto requestDto) {
        return this.profileService.updateProfile(requestDto);
    }

    // l'url del frontend contiene ?v=<avatarVersion>: l'immagine si può tenere in cache a lungo
    @GetMapping("/avatar")
    public ResponseEntity<byte[]> getAvatar() {
        UserAvatar avatar = this.profileService.getAvatar();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(avatar.getData());
    }

    @PutMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponseDto saveAvatar(@RequestParam("file") MultipartFile file) {
        return this.profileService.saveAvatar(file);
    }

    @DeleteMapping("/avatar")
    public UserResponseDto deleteAvatar() {
        return this.profileService.deleteAvatar();
    }

    @GetMapping("/stats")
    public StatsDto stats() {
        return this.statsService.getStats();
    }
}
