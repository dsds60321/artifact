package com.gunho.artifact.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public class DocsDto {

    public record Request(
            Long docsIdx,
            Long projectIdx,
            @NotBlank(message = "제목은 필수 값 입니다.")
            String title,
            @NotBlank(message = "버전은 필수 값 입니다.")
            String version,
            @NotNull(message = "엔드포인트는 필수 값 입니다.")
            List<Map<String, Object>> endpoints
//            @NotBlank(message = "메소드는 필수 값 입니다.")
//            Method method,
//            @NotBlank(message = "경로는 필수 값 입니다.")
//            String path,
//            String summary,
//            List<String> tags,
//            List<Map<String, Object>> params,
//            Map<String, Map<String, Object>> responses
    ){}
}
