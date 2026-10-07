package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class AvatarNotFoundException extends GitarelleException {

    public AvatarNotFoundException() {
        super(HttpStatus.NOT_FOUND, ErrorMessageConstants.AVATAR_NOT_FOUND);
    }
}
