package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class TrekNotFoundException extends GitarelleException {

    public TrekNotFoundException(Long trekId) {
        super(HttpStatus.NOT_FOUND, String.format(ErrorMessageConstants.TREK_NOT_FOUND, trekId));
    }
}
