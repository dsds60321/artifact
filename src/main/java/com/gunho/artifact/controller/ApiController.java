package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.gunho.artifact.dto.ApiDocsRequest;
import com.gunho.artifact.dto.FlowChartRequest;
import com.gunho.artifact.model.UrlArtifact;
import org.springframework.context.annotation.Description;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/generate")
public class ApiController {

    private final FlowChartGenerator flowChartGenerator;
    private final ApiDocsGenerator apiDocsGenerator;
    private final PptDeckGenerator pptDeckGenerator;

    // URL 기반 응답(파일 저장 후 링크 반환)
    @Description("API FLOW")
    @PostMapping(value = "/flowchart-url", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<UrlArtifact> flowchartUrl(@Valid @RequestBody FlowChartRequest req) throws Exception {
        return flowChartGenerator.generateAsFiles(req);
    }

    @Description("API 명세서")
    @PostMapping(value = "/docs-url", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<UrlArtifact> apiDocs(@Valid @RequestBody ApiDocsRequest req) throws Exception {
        return apiDocsGenerator.generateAsFiles(req);
    }
}

