package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.entities.Wish;

import java.time.Instant;

// Tour da fare restituito dalle API: hasGpx dice al frontend se c'è una traccia da mostrare
public record WishResponseDto(
        Long id,
        String name,
        String notes,
        String link,
        String idealPeriod,
        Double lat,
        Double lon,
        Instant createdAt,
        boolean hasGpx
) {

    public static WishResponseDto from(Wish wish, boolean hasGpx) {
        return new WishResponseDto(
                wish.getId(),
                wish.getName(),
                wish.getNotes(),
                wish.getLink(),
                wish.getIdealPeriod(),
                wish.getLat(),
                wish.getLon(),
                wish.getCreatedAt(),
                hasGpx
        );
    }
}
