package com.gunho.artifact.dto;

import jakarta.validation.constraints.NotNull;

public class EmailDto {

    public record RequestPlan(String from, String content, String plan, String price, String message){}
    public record RequestVerify(
            @NotNull(message = "아이디는 필수 값 입니다.")
            String id,
            @NotNull(message = "이름은 필수 값 입니다.")
            String nickName,
            @NotNull(message = "이메일은 필수 값 입니다.")
            String email){}
    public record Request(String from, String to, String subject, String content){}

}
