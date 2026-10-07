package com.escursioni.gitarelle.constants;

// Messaggi di errore restituiti dalle API (mostrati anche nel frontend)
public final class ErrorMessageConstants {

    private ErrorMessageConstants() {
    }

    // Autenticazione
    public static final String AUTH_REQUIRED = "Devi accedere per usare questa funzione";
    public static final String INVALID_CREDENTIALS = "Username o password non corretti";
    public static final String USERNAME_REQUIRED = "Lo username è obbligatorio";
    public static final String USERNAME_INVALID = "Lo username deve avere da 3 a 30 caratteri tra lettere, numeri, punto, trattino e underscore";
    public static final String USERNAME_TAKEN = "Lo username \"%s\" è già in uso";
    public static final String PASSWORD_REQUIRED = "La password è obbligatoria";
    public static final String PASSWORD_LENGTH = "La password deve avere da 8 a 72 caratteri";

    // Profilo
    public static final String FIRST_NAME_TOO_LONG = "Il nome può avere al massimo 60 caratteri";
    public static final String LAST_NAME_TOO_LONG = "Il cognome può avere al massimo 60 caratteri";
    public static final String AVATAR_NOT_FOUND = "Nessuna immagine del profilo";
    public static final String AVATAR_EMPTY = "L'immagine è vuota";
    public static final String AVATAR_TOO_LARGE = "L'immagine del profilo può pesare al massimo 1 MB";
    public static final String AVATAR_INVALID = "L'immagine deve essere JPEG, PNG o WebP";

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

    // Desideri (tour da fare)
    public static final String WISH_NOT_FOUND = "Idea di tour con id %d non trovata";
    public static final String WISH_GPX_NOT_FOUND = "Nessun GPX associato all'idea di tour con id %d";
    public static final String WISH_NAME_REQUIRED = "Il nome del tour è obbligatorio";
    public static final String WISH_NAME_TOO_LONG = "Il nome del tour può avere al massimo 120 caratteri";
    public static final String WISH_PERIOD_TOO_LONG = "Il periodo ideale può avere al massimo 60 caratteri";
    public static final String WISH_LINK_INVALID = "Il link deve essere un indirizzo web (http:// o https://)";
    public static final String WISH_LINK_TOO_LONG = "Il link può avere al massimo 1000 caratteri";

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
