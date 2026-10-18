package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.util.List;

// Usato sia per creare sia per modificare un trek (PUT /treks/{id} sostituisce tutti i campi).
// lat/lon facoltativi: il punto si può aggiungere dopo (o ricavarlo dal gpx).
// review e color valgono solo alla creazione (facoltativi): dopo si cambiano con /review e /color, e il PUT li ignora
public record CreateTrekRequestDto(
        @NotBlank(message = ErrorMessageConstants.TITLE_REQUIRED) String title,
        LocalDate trekDate,
        String amichetti,
        String notes,
        @DecimalMin(value = "-90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE)
        @DecimalMax(value = "90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE) Double lat,
        @DecimalMin(value = "-180", message = ErrorMessageConstants.LON_OUT_OF_RANGE)
        @DecimalMax(value = "180", message = ErrorMessageConstants.LON_OUT_OF_RANGE) Double lon,
        List<Long> folderIds, // facoltativo: cartelle in cui mettere il trek
        @Valid TrekReviewRequestDto review, // valutazione (il suo testo sostituisce notes)
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = ErrorMessageConstants.COLOR_INVALID) String color
) {

    @AssertTrue(message = ErrorMessageConstants.LOCATION_INCOMPLETE)
    public boolean isLocationComplete() {
        return (lat == null) == (lon == null);
    }
}
