package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class UsernameAlreadyExistsException extends GitarelleException {

    public UsernameAlreadyExistsException(String username) {
        super(HttpStatus.CONFLICT, String.format(ErrorMessageConstants.USERNAME_TAKEN, username));
    }
}
