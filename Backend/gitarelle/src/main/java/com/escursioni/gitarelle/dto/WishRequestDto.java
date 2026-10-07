package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.*;

// Creazione e modifica di un tour da fare: solo il nome è obbligatorio
public record WishRequestDto(
        @NotBlank(message = ErrorMessageConstants.WISH_NAME_REQUIRED)
        @Size(max = 120, message = ErrorMessageConstants.WISH_NAME_TOO_LONG) String name,
        String notes,
        @Pattern(regexp = "^https?://\\S+$", message = ErrorMessageConstants.WISH_LINK_INVALID)
        @Size(max = 1000, message = ErrorMessageConstants.WISH_LINK_TOO_LONG) String link,
        @Size(max = 60, message = ErrorMessageConstants.WISH_PERIOD_TOO_LONG) String idealPeriod,
        @DecimalMin(value = "-90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE)
        @DecimalMax(value = "90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE) Double lat,
        @DecimalMin(value = "-180", message = ErrorMessageConstants.LON_OUT_OF_RANGE)
        @DecimalMax(value = "180", message = ErrorMessageConstants.LON_OUT_OF_RANGE) Double lon
) {

    @AssertTrue(message = ErrorMessageConstants.LOCATION_INCOMPLETE)
    public boolean isLocationComplete() {
        return (lat == null) == (lon == null);
    }
}
