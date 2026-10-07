package com.escursioni.gitarelle.repositories;

// Proiezione leggera di TrekGpx per le statistiche (senza il file)
public record TrekGpxMetricsRow(Long trekId, Double distanceMeters, Double elevationGainMeters) {}
