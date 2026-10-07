package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.StatsDto;
import com.escursioni.gitarelle.dto.StatsDto.NameCount;
import com.escursioni.gitarelle.dto.StatsDto.TrekRecord;
import com.escursioni.gitarelle.dto.StatsDto.YearStat;
import com.escursioni.gitarelle.entities.Folder;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.entities.TrekGpx;
import com.escursioni.gitarelle.repositories.*;
import com.escursioni.gitarelle.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

// Statistiche calcolate al volo dai trek dell'utente (per un diario personale sono pochi dati)
@Service
public class StatsService {

    // "Mario, Luca e Anna" / "Mario; Luca & Anna" / "Mario + Luca"
    private static final Pattern COMPANION_SEPARATOR = Pattern.compile("\\s*(?:,|;|/|&|\\+|\\be\\b)\\s*", Pattern.CASE_INSENSITIVE);
    private static final int TOP = 5;

    private final TrekRepository trekRepository;
    private final TrekGpxRepository trekGpxRepository;
    private final FolderRepository folderRepository;
    private final WishRepository wishRepository;
    private final CurrentUser currentUser;

    public StatsService(TrekRepository trekRepository, TrekGpxRepository trekGpxRepository, FolderRepository folderRepository,
                        WishRepository wishRepository, CurrentUser currentUser) {
        this.trekRepository = trekRepository;
        this.trekGpxRepository = trekGpxRepository;
        this.folderRepository = folderRepository;
        this.wishRepository = wishRepository;
        this.currentUser = currentUser;
    }

    @Transactional
    public StatsDto getStats() {
        Long userId = this.currentUser.id();
        backfillGpxMetrics(userId);

        List<Trek> treks = this.trekRepository.findAllByOwnerId(userId);
        Map<Long, TrekGpxMetricsRow> metrics = this.trekGpxRepository.findMetricsByOwnerId(userId).stream()
                .collect(Collectors.toMap(TrekGpxMetricsRow::trekId, Function.identity()));

        double totalKm = 0, totalGain = 0;
        TrekRecord longest = null, climb = null;
        Map<Integer, int[]> treksPerYear = new TreeMap<>();
        Map<Integer, Double> kmPerYear = new HashMap<>();
        int[] byMonth = new int[12];
        LocalDate first = null, last = null;

        for (Trek t : treks) {
            TrekGpxMetricsRow m = metrics.get(t.getId());
            double km = m != null && m.distanceMeters() != null ? m.distanceMeters() / 1000 : 0;
            double gain = m != null && m.elevationGainMeters() != null ? m.elevationGainMeters() : 0;
            totalKm += km;
            totalGain += gain;
            if (km > 0 && (longest == null || km > longest.value())) longest = new TrekRecord(t.getId(), t.getTitle(), t.getTrekDate(), km);
            if (gain > 0 && (climb == null || gain > climb.value())) climb = new TrekRecord(t.getId(), t.getTitle(), t.getTrekDate(), gain);

            LocalDate d = t.getTrekDate();
            if (d != null) {
                treksPerYear.computeIfAbsent(d.getYear(), y -> new int[1])[0]++;
                kmPerYear.merge(d.getYear(), km, Double::sum);
                byMonth[d.getMonthValue() - 1]++;
                if (first == null || d.isBefore(first)) first = d;
                if (last == null || d.isAfter(last)) last = d;
            }
        }

        // anni consecutivi, anche quelli senza escursioni, così il grafico non salta gli anni "vuoti"
        List<YearStat> byYear = new ArrayList<>();
        if (!treksPerYear.isEmpty()) {
            int from = Collections.min(treksPerYear.keySet()), to = Collections.max(treksPerYear.keySet());
            for (int y = from; y <= to; y++) {
                int count = treksPerYear.containsKey(y) ? treksPerYear.get(y)[0] : 0;
                byYear.add(new YearStat(y, count, round1(kmPerYear.getOrDefault(y, 0d))));
            }
        }

        List<Folder> folders = this.folderRepository.findAllByOwnerIdOrderByNameAsc(userId);
        Map<Long, String> folderNames = folders.stream().collect(Collectors.toMap(Folder::getId, Folder::getName));
        Map<String, Integer> perFolder = new HashMap<>();
        for (Trek t : treks) {
            if (t.getFolder() != null) perFolder.merge(folderNames.get(t.getFolder().getId()), 1, Integer::sum);
        }

        int withGpx = metrics.size();
        return new StatsDto(
                treks.size(),
                withGpx,
                (int) treks.stream().filter(t -> t.getLat() != null && t.getLon() != null).count(),
                round1(totalKm),
                Math.round(totalGain),
                withGpx > 0 ? round1(totalKm / withGpx) : null,
                first,
                last,
                byYear,
                Arrays.stream(byMonth).boxed().toList(),
                top(countCompanions(treks)),
                top(perFolder),
                longest != null ? new TrekRecord(longest.id(), longest.title(), longest.date(), round1(longest.value())) : null,
                climb != null ? new TrekRecord(climb.id(), climb.title(), climb.date(), Math.round(climb.value())) : null,
                folders.size(),
                (int) this.wishRepository.countByOwnerId(userId)
        );
    }

    // gpx caricati prima che distanza e dislivello venissero calcolati all'upload: si calcolano una volta qui
    private void backfillGpxMetrics(Long userId) {
        for (TrekGpx gpx : this.trekGpxRepository.findWithoutMetricsByOwnerId(userId)) {
            GpxMetrics m = GpxMetrics.computeOrZero(gpx.getData());
            gpx.setDistanceMeters(m.distanceMeters());
            gpx.setElevationGainMeters(m.elevationGainMeters());
        }
    }

    // compagni di escursione dal campo libero "amichetti"; si conta una volta per trek, senza badare alle maiuscole
    private static Map<String, Integer> countCompanions(List<Trek> treks) {
        Map<String, Integer> counts = new HashMap<>();
        Map<String, String> displayName = new HashMap<>();
        for (Trek t : treks) {
            if (t.getAmichetti() == null) continue;
            Set<String> seen = new HashSet<>();
            for (String raw : COMPANION_SEPARATOR.split(t.getAmichetti().trim())) {
                String name = raw.trim();
                if (name.isEmpty()) continue;
                String key = name.toLowerCase(Locale.ROOT);
                if (!seen.add(key)) continue;
                displayName.putIfAbsent(key, name);
                counts.merge(key, 1, Integer::sum);
            }
        }
        Map<String, Integer> result = new HashMap<>();
        counts.forEach((key, n) -> result.put(displayName.get(key), n));
        return result;
    }

    private static List<NameCount> top(Map<String, Integer> counts) {
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(TOP)
                .map(e -> new NameCount(e.getKey(), e.getValue()))
                .toList();
    }

    private static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
