package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record UpdateTrekLocationRequestDto(
        @NotNull(message = ErrorMessageConstants.LAT_REQUIRED)
        @DecimalMin(value = "-90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE)
        @DecimalMax(value = "90", message = ErrorMessageConstants.LAT_OUT_OF_RANGE) Double lat,
        @NotNull(message = ErrorMessageConstants.LON_REQUIRED)
        @DecimalMin(value = "-180", message = ErrorMessageConstants.LON_OUT_OF_RANGE)
        @DecimalMax(value = "180", message = ErrorMessageConstants.LON_OUT_OF_RANGE) Double lon
) {}
