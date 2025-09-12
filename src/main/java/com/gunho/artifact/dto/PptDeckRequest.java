package com.gunho.artifact.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class PptDeckRequest {
    @NotBlank
    private String title;
    private List<Section> sections;

    @Data
    public static class Section {
        private String h1;
        private String markdown;      // 이번 버전은 그대로 텍스트로 삽입
        private List<String> images;  // URL(PNG/JPG 권장)
    }
}
