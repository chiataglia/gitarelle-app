package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

// Usato sia per creare sia per modificare un trek (PUT /treks/{id} sostituisce tutti i campi).
// lat/lon facoltativi: il punto si può aggiungere dopo (o ricavarlo dal gpx)
public record CreateTrekRequestDto(
        @NotBlank(message = ErrorMessageConstants.TITLE_REQUIRED) String title,
        LocalDate trekDate,
        String amichetti,
        String notes,
        @DecimalMin(value = "-90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE)
        @DecimalMax(value = "90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE) Double lat,
        @DecimalMin(value = "-180", message = ErrorMessageConstants.LON_OUT_OF_RANGE)
        @DecimalMax(value = "180", message = ErrorMessageConstants.LON_OUT_OF_RANGE) Double lon,
        Long folderId // facoltativo: cartella in cui mettere il trek
) {

    @AssertTrue(message = ErrorMessageConstants.LOCATION_INCOMPLETE)
    public boolean isLocationComplete() {
        return (lat == null) == (lon == null);
    }
}
