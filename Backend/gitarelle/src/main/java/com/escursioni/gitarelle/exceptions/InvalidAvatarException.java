package com.escursioni.gitarelle.exceptions;

import org.springframework.http.HttpStatus;

// Immagine del profilo vuota, troppo grande o di un formato non ammesso
public class InvalidAvatarException extends GitarelleException {

    public InvalidAvatarException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
