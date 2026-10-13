package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// Trek da aggiungere a una cartella (trascinati sulla cartella o scelti con "Aggiungi")
public record FolderTreksRequestDto(
        @NotEmpty(message = ErrorMessageConstants.FOLDER_TREKS_REQUIRED) List<@NotNull Long> trekIds
) {
}
