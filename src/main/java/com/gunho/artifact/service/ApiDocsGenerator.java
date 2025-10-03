package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.ArtifactFile;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.model.UrlArtifact;
import com.gunho.artifact.repository.ArtifactFileRepository;
import com.gunho.artifact.repository.ApiDocsDocumentRepository;
import lombok.RequiredArgsConstructor;
import com.gunho.artifact.dto.ApiDocsRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ApiDocsGenerator {

    private final QuotaService quotaService;
    private final ArtifactFileRepository artifactFileRepository;
    private final ApiDocsDocumentRepository apiDocsDocumentRepository;

    @Transactional
    public ApiResponse<UrlArtifact> generateAsFiles(ApiDocsRequest req, User user) throws Exception {
        ApiDocsDocument document = apiDocsDocumentRepository.findByIdxAndUserIdx(req.getDocsIdx(), user.getIdx())
                .orElseThrow(() -> new ArtifactException("문서를 찾을 수 없습니다."));
        quotaService.consumeByDownload(user.getIdx());

        String openApiJson = buildOpenApiJson(req);
        String html = buildScalarHtmlInline(openApiJson);
        byte[] htmlBytes = html.getBytes(StandardCharsets.UTF_8);
        Path dir = Path.of("src", "main", "resources", "static",  "artifact", user.getId() ,"docs", req.getDocsIdx().toString());
        Files.createDirectories(dir);

        Path htmlPath = dir.resolve(req.getTitle() + ".html");
        Files.write(htmlPath, htmlBytes);
        long fileSize = Files.size(htmlPath);

        UrlArtifact urlArtifact = new UrlArtifact(
                "%s.html".formatted(req.getTitle()),
                "text/html",
                fileSize,
                "/static/artifact/" + user.getId() +  "/docs/" +  req.getDocsIdx().toString()  + "/%s.html".formatted(req.getTitle())
        );

        ArtifactFile artifactFile = document.getFile();
        if (artifactFile == null) {
            artifactFile = ArtifactFile.toEntity(user, req.getTitle(), req.getTitle(), dir.toString(), "html", fileSize);
            document.updateFile(artifactFile);
        } else {
            artifactFile.updateMetadata(req.getTitle(), req.getTitle(), dir.toString(), "html", fileSize);
        }

        artifactFileRepository.save(artifactFile);

        return ApiResponse.success(urlArtifact);
    }

    private String buildOpenApiJson(ApiDocsRequest req) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("openapi", "3.0.3");
        Map<String, Object> info = Map.of(
                "title", req.getTitle(),
                "version", req.getVersion()
        );
        root.put("info", info);

        Map<String, Object> paths = new LinkedHashMap<>();
        for (var ep : req.getEndpoints()) {
            String path = ep.getPath();
            String method = ep.getMethod().toLowerCase(Locale.ROOT);
            Map<String, Object> methodObj = new LinkedHashMap<>();

            if (ep.getSummary() != null) methodObj.put("summary", ep.getSummary());
            if (ep.getTags() != null) methodObj.put("tags", ep.getTags());
            Map<String, Object> requestBody = ep.getRequestBody();
            if (ep.getParams() != null && !ep.getParams().isEmpty()) {
                List<Map<String, Object>> filtered = new ArrayList<>();
                for (Map<String, Object> param : ep.getParams()) {
                    if (param == null) {
                        continue;
                    }
                    Object locationObj = param.get("in");
                    String location = locationObj != null ? locationObj.toString().toLowerCase(Locale.ROOT) : "";
                    if ("requestbody".equals(location) || "body".equals(location)) {
                        if (requestBody == null) {
                            requestBody = legacyParamToRequestBody(param);
                        }
                    } else {
                        filtered.add(param);
                    }
                }
                if (!filtered.isEmpty()) {
                    methodObj.put("parameters", filtered);
                }
            }
            if (requestBody != null && !requestBody.isEmpty()) {
                Map<String, Object> sanitized = sanitizeRequestBody(requestBody);
                if (!sanitized.isEmpty()) {
                    methodObj.put("requestBody", sanitized);
                }
            }

            Map<String, Object> responses = new LinkedHashMap<>();
            if (ep.getResponses() != null && !ep.getResponses().isEmpty()) {
                responses.putAll(ep.getResponses());
            } else {
                responses.put("200", Map.of("description", "OK"));
            }
            methodObj.put("responses", responses);

            Map<String, Object> pathItem = (Map<String, Object>) paths.getOrDefault(path, new LinkedHashMap<>());
            pathItem.put(method, methodObj);
            paths.put(path, pathItem);
        }
        root.put("paths", paths);

        return toJson(root);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> sanitizeRequestBody(Map<String, Object> requestBody) {
        if (requestBody == null) {
            return Collections.emptyMap();
        }
        Map<String, Object> copy = new LinkedHashMap<>(requestBody);
        copy.remove("enabled");
        copy.remove("contentType");

        Object required = copy.get("required");
        if (required instanceof String str) {
            copy.put("required", Boolean.parseBoolean(str));
        }

        Object contentObj = copy.get("content");
        if (contentObj instanceof Map<?, ?> contentMap) {
            Map<String, Object> sanitizedContent = new LinkedHashMap<>();
            contentMap.forEach((key, value) -> sanitizedContent.put(String.valueOf(key), value));
            copy.put("content", sanitizedContent);
        } else if (contentObj == null) {
            copy.remove("content");
        }

        Object sanitizedContentObj = copy.get("content");
        if (sanitizedContentObj instanceof Map<?, ?> sanitizedContent && sanitizedContent.isEmpty()) {
            copy.remove("content");
        }

        return copy.isEmpty() ? Collections.emptyMap() : copy;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> legacyParamToRequestBody(Map<String, Object> param) {
        if (param == null) {
            return null;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        Object description = param.get("description");
        if (description != null) {
            body.put("description", description);
        }
        Object required = param.get("required");
        if (required instanceof Boolean bool && bool) {
            body.put("required", true);
        } else if (required instanceof String str && Boolean.parseBoolean(str)) {
            body.put("required", true);
        }

        Object contentTypeObj = param.get("contentType");
        String contentType = (contentTypeObj != null && !contentTypeObj.toString().isBlank()) ? contentTypeObj.toString() : "application/json";
        Map<String, Object> mediaType = new LinkedHashMap<>();
        Object schemaObj = param.get("schema");
        if (schemaObj instanceof Map<?, ?> schemaMap) {
            mediaType.put("schema", schemaMap);
        } else {
            mediaType.put("schema", Map.of("type", "object"));
        }
        Object example = param.get("example");
        if (example != null) {
            mediaType.put("example", example);
        }

        Map<String, Object> content = new LinkedHashMap<>();
        content.put(contentType, mediaType);
        body.put("content", content);
        return body;
    }

    // Scalar API Reference: 인라인 JSON + 단일 script#api-reference (컨테이너 div 제거)
    private String buildScalarHtmlInline(String openapiJson) {
        // </script> 안전 처리
        String safeJson = openapiJson.replace("</script>", "<\\/script>");

        String template = """
                <!doctype html>
                <html lang="ko">
                <head>
                  <meta charset="utf-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <title>API 문서</title>
                  <style>
                    html, body { height: 100%; margin: 0; }
                  </style>
                </head>
                <body>
                  <!-- OpenAPI 스펙을 인라인으로 제공 (이 요소 하나만 id="api-reference") -->
                  <script id="api-reference" type="application/json">
                  ${SPEC_JSON}
                  </script>

                  <!-- Scalar API Reference 스크립트 -->
                  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
                </body>
                </html>
                """;

        return template.replace("${SPEC_JSON}", safeJson);
    }

    // 간단 JSON 직렬화
    private String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String s) return "\"" + escape(s) + "\"";
        if (obj instanceof Number || obj instanceof Boolean) return obj.toString();
        if (obj instanceof Map<?, ?> map) {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (var e : map.entrySet()) {
                if (!first) sb.append(",");
                sb.append(toJson(String.valueOf(e.getKey()))).append(":").append(toJson(e.getValue()));
                first = false;
            }
            sb.append("}");
            return sb.toString();
        }
        if (obj instanceof Iterable<?> it) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (var v : it) {
                if (!first) sb.append(",");
                sb.append(toJson(v));
                first = false;
            }
            sb.append("]");
            return sb.toString();
        }
        return "\"" + escape(String.valueOf(obj)) + "\"";
    }

    private String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String sha256Hex(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] d = md.digest(data);
        return HexFormat.of().formatHex(d);
    }
}
