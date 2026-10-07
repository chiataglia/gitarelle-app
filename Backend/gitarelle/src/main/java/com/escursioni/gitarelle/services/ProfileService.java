package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import com.escursioni.gitarelle.dto.ProfileRequestDto;
import com.escursioni.gitarelle.dto.UserResponseDto;
import com.escursioni.gitarelle.entities.AppUser;
import com.escursioni.gitarelle.entities.UserAvatar;
import com.escursioni.gitarelle.exceptions.AvatarNotFoundException;
import com.escursioni.gitarelle.exceptions.InvalidAvatarException;
import com.escursioni.gitarelle.repositories.AppUserRepository;
import com.escursioni.gitarelle.repositories.UserAvatarRepository;
import com.escursioni.gitarelle.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;

// Profilo dell'utente corrente: nome, cognome, avatar
@Service
public class ProfileService {

    private static final long MAX_AVATAR_BYTES = 1024 * 1024;

    private final AppUserRepository userRepository;
    private final UserAvatarRepository avatarRepository;
    private final CurrentUser currentUser;

    public ProfileService(AppUserRepository userRepository, UserAvatarRepository avatarRepository, CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.avatarRepository = avatarRepository;
        this.currentUser = currentUser;
    }

    // per id esplicito: serve anche subito dopo login/registrazione
    public UserResponseDto getProfile(Long userId) {
        AppUser user = this.userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Utente " + userId + " non trovato"));
        return UserResponseDto.from(user, this.avatarRepository.findUpdatedAt(userId).orElse(null));
    }

    public UserResponseDto getProfile() {
        return getProfile(this.currentUser.id());
    }

    @Transactional
    public UserResponseDto updateProfile(ProfileRequestDto requestDto) {
        AppUser user = this.userRepository.findById(this.currentUser.id()).orElseThrow();
        user.setFirstName(blankToNull(requestDto.firstName()));
        user.setLastName(blankToNull(requestDto.lastName()));
        this.userRepository.save(user);
        return getProfile(user.getId());
    }

    public UserAvatar getAvatar() {
        return this.avatarRepository.findById(this.currentUser.id())
                .orElseThrow(AvatarNotFoundException::new);
    }

    @Transactional
    public UserResponseDto saveAvatar(MultipartFile file) {
        if (file.isEmpty()) throw new InvalidAvatarException(ErrorMessageConstants.AVATAR_EMPTY);
        if (file.getSize() > MAX_AVATAR_BYTES) throw new InvalidAvatarException(ErrorMessageConstants.AVATAR_TOO_LARGE);
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new InvalidAvatarException(ErrorMessageConstants.AVATAR_INVALID);
        }
        // il formato si ricava dai primi byte, non dal content type dichiarato dal client
        String contentType = detectImageType(data);
        if (contentType == null) throw new InvalidAvatarException(ErrorMessageConstants.AVATAR_INVALID);

        Long userId = this.currentUser.id();
        UserAvatar avatar = this.avatarRepository.findById(userId).orElseGet(() -> {
            UserAvatar created = new UserAvatar();
            created.setUser(this.currentUser.reference());
            return created;
        });
        avatar.setContentType(contentType);
        avatar.setData(data);
        avatar.setUpdatedAt(Instant.now());
        this.avatarRepository.save(avatar);
        return getProfile(userId);
    }

    @Transactional
    public UserResponseDto deleteAvatar() {
        Long userId = this.currentUser.id();
        if (this.avatarRepository.existsById(userId)) this.avatarRepository.deleteById(userId);
        return getProfile(userId);
    }

    private static String detectImageType(byte[] d) {
        if (d.length >= 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (d.length >= 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') return "image/png";
        if (d.length >= 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F'
                && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P') return "image/webp";
        return null;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
