package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class FolderAlreadyExistsException extends GitarelleException {

    public FolderAlreadyExistsException(String name) {
        super(HttpStatus.CONFLICT, String.format(ErrorMessageConstants.FOLDER_ALREADY_EXISTS, name));
    }
}
