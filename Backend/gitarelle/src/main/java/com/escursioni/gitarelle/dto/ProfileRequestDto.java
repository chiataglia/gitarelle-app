package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.Size;

// Dati del profilo modificabili (lo username per ora no)
public record ProfileRequestDto(
        @Size(max = 60, message = ErrorMessageConstants.FIRST_NAME_TOO_LONG) String firstName,
        @Size(max = 60, message = ErrorMessageConstants.LAST_NAME_TOO_LONG) String lastName
) {}
