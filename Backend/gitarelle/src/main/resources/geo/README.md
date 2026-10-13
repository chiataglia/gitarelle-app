# Confini delle regioni italiane

`regioni-italia.geojson`: limiti amministrativi delle 20 regioni, usati da `RegionLocator` per ricavare
la regione di un trek dal suo punto (o dalla partenza del gpx).

- Fonte: ISTAT, tramite [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy)
  (`limits_IT_regions.geojson`), licenza [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Modifiche: tracciati semplificati (Douglas-Peucker, tolleranza ~50 m), coordinate a 5 decimali,
  conservato solo il nome della regione (per le regioni bilingui solo la parte italiana).
