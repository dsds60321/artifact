package com.gunho.artifact.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public class FlowChartDto {

    public record Request(
            Long flowIdx, // 수정시
            @NotBlank(message = "제목은 필수 값 입니다.")
            String title,
            @NotBlank(message = "레이아웃은 필수 값 입니다.")
            String layout,
            @NotBlank(message = "테마를 선택해 주세요.")
            String theme,
            @NotNull(message = "노드를 입력해주세요.")
            List<Map<String, Object>> nodes,
            @NotNull(message = "연결관리를 입력해주세요.")
            List<Map<String, Object>> edges,
            Map<String, Object> themeVariables,
            Map<String, Object> classes,
            Long projectIdx
    ){}

//    @NotBlank
//    private String title;
//    private String layout = "TB"; // TB, LR 등
//    private String theme;
//
//    @NotNull
//    private List<Map<String, Object>> nodes; // {id,label,shape}
//    @NotNull
//    private List<Map<String, Object>> edges; // {from,to,label}
//
//    private Map<String, Object> themeVariables; // 비 필수
//    private Map<String, Object> classes; // 비 필수
}

