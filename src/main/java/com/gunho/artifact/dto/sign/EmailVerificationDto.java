package com.gunho.artifact.dto.sign;

import jakarta.validation.constraints.NotBlank;

public class EmailVerificationDto {

    public record Request(
            @NotBlank(message = "이메일은 필수 값 입니다.")
            String email,
            @NotBlank(message = "인증코드는 필수 값 입니다.")
            String code){}
    public record Response(String message){}
}
