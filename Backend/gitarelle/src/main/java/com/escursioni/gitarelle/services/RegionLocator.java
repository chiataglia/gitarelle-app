package com.escursioni.gitarelle.services;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

// Regione italiana di un punto, dai confini ISTAT in resources/geo (vedi il README lì accanto).
// Fuori dall'Italia → "Estero"
@Component
public class RegionLocator {

    public static final String ABROAD = "Estero";

    // un punto appena fuori da tutte le regioni (pin sulla spiaggia, confini semplificati di ~50 m)
    // prende la regione più vicina se dista meno di così
    private static final double TOLERANCE_M = 1000;
    private static final double TOLERANCE_DEG = 0.015; // margine abbondante per scartare le regioni lontane
    private static final double M_PER_DEG_LAT = 110_540;
    private static final double M_PER_DEG_LON_EQUATOR = 111_320;

    // anelli in [lon, lat]: esterni e buchi insieme (pari/dispari: un buco annulla l'esterno)
    private record Region(String name, List<double[][]> rings, double minLat, double maxLat, double minLon, double maxLon) {

        boolean nearBox(double lat, double lon, double margin) {
            return lat >= minLat - margin && lat <= maxLat + margin && lon >= minLon - margin && lon <= maxLon + margin;
        }
    }

    private final List<Region> regions;

    public RegionLocator() {
        this.regions = load();
    }

    // null se manca il punto
    public String regionOf(Double lat, Double lon) {
        if (lat == null || lon == null) return null;

        for (Region r : this.regions) {
            if (r.nearBox(lat, lon, 0) && contains(r, lat, lon)) return r.name();
        }

        Region nearest = null;
        double best = TOLERANCE_M;
        for (Region r : this.regions) {
            if (!r.nearBox(lat, lon, TOLERANCE_DEG)) continue;
            double d = distanceToEdgesM(r, lat, lon);
            if (d < best) {
                best = d;
                nearest = r;
            }
        }
        return nearest != null ? nearest.name() : ABROAD;
    }

    // ray casting: il punto è dentro se una semiretta verso est attraversa i bordi un numero dispari di volte
    private static boolean contains(Region r, double lat, double lon) {
        boolean inside = false;
        for (double[][] ring : r.rings()) {
            for (int i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                double xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
                if ((yi > lat) != (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
                    inside = !inside;
                }
            }
        }
        return inside;
    }

    // distanza (m) dal bordo più vicino, in proiezione piana attorno al punto: per pochi km basta
    private static double distanceToEdgesM(Region r, double lat, double lon) {
        double kx = M_PER_DEG_LON_EQUATOR * Math.cos(Math.toRadians(lat));
        double best = Double.MAX_VALUE;
        for (double[][] ring : r.rings()) {
            for (int i = 1; i < ring.length; i++) {
                double ax = (ring[i - 1][0] - lon) * kx, ay = (ring[i - 1][1] - lat) * M_PER_DEG_LAT;
                double bx = (ring[i][0] - lon) * kx, by = (ring[i][1] - lat) * M_PER_DEG_LAT;
                double dx = bx - ax, dy = by - ay;
                double len2 = dx * dx + dy * dy;
                double t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
                best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
            }
        }
        return best;
    }

    private static List<Region> load() {
        JsonNode root;
        try (InputStream in = new ClassPathResource("geo/regioni-italia.geojson").getInputStream()) {
            root = JsonMapper.builder().build().readTree(in);
        } catch (IOException e) {
            throw new UncheckedIOException("Confini delle regioni non leggibili", e);
        }

        List<Region> out = new ArrayList<>();
        for (JsonNode feature : root.get("features")) {
            List<double[][]> rings = new ArrayList<>();
            double minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
            for (JsonNode polygon : feature.get("geometry").get("coordinates")) {
                for (JsonNode ringNode : polygon) {
                    double[][] ring = new double[ringNode.size()][];
                    for (int i = 0; i < ring.length; i++) {
                        double lon = ringNode.get(i).get(0).asDouble(), lat = ringNode.get(i).get(1).asDouble();
                        ring[i] = new double[]{lon, lat};
                        minLat = Math.min(minLat, lat);
                        maxLat = Math.max(maxLat, lat);
                        minLon = Math.min(minLon, lon);
                        maxLon = Math.max(maxLon, lon);
                    }
                    rings.add(ring);
                }
            }
            out.add(new Region(feature.get("properties").get("name").asString(), rings, minLat, maxLat, minLon, maxLon));
        }
        return out;
    }
}
