package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

// Valutazione di un trek: ogni voto è facoltativo (null = non dato), notes è il testo della recensione
public record TrekReviewRequestDto(
        Double rating, // stelle da 1 a 5, a mezzi punti
        @Min(value = 1, message = ErrorMessageConstants.EFFORT_OUT_OF_RANGE)
        @Max(value = 10, message = ErrorMessageConstants.EFFORT_OUT_OF_RANGE) Integer effort,
        @Min(value = 1, message = ErrorMessageConstants.SCENERY_OUT_OF_RANGE)
        @Max(value = 10, message = ErrorMessageConstants.SCENERY_OUT_OF_RANGE) Integer scenery,
        Boolean dangerous, // null = non indicato
        @Size(max = 30, message = ErrorMessageConstants.TAGS_TOO_MANY)
        Set<@NotBlank(message = ErrorMessageConstants.TAG_INVALID) @Size(max = 30, message = ErrorMessageConstants.TAG_INVALID) String> tags, // facoltativo
        String notes
) {

    @AssertTrue(message = ErrorMessageConstants.RATING_INVALID)
    public boolean isRatingValid() {
        return rating == null || (rating >= 1 && rating <= 5 && rating * 2 == Math.floor(rating * 2));
    }
}
