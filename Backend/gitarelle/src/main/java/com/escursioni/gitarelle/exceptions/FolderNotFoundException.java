package com.escursioni.gitarelle.exceptions;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import org.springframework.http.HttpStatus;

public class FolderNotFoundException extends GitarelleException {

    public FolderNotFoundException(Long folderId) {
        super(HttpStatus.NOT_FOUND, String.format(ErrorMessageConstants.FOLDER_NOT_FOUND, folderId));
    }
}
