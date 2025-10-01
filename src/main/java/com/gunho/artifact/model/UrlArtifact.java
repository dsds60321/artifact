package com.gunho.artifact.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UrlArtifact {
    private String fileName;
    private String contentType;
    private long size;
    private String url; // 예: /files/flowcharts/{id}/flowchart.png
}
