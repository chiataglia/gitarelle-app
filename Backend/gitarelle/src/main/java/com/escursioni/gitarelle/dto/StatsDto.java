package com.escursioni.gitarelle.dto;

import java.time.LocalDate;
import java.util.List;

// Statistiche del diario dell'utente. Distanze e dislivelli vengono solo dai trek con gpx.
public record StatsDto(
        int totalTreks,
        int treksWithGpx,
        int treksWithPoint,
        double totalDistanceKm,
        double totalElevationGainM,
        Double averageDistanceKm,  // null senza gpx
        LocalDate firstTrekDate,
        LocalDate lastTrekDate,
        List<YearStat> byYear,     // anni consecutivi dal primo all'ultimo (anche quelli a zero)
        List<Integer> byMonth,     // 12 valori, gennaio → dicembre, sommati su tutti gli anni
        List<NameCount> topCompanions,
        List<NameCount> topFolders,
        TrekRecord longestTrek,
        TrekRecord biggestClimb,
        int totalFolders,
        int totalWishes
) {

    public record YearStat(int year, int treks, double distanceKm) {}

    public record NameCount(String name, int count) {}

    // value: km per il più lungo, metri per il dislivello
    public record TrekRecord(Long id, String title, LocalDate date, double value) {}
}
