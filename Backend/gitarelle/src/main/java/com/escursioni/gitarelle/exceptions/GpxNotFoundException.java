package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class GpxNotFoundException extends GitarelleException {

    public GpxNotFoundException(Long trekId) {
        super(HttpStatus.NOT_FOUND, String.format(ErrorMessageConstants.GPX_NOT_FOUND, trekId));
    }
}
