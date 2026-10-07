package com.escursioni.gitarelle.exceptions;

import org.springframework.http.HttpStatus;

// Base di tutte le eccezioni applicative: ognuna porta con sé lo status HTTP da restituire
public abstract class GitarelleException extends RuntimeException {

    private final HttpStatus status;

    protected GitarelleException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    protected GitarelleException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
