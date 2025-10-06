package com.gunho.artifact.dto.sign;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SignUpDto {

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Request {

        @NotBlank(message = "아이디는 필수 값 입니다.")
        @Pattern(regexp = "^[A-Za-z0-9_]{4,20}$", message = "아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.")
        private String userId;

        @NotBlank(message = "이름은 필수 값 입니다.")
        private String firstName;

        @NotBlank(message = "성은 필수 값 입니다.")
        private String lastName;

        @NotBlank(message = "이메일은 필수 값 입니다.")
        @Email(message = "올바른 이메일 형식을 입력해 주세요.")
        private String email;

        @Size(max = 20, message = "전화번호는 20자 이내로 입력해 주세요.")
        private String phone;

        @NotBlank(message = "비밀번호는 필수 값 입니다.")
        @Size(min = 8, max = 64, message = "비밀번호는 8자 이상 64자 이하로 입력해 주세요.")
        private String password;

        @NotBlank(message = "비밀번호 확인은 필수 값 입니다.")
        private String passwordConfirm;

        private boolean agreeTerms;
        private boolean agreePrivacy;
    }
}
