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

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
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

            List<Map<String, Object>> normalizedEndpoints = normalizeEndpointsForScalar(request.endpoints());
            String endPoints = objectMapper.writeValueAsString(normalizedEndpoints);

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
        if (!StringUtils.hasText(endpointsJson) || endpointsJson.equals("{}")) {
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

    private List<Map<String, Object>> normalizeEndpointsForScalar(List<Map<String, Object>> rawEndpoints) {
        if (rawEndpoints == null) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> endpoint : rawEndpoints) {
            Map<String, Object> cleaned = castToMap(stripMetaEntries(endpoint));
            if (cleaned == null || cleaned.isEmpty()) {
                continue;
            }
            Map<String, Object> normalizedEndpoint = new LinkedHashMap<>(cleaned);
            normalizedEndpoint.putIfAbsent("method", "GET");
            normalizedEndpoint.putIfAbsent("path", "");
            Object responses = normalizedEndpoint.get("responses");
            if (!(responses instanceof Map<?, ?>)) {
                normalizedEndpoint.put("responses", Collections.emptyMap());
            }
            Object requestBody = normalizedEndpoint.get("requestBody");
            if (requestBody != null) {
                Map<String, Object> normalizedRequestBody = castToMap(requestBody);
                if (normalizedRequestBody != null) {
                    Object content = normalizedRequestBody.get("content");
                    if (content instanceof Map<?, ?> contentMap) {
                        Map<String, Object> cleanedContent = new LinkedHashMap<>();
                        contentMap.forEach((key, value) -> {
                            if (key == null) {
                                return;
                            }
                            Map<String, Object> contentEntry = castToMap(value);
                            if (contentEntry == null) {
                                return;
                            }
                            cleanedContent.put(String.valueOf(key), contentEntry);
                        });
                        normalizedRequestBody.put("content", cleanedContent);
                    }
                    normalizedEndpoint.put("requestBody", normalizedRequestBody);
                }
            }
            normalized.add(normalizedEndpoint);
        }
        return normalized;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToMap(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((key, val) -> {
                if (key instanceof String keyStr) {
                    result.put(keyStr, val);
                }
            });
            return result;
        }
        try {
            Map<String, Object> converted = objectMapper.convertValue(value, Map.class);
            return converted == null ? null : new LinkedHashMap<>(converted);
        } catch (IllegalArgumentException e) {
            log.warn("Map 변환 실패", e);
            return null;
        }
    }

    private Object stripMetaEntries(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((keyObj, val) -> {
                if (!(keyObj instanceof String key)) {
                    return;
                }
                if (key.startsWith("__")) {
                    return;
                }
                Object cleaned = stripMetaEntries(val);
                if (cleaned == null) {
                    return;
                }
                if (cleaned instanceof List<?> list && list.isEmpty()) {
                    return;
                }
                if (cleaned instanceof Map<?, ?> innerMap && innerMap.isEmpty()) {
                    return;
                }
                result.put(key, cleaned);
            });
            return result.isEmpty() ? null : result;
        }
        if (value instanceof List<?> list) {
            List<Object> cleanedList = new ArrayList<>();
            for (Object item : list) {
                Object cleaned = stripMetaEntries(item);
                if (cleaned == null) {
                    continue;
                }
                if (cleaned instanceof List<?> innerList && innerList.isEmpty()) {
                    continue;
                }
                if (cleaned instanceof Map<?, ?> innerMap && innerMap.isEmpty()) {
                    continue;
                }
                cleanedList.add(cleaned);
            }
            return cleanedList.isEmpty() ? null : cleanedList;
        }
        if (value instanceof String str) {
            return str.isBlank() ? null : str;
        }
        return value;
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
