package com.gunho.artifact.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ApiDocsRequest {
    @NotNull
    private Long projectIdx;
    @NotNull
    private Long docsIdx;
    @NotBlank
    private String title;
    private String version = "1.0.0";
    @NotNull
    private List<Endpoint> endpoints; // 최소 정보로 OpenAPI-like 생성

    @Data
    public static class Endpoint {
        @NotBlank private String method; // GET/POST/...
        @NotBlank private String path;   // /orders
        private String summary;
        private List<Map<String, Object>> params;    // {in,name,required,type}
        private Map<String, Map<String, Object>> responses; // "200": {description: "..."}
        private List<String> tags;
    }
}
