package com.gunho.artifact.service;

import lombok.RequiredArgsConstructor;
import com.gunho.artifact.dto.ApiDocsRequest;
import com.gunho.artifact.model.FileArtifact;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SimpleApiDocsGenerator {

    public List<FileArtifact> generate(ApiDocsRequest req) {
        String openapiJson = buildOpenApiJson(req);

        // Scalar 인라인 렌더링 HTML (중복 id 제거, 컨테이너 div 제거)
        String html = buildScalarHtmlInline(openapiJson);

        String openapiB64 = Base64.getEncoder().encodeToString(openapiJson.getBytes(StandardCharsets.UTF_8));
        String htmlB64 = Base64.getEncoder().encodeToString(html.getBytes(StandardCharsets.UTF_8));

        return List.of(
                new FileArtifact("openapi.json", "application/json", openapiB64), // 참고용 제공
                new FileArtifact("index.html", "text/html; charset=UTF-8", htmlB64)
        );
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
            if (ep.getParams() != null && !ep.getParams().isEmpty()) {
                methodObj.put("parameters", ep.getParams());
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
}

