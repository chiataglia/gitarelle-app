package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class GpxReadException extends GitarelleException {

    public GpxReadException(Throwable cause) {
        super(HttpStatus.BAD_REQUEST, ErrorMessageConstants.GPX_READ_ERROR, cause);
    }
}
