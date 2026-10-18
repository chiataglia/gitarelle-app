package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.Pattern;

// Colore della traccia di un trek (o di tutti i trek di una cartella): "#rrggbb", null = colore automatico
public record TrekColorRequestDto(
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = ErrorMessageConstants.COLOR_INVALID) String color
) {

    // sempre minuscolo, così lo stesso colore si salva in un modo solo
    public String normalized() {
        return color != null ? color.toLowerCase() : null;
    }
}
