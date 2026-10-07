package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class WishNotFoundException extends GitarelleException {

    public WishNotFoundException(Long wishId) {
        super(HttpStatus.NOT_FOUND, String.format(ErrorMessageConstants.WISH_NOT_FOUND, wishId));
    }
}
