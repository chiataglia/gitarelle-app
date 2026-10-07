package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.constants.ErrorMessageConstants;
import jakarta.validation.constraints.NotBlank;

public record LoginRequestDto(
        @NotBlank(message = ErrorMessageConstants.USERNAME_REQUIRED) String username,
        @NotBlank(message = ErrorMessageConstants.PASSWORD_REQUIRED) String password
) {}
