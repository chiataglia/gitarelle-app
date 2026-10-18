package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.entities.Folder;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.repositories.TrekGpxMetricsRow;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

// Trek restituito dalle API: hasGpx dice al frontend se c'è una traccia da mostrare,
// distanza e dislivello (in metri) ci sono solo se c'è il gpx
public record TrekResponseDto(
        Long id,
        String title,
        LocalDate trekDate,
        String amichetti,
        String notes,
        Double lat,
        Double lon,
        String region, // regione italiana o "Estero"; null se il trek non ha né punto né gpx
        String color,  // colore della traccia ("#rrggbb"); null = automatico
        Double rating,      // valutazione: tutti null finché non si valuta
        Integer effort,
        Integer scenery,
        String effortLabel,  // scritte proprie dei voti; null = automatiche
        String sceneryLabel,
        Boolean dangerous,
        List<String> tags,
        Instant createdAt,
        List<Long> folderIds, // cartelle in cui sta il trek (anche nessuna)
        boolean hasGpx,
        Double distanceMeters,
        Double elevationGainMeters
) {

    // gpx: metriche della traccia del trek, null se non ha gpx
    public static TrekResponseDto from(Trek trek, TrekGpxMetricsRow gpx) {
        return new TrekResponseDto(
                trek.getId(),
                trek.getTitle(),
                trek.getTrekDate(),
                trek.getAmichetti(),
                trek.getNotes(),
                trek.getLat(),
                trek.getLon(),
                trek.getRegion(),
                trek.getColor(),
                trek.getRating(),
                trek.getEffort(),
                trek.getScenery(),
                trek.getEffortLabel(),
                trek.getSceneryLabel(),
                trek.getDangerous(),
                trek.getTags().stream().sorted().toList(),
                trek.getCreatedAt(),
                trek.getFolders().stream().map(Folder::getId).sorted().toList(),
                gpx != null,
                gpx != null ? gpx.distanceMeters() : null,
                gpx != null ? gpx.elevationGainMeters() : null
        );
    }
}
