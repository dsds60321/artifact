package com.gunho.artifact.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class FlowChartRequest {
    @NotNull
    private Long projectIdx;
    @NotNull
    private Long flowIdx;
    @NotBlank
    private String title;
    private String layout = "TB"; // TB, LR 등
    private String theme;

    @NotNull
    private List<Map<String, Object>> nodes; // {id,label,shape}
    @NotNull
    private List<Map<String, Object>> edges; // {from,to,label}

    private Map<String, Object> themeVariables; // 비 필수
    private Map<String, Object> classes; // 비 필수
}

