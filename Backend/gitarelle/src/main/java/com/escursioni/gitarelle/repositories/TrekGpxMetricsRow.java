package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.TrekGpx;

// Proiezione leggera di TrekGpx per le statistiche (senza il file)
public record TrekGpxMetricsRow(Long trekId, Double distanceMeters, Double elevationGainMeters) {

    public static TrekGpxMetricsRow of(TrekGpx gpx) {
        return new TrekGpxMetricsRow(gpx.getTrekId(), gpx.getDistanceMeters(), gpx.getElevationGainMeters());
    }
}
