package com.escursioni.gitarelle.services;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.ByteArrayInputStream;

// Distanza e dislivello positivo di una traccia gpx (valori indicativi, come quelli delle app di trekking)
public record GpxMetrics(double distanceMeters, double elevationGainMeters) {

    private static final double EARTH_RADIUS_M = 6_371_000;
    // sotto questa variazione di quota si considera rumore del gps: evita di gonfiare il dislivello
    private static final double ELEVATION_THRESHOLD_M = 3;

    // come compute, ma un file non leggibile vale 0 (così non si riprova a calcolarlo ogni volta)
    public static GpxMetrics computeOrZero(byte[] gpx) {
        try {
            return compute(gpx);
        } catch (XMLStreamException | RuntimeException e) {
            return new GpxMetrics(0, 0);
        }
    }

    public static GpxMetrics compute(byte[] gpx) throws XMLStreamException {
        XMLInputFactory factory = XMLInputFactory.newFactory();
        // file caricato dall'utente: niente DTD né entità esterne (XXE)
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);

        XMLStreamReader xml = factory.createXMLStreamReader(new ByteArrayInputStream(gpx));
        double distance = 0;
        double gain = 0;
        Double prevLat = null, prevLon = null;  // punto precedente nello stesso segmento
        Double refEle = null;                    // quota di riferimento per il dislivello
        Double lat = null, lon = null;
        boolean inEle = false;
        StringBuilder eleText = new StringBuilder();

        try {
            while (xml.hasNext()) {
                int event = xml.next();
                if (event == XMLStreamConstants.START_ELEMENT) {
                    String name = xml.getLocalName();
                    switch (name) {
                        // nuovo segmento/rotta: non si unisce all'ultimo punto del precedente
                        case "trkseg", "rte" -> { prevLat = null; prevLon = null; }
                        case "trkpt", "rtept" -> {
                            lat = parse(xml.getAttributeValue(null, "lat"));
                            lon = parse(xml.getAttributeValue(null, "lon"));
                        }
                        case "ele" -> {
                            if (lat != null) { inEle = true; eleText.setLength(0); }
                        }
                        default -> { }
                    }
                } else if (event == XMLStreamConstants.CHARACTERS && inEle) {
                    eleText.append(xml.getText());
                } else if (event == XMLStreamConstants.END_ELEMENT) {
                    String name = xml.getLocalName();
                    if (name.equals("ele") && inEle) {
                        inEle = false;
                        Double ele = parse(eleText.toString().trim());
                        if (ele != null) {
                            if (refEle == null) refEle = ele;
                            else if (ele - refEle >= ELEVATION_THRESHOLD_M) { gain += ele - refEle; refEle = ele; }
                            else if (refEle - ele >= ELEVATION_THRESHOLD_M) refEle = ele;
                        }
                    } else if ((name.equals("trkpt") || name.equals("rtept")) && lat != null && lon != null) {
                        if (prevLat != null) distance += haversine(prevLat, prevLon, lat, lon);
                        prevLat = lat;
                        prevLon = lon;
                        lat = null;
                        lon = null;
                    }
                }
            }
        } finally {
            xml.close();
        }
        return new GpxMetrics(distance, gain);
    }

    private static Double parse(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
    }
}
