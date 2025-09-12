package com.gunho.artifact.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FileArtifact {
    private String fileName;
    private String contentType;
    private String base64; // 파일 콘텐츠(Base64)
}
