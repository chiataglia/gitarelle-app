package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class WishGpxNotFoundException extends GitarelleException {

    public WishGpxNotFoundException(Long wishId) {
        super(HttpStatus.NOT_FOUND, String.format(ErrorMessageConstants.WISH_GPX_NOT_FOUND, wishId));
    }
}
