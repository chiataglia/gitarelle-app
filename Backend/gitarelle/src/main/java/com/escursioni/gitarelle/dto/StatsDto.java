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
        List<MonthStat> byYearMonth, // mesi consecutivi dal primo all'ultimo trek (anche quelli a zero)
        List<NameCount> topCompanions,
        List<NameCount> topFolders,
        TrekRecord longestTrek,
        TrekRecord biggestClimb,
        int totalFolders,
        int totalWishes
) {

    public record YearStat(int year, int treks, double distanceKm, long elevationGainM) {}

    // month: "2025-03"
    public record MonthStat(String month, int treks, double distanceKm, long elevationGainM) {}

    public record NameCount(String name, int count) {}

    // value: km per il più lungo, metri per il dislivello
    public record TrekRecord(Long id, String title, LocalDate date, double value) {}
}
