package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequestDto(
        @NotBlank(message = ErrorMessageConstants.USERNAME_REQUIRED)
        @Pattern(regexp = "^[A-Za-z0-9._-]{3,30}$", message = ErrorMessageConstants.USERNAME_INVALID) String username,
        // BCrypt considera solo i primi 72 byte: oltre non avrebbe senso
        @NotBlank(message = ErrorMessageConstants.PASSWORD_REQUIRED)
        @Size(min = 8, max = 72, message = ErrorMessageConstants.PASSWORD_LENGTH) String password
) {}
