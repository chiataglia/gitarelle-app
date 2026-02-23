package com.escursioni.gitarelle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateTrekRequestDto(
        @NotBlank String title,
        LocalDate trekDate,
        String amichetti,
        String notes,
        @NotNull Double lat,
        @NotNull Double lon
) {}
