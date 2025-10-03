package com.gunho.artifact.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.DocsDto;
import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.ApiDocsFlow;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.repository.ApiDocsDocumentRepository;
import com.gunho.artifact.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocsService {

    private final ProjectRepository projectRepository;
    private final ApiDocsDocumentRepository apiDocsDocumentRepository;
    private final ObjectMapper objectMapper;
    private final QuotaService quotaService;

    @Transactional
    public ApiResponse<?> saveDocs(DocsDto.Request request, User user) {
        try {
            projectRepository.findById(request.projectIdx())
                    .orElseThrow(() -> new ArtifactException("프로젝트를 찾을 수 없습니다."));

            ApiDocsDocument docs = apiDocsDocumentRepository.findById(request.docsIdx())
                    .orElseThrow(() -> new ArtifactException("문서를 찾을 수 없습니다."));

            String endPoints = objectMapper.writeValueAsString(request.endpoints());

            docs.updateEndPoints(request, endPoints, user.getId());
            return ApiResponse.success("문서가 성공적으로 수정되었습니다.");
        } catch (Exception e) {
            log.error("Docs save error", e);
            return ApiResponse.failure(e.getMessage());
        }
    }

    public void getDetailView(Model model, Long idx, User user) {

        ApiDocsDocument docs = apiDocsDocumentRepository.findByIdxAndUserIdx(idx, user.getIdx())
                .orElseThrow(() -> new ArtifactException("프로젝트를 찾을 수 없습니다."));

        String endpointsJson = StringUtils.hasText(docs.getEndpoints()) ? docs.getEndpoints() : "[]";

        model.addAttribute("idx", idx);
        model.addAttribute("projectIdx", docs.getProject().getIdx());
        model.addAttribute("docs", docs);
        model.addAttribute("apiDocsSpec", buildSpecJson(docs.getTitle(), docs.getVersion(), endpointsJson));
    }

    public String buildEmptySpecJson() {
        return buildSpecJson("", "", "[]");
    }

    private String buildSpecJson(String title, String version, String endpointsJson) {
        try {
            List<Map<String, Object>> endpoints = readEndpoints(endpointsJson);
            Map<String, Object> spec = Map.of(
                    "title", StringUtils.hasText(title) ? title : "",
                    "version", StringUtils.hasText(version) ? version : "",
                    "endpoints", endpoints
            );
            return objectMapper.writeValueAsString(spec);
        } catch (Exception e) {
            log.warn("Spec 직렬화 실패", e);
            return "{\"title\":\"\",\"version\":\"\",\"endpoints\":[]}";
        }
    }

    private List<Map<String, Object>> readEndpoints(String endpointsJson) {
        if (!StringUtils.hasText(endpointsJson)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(endpointsJson, new TypeReference<>() {
            });
        } catch (Exception e) {
            log.warn("엔드포인트 파싱 실패", e);
            return Collections.emptyList();
        }
    }

    @Transactional
    public ApiResponse<?> deleteDocs(Long idx, User user) {
        ApiDocsDocument docs = apiDocsDocumentRepository.findByIdxAndUserIdx(idx, user.getIdx())
                .orElseThrow(() -> {
                    log.warn("다른 유저 삭제 요청발생함 userId : {} , flowIdx : {} ", user.getId(), idx);
                    return new ArtifactException("해당 문서 삭제 권한이 없습니다.");
                });

        apiDocsDocumentRepository.delete(docs);
        quotaService.deleteByArtifact(user.getIdx());
        return ApiResponse.success("해당 문서 삭제에 성공했습니다.");
    }
}
