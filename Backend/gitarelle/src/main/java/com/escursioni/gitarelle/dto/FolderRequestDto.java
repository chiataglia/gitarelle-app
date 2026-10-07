package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Creazione e rinomina di una cartella
public record FolderRequestDto(
        @NotBlank(message = ErrorMessageConstants.FOLDER_NAME_REQUIRED)
        @Size(max = 60, message = ErrorMessageConstants.FOLDER_NAME_TOO_LONG) String name
) {}
