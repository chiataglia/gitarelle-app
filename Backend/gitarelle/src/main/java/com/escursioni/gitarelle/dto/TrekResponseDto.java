package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.entities.Trek;

import java.time.Instant;
import java.time.LocalDate;

// Trek restituito dalle API: hasGpx dice al frontend se c'è una traccia da mostrare
public record TrekResponseDto(
        Long id,
        String title,
        LocalDate trekDate,
        String amichetti,
        String notes,
        Double lat,
        Double lon,
        Instant createdAt,
        Long folderId,
        boolean hasGpx
) {

    public static TrekResponseDto from(Trek trek, boolean hasGpx) {
        return new TrekResponseDto(
                trek.getId(),
                trek.getTitle(),
                trek.getTrekDate(),
                trek.getAmichetti(),
                trek.getNotes(),
                trek.getLat(),
                trek.getLon(),
                trek.getCreatedAt(),
                trek.getFolder() != null ? trek.getFolder().getId() : null,
                hasGpx
        );
    }
}
