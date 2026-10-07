package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.WishRequestDto;
import com.escursioni.gitarelle.dto.WishResponseDto;
import com.escursioni.gitarelle.entities.Wish;
import com.escursioni.gitarelle.entities.WishGpx;
import com.escursioni.gitarelle.exceptions.EmptyGpxFileException;
import com.escursioni.gitarelle.exceptions.GpxReadException;
import com.escursioni.gitarelle.exceptions.WishGpxNotFoundException;
import com.escursioni.gitarelle.exceptions.WishNotFoundException;
import com.escursioni.gitarelle.repositories.WishGpxRepository;
import com.escursioni.gitarelle.repositories.WishRepository;
import com.escursioni.gitarelle.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Tour da fare: logica separata dai trek dello storico
@Service
public class WishService {

    private final WishRepository wishRepository;
    private final WishGpxRepository wishGpxRepository;
    private final CurrentUser currentUser;

    public WishService(WishRepository wishRepository, WishGpxRepository wishGpxRepository, CurrentUser currentUser) {
        this.wishRepository = wishRepository;
        this.wishGpxRepository = wishGpxRepository;
        this.currentUser = currentUser;
    }

    // dal più recente
    public List<WishResponseDto> findAllWishes() {
        Set<Long> wishesWithGpx = new HashSet<>(this.wishGpxRepository.findAllWishIds());
        return this.wishRepository.findAllByOwnerIdOrderByCreatedAtDesc(this.currentUser.id()).stream()
                .map(wish -> WishResponseDto.from(wish, wishesWithGpx.contains(wish.getId())))
                .toList();
    }

    // solo tra le idee dell'utente corrente
    public Wish findWishById(Long id) {
        return this.wishRepository.findByIdAndOwnerId(id, this.currentUser.id())
                .orElseThrow(() -> new WishNotFoundException(id));
    }

    public WishResponseDto createWish(WishRequestDto requestDto) {
        Wish wish = new Wish();
        wish.setOwner(this.currentUser.reference());
        applyFields(wish, requestDto);
        return WishResponseDto.from(this.wishRepository.save(wish), false);
    }

    @Transactional
    public WishResponseDto updateWish(Long id, WishRequestDto requestDto) {
        Wish wish = findWishById(id);
        applyFields(wish, requestDto);
        return toResponse(this.wishRepository.save(wish));
    }

    // Elimina il tour insieme al suo gpx (che ha la foreign key verso il tour)
    @Transactional
    public void deleteWish(Long id) {
        Wish wish = findWishById(id);
        if (this.wishGpxRepository.existsById(id)) {
            this.wishGpxRepository.deleteById(id);
        }
        this.wishRepository.delete(wish);
    }

    public WishGpx findGpx(Long wishId) {
        findWishById(wishId); // verifica che l'idea sia dell'utente
        return this.wishGpxRepository.findById(wishId)
                .orElseThrow(() -> new WishGpxNotFoundException(wishId));
    }

    // Carica o sostituisce la traccia: per un tour ancora da fare si può cambiare idea
    @Transactional
    public WishResponseDto saveGpx(Long wishId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new EmptyGpxFileException();
        }
        Wish wish = findWishById(wishId);
        WishGpx gpx = this.wishGpxRepository.findById(wishId).orElseGet(() -> {
            WishGpx created = new WishGpx();
            created.setWish(wish);
            return created;
        });
        gpx.setFilename(file.getOriginalFilename());
        gpx.setContentType(file.getContentType());
        try {
            gpx.setData(file.getBytes());
        } catch (IOException e) {
            throw new GpxReadException(e);
        }
        this.wishGpxRepository.save(gpx);
        return WishResponseDto.from(wish, true);
    }

    @Transactional
    public WishResponseDto deleteGpx(Long wishId) {
        Wish wish = findWishById(wishId);
        if (!this.wishGpxRepository.existsById(wishId)) {
            throw new WishGpxNotFoundException(wishId);
        }
        this.wishGpxRepository.deleteById(wishId);
        return WishResponseDto.from(wish, false);
    }

    private void applyFields(Wish wish, WishRequestDto requestDto) {
        wish.setName(requestDto.name().trim());
        wish.setNotes(blankToNull(requestDto.notes()));
        wish.setLink(blankToNull(requestDto.link()));
        wish.setIdealPeriod(blankToNull(requestDto.idealPeriod()));
        wish.setLat(requestDto.lat());
        wish.setLon(requestDto.lon());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private WishResponseDto toResponse(Wish wish) {
        return WishResponseDto.from(wish, this.wishGpxRepository.existsById(wish.getId()));
    }
}
