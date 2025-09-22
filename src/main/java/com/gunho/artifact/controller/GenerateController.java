package com.gunho.artifact.controller;

import com.gunho.artifact.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.gunho.artifact.dto.ApiDocsRequest;
import com.gunho.artifact.dto.FlowChartRequest;
import com.gunho.artifact.dto.PptDeckRequest;
import com.gunho.artifact.model.FileArtifact;
import com.gunho.artifact.model.UrlArtifact;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/generate")
public class GenerateController {

    private final FlowChartGenerator flowChartGenerator;
    private final FlowChartGenerator2 flowChartGenerator2;
    private final FlowChartGenerator3 flowChartGenerator3;
    private final PptDeckGenerator pptDeckGenerator;
    private final SimpleApiDocsGenerator simpleApiDocsGenerator;

    @PostMapping(value = "/flowchart", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<FileArtifact>> flowchart(@Valid @RequestBody FlowChartRequest req) throws Exception {
        return ResponseEntity.ok(flowChartGenerator2.generate(req));
    }

    // URL 기반 응답(파일 저장 후 링크 반환)
    @PostMapping(value = "/flowchart-url", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<UrlArtifact>> flowchartUrl(@Valid @RequestBody FlowChartRequest req) throws Exception {
        return ResponseEntity.ok(flowChartGenerator2.generateAsFiles(req));
    }

    @PostMapping(value = "/ppt", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<FileArtifact> ppt(@Valid @RequestBody PptDeckRequest req) throws Exception {
        return ResponseEntity.ok(pptDeckGenerator.generate(req));
    }

    @PostMapping(value = "/api-docs", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<FileArtifact>> apiDocs(@Valid @RequestBody ApiDocsRequest req) throws Exception {
        return ResponseEntity.ok(simpleApiDocsGenerator.generate(req));
    }
}

