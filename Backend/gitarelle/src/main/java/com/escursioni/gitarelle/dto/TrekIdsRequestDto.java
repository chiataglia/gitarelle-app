package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// Più trek su cui fare la stessa operazione (es. eliminazione di quelli scelti nello storico)
public record TrekIdsRequestDto(
        @NotEmpty(message = ErrorMessageConstants.TREK_IDS_REQUIRED) List<@NotNull Long> trekIds
) {
}
