package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class EmptyGpxFileException extends GitarelleException {

    public EmptyGpxFileException() {
        super(HttpStatus.BAD_REQUEST, ErrorMessageConstants.GPX_EMPTY_FILE);
    }
}
