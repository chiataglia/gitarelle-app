package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class GpxAlreadyExistsException extends GitarelleException {

    public GpxAlreadyExistsException(Long trekId) {
        super(HttpStatus.CONFLICT, String.format(ErrorMessageConstants.GPX_ALREADY_EXISTS, trekId));
    }
}
