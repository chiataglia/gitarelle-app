package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

// Stesso messaggio sia per utente inesistente sia per password sbagliata: non si rivela quali username esistono
public class InvalidCredentialsException extends GitarelleException {

    public InvalidCredentialsException() {
        super(HttpStatus.UNAUTHORIZED, ErrorMessageConstants.INVALID_CREDENTIALS);
    }
}
