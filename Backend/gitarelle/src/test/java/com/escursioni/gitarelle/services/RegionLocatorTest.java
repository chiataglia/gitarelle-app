package com.escursioni.gitarelle.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class RegionLocatorTest {

    private static final RegionLocator LOCATOR = new RegionLocator();

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = ';', value = {
            "Corno Grande, Gran Sasso;      42.4692; 13.5658; Abruzzo",
            "Rifugio Franchetti;            42.4669; 13.5767; Abruzzo",
            "Campo Imperatore;              42.4428; 13.5586; Abruzzo",
            "Courmayeur;                    45.7915;  6.9725; Valle d'Aosta",
            "Bolzano;                       46.4983; 11.3548; Trentino-Alto Adige",
            "Milano;                        45.4642;  9.1900; Lombardia",
            "Roma;                          41.9028; 12.4964; Lazio",
            "Monte Cimone;                  44.1936; 10.7006; Emilia-Romagna",
            "Rimini, spiaggia;              44.0678; 12.5770; Emilia-Romagna",
            "Cagliari;                      39.2238;  9.1217; Sardegna",
            "Etna;                          37.7510; 14.9934; Sicilia",
            "Zermatt, Svizzera;             46.0207;  7.7491; Estero",
            "Lugano, Svizzera;              46.0037;  8.9511; Estero",
            "San Marino;                    43.9356; 12.4473; Estero",
            "Chamonix, Francia;             45.9237;  6.8694; Estero",
            "Parigi;                        48.8566;  2.3522; Estero",
    })
    void regionOfKnownPlaces(String place, double lat, double lon, String expected) {
        assertEquals(expected, LOCATOR.regionOf(lat, lon), place);
    }

    @Test
    void noPointNoRegion() {
        assertNull(LOCATOR.regionOf(null, 12.5));
        assertNull(LOCATOR.regionOf(42.5, null));
    }
}
