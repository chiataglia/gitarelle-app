package com.escursioni.gitarelle.constants;

// Messaggi di errore restituiti dalle API (mostrati anche nel frontend)
public final class ErrorMessageConstants {

    private ErrorMessageConstants() {
    }

    // Trek
    public static final String TREK_NOT_FOUND = "Escursione con id %d non trovata";
    public static final String TITLE_REQUIRED = "Il titolo è obbligatorio";
    public static final String LAT_REQUIRED = "La latitudine è obbligatoria";
    public static final String LON_REQUIRED = "La longitudine è obbligatoria";
    public static final String LAT_OUT_OF_RANGE = "La latitudine deve essere compresa tra -90 e 90";
    public static final String LON_OUT_OF_RANGE = "La longitudine deve essere compresa tra -180 e 180";
    public static final String LOCATION_INCOMPLETE = "Latitudine e longitudine vanno indicate entrambe o nessuna delle due";

    // Cartelle
    public static final String FOLDER_NOT_FOUND = "Cartella con id %d non trovata";
    public static final String FOLDER_NAME_REQUIRED = "Il nome della cartella è obbligatorio";
    public static final String FOLDER_NAME_TOO_LONG = "Il nome della cartella può avere al massimo 60 caratteri";
    public static final String FOLDER_ALREADY_EXISTS = "Esiste già una cartella chiamata \"%s\"";

    // GPX
    public static final String GPX_NOT_FOUND = "Nessun GPX associato all'escursione con id %d";
    public static final String GPX_ALREADY_EXISTS = "L'escursione con id %d ha già un GPX associato";
    public static final String GPX_EMPTY_FILE = "Il file GPX è vuoto";
    public static final String GPX_READ_ERROR = "Impossibile leggere il file GPX caricato";

    // Richiesta
    public static final String VALIDATION_FAILED = "Alcuni campi non sono validi";
    public static final String MALFORMED_REQUEST = "Il corpo della richiesta non è leggibile o è malformato";
    public static final String MISSING_PARAMETER = "Parametro obbligatorio mancante: %s";
    public static final String INVALID_PARAMETER = "Valore non valido per il parametro '%s'";
    public static final String FILE_TOO_LARGE = "Il file supera la dimensione massima consentita";

    // Generico
    public static final String INTERNAL_ERROR = "Si è verificato un errore imprevisto";
}
