package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.FlowChartRequest;
import com.gunho.artifact.model.FileArtifact;
import com.gunho.artifact.model.UrlArtifact;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FlowChartGenerator3 {

    private String htmlTemplate;

    public List<FileArtifact> generate(FlowChartRequest req) throws Exception {
        String html = generateHtmlFromTemplate(req);
        String mermaid = toMermaid(req);

        String htmlBase64 = Base64.getEncoder().encodeToString(html.getBytes(StandardCharsets.UTF_8));
        String mmdBase64 = Base64.getEncoder().encodeToString(mermaid.getBytes(StandardCharsets.UTF_8));

        List<FileArtifact> out = new ArrayList<>();
        out.add(new FileArtifact("api-flow.html", "text/html", htmlBase64));
        out.add(new FileArtifact("api-flow.mmd", "text/plain", mmdBase64));
        return out;
    }

    public ApiResponse<UrlArtifact> generateAsFiles(FlowChartRequest req) throws Exception {
        String html = generateHtmlFromTemplate(req);
        String mermaid = toMermaid(req);

        byte[] htmlBytes = html.getBytes(StandardCharsets.UTF_8);
        byte[] mmdBytes = mermaid.getBytes(StandardCharsets.UTF_8);

        String batchId = UUID.randomUUID().toString();
        Path dir = Path.of("src", "main", "resources", "static", "flowcharts", batchId);
        Files.createDirectories(dir);

        Path htmlPath = dir.resolve("api-flow.html");
        Path mmdPath = dir.resolve("api-flow.mmd");
        Files.write(htmlPath, htmlBytes);
        Files.write(mmdPath, mmdBytes);

        String htmlSha = sha256Hex(htmlBytes);
        String mmdSha = sha256Hex(mmdBytes);

        UrlArtifact urlArtifact = new UrlArtifact(
                "api-flow.html",
                "text/html",
                Files.size(htmlPath),
                htmlSha,
                "/flowcharts/" + batchId + "/api-flow.html"
        );

        return ApiResponse.success(urlArtifact);
    }

    /**
     * HTML 템플릿을 사용하여 FlowChart HTML 생성
     */
    private String generateHtmlFromTemplate(FlowChartRequest req) throws Exception {
        String template = getHtmlTemplate();

        // 데이터 준비
        String title = req.getTitle();
        String theme = req.getTheme() != null ? req.getTheme() : "default";
        String layout = getRankDir(req.getLayout());
        String elementsJson = generateElementsJson(req);
        String cytoscapeStyles = generateCytoscapeStyles(theme, req.getThemeVariables(), req.getClasses());
        String themeStyles = generateThemeCSS(theme, req.getThemeVariables(), req.getClasses());
        String fontFamily = getFontFamily(req.getThemeVariables()).replace(" ", "+");

        // 템플릿 변수 치환
        return template
                .replace("{{TITLE}}", escapeHtml(title))
                .replace("{{THEME}}", escapeHtml(theme))
                .replace("{{FONT_FAMILY}}", fontFamily)
                .replace("{{THEME_STYLES}}", themeStyles)
                .replace("{{ELEMENTS_JSON}}", elementsJson)
                .replace("{{CYTOSCAPE_STYLES}}", cytoscapeStyles)
                .replace("{{LAYOUT}}", layout);
    }

    /**
     * HTML 템플릿 로드 (캐시 사용)
     */
    private String getHtmlTemplate() throws Exception {
        if (htmlTemplate == null) {
            ClassPathResource resource = new ClassPathResource("templates/common/flowchart-template.html");
            htmlTemplate = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        }
        return htmlTemplate;
    }

    /**
     * Cytoscape.js 형식의 elements JSON 생성
     */
    private String generateElementsJson(FlowChartRequest req) {
        StringBuilder json = new StringBuilder("[\n");

        // 노드 추가
        for (int i = 0; i < req.getNodes().size(); i++) {
            Map<String, Object> node = req.getNodes().get(i);
            String id = (String) node.get("id");
            String label = String.valueOf(node.getOrDefault("label", id));
            String shape = String.valueOf(node.getOrDefault("shape", "process"));
            String nodeClass = String.valueOf(node.getOrDefault("class", ""));

            json.append(String.format("""
                    {
                      "data": {
                        "id": "%s",
                        "label": "%s",
                        "type": "%s",
                        "nodeClass": "%s"
                      }
                    }""",
                    escapeJson(id),
                    escapeJson(label),
                    escapeJson(shape),
                    escapeJson(nodeClass)));

            if (i < req.getNodes().size() - 1 || !req.getEdges().isEmpty()) {
                json.append(",");
            }
            json.append("\n");
        }

        // 엣지 추가
        for (int i = 0; i < req.getEdges().size(); i++) {
            Map<String, Object> edge = req.getEdges().get(i);
            String from = (String) edge.get("from");
            String to = (String) edge.get("to");
            String label = String.valueOf(edge.getOrDefault("label", ""));

            Map<String, Object> style = (Map<String, Object>) edge.get("style");
            String styleType = "";
            if (style != null && style.get("type") != null) {
                styleType = String.valueOf(style.get("type"));
            }

            json.append(String.format("""
                    {
                      "data": {
                        "id": "%s-%s",
                        "source": "%s",
                        "target": "%s",
                        "label": "%s",
                        "styleType": "%s"
                      }
                    }""",
                    escapeJson(from), escapeJson(to),
                    escapeJson(from), escapeJson(to),
                    escapeJson(label), escapeJson(styleType)));

            if (i < req.getEdges().size() - 1) {
                json.append(",");
            }
            json.append("\n");
        }

        json.append("]");
        return json.toString();
    }

    /**
     * 테마별 CSS 스타일 생성
     */
    private String generateThemeCSS(String theme, Map<String, Object> themeVariables, Map<String, Object> classes) {
        Map<String, String> defaults = getThemeDefaults(theme != null ? theme : "default");
        StringBuilder css = new StringBuilder();

        // 기본 테마 변수 설정
        String primaryColor = getThemeVar(themeVariables, "primaryColor", defaults.get("primaryColor"));
        String primaryBorderColor = getThemeVar(themeVariables, "primaryBorderColor", defaults.get("primaryBorderColor"));
        String backgroundColor = getThemeVar(themeVariables, "backgroundColor", defaults.get("backgroundColor"));
        String textColor = getThemeVar(themeVariables, "textColor", defaults.get("textColor"));

        css.append(String.format("""
                .theme-%s {
                    --primary-color: %s;
                    --primary-border-color: %s;
                    --bg-color: %s;
                    --text-color: %s;
                }
                
                .theme-%s body {
                    background: var(--bg-color);
                    color: var(--text-color);
                }
                
                .theme-%s .header {
                    border-bottom: 1px solid var(--primary-border-color);
                }
                
                .theme-%s .header-icon {
                    background: var(--primary-border-color);
                }
                
                .theme-%s .btn.active {
                    background: var(--primary-border-color);
                    color: white;
                }
                
                .theme-%s .loading::before {
                    border-top-color: var(--primary-border-color);
                }
                """, theme, primaryColor, primaryBorderColor, backgroundColor, textColor,
                theme, theme, theme, theme, theme));

        return css.toString();
    }

    /**
     * 테마별 기본값 반환
     */
    private Map<String, String> getThemeDefaults(String theme) {
        return switch (theme) {
            case "forest" -> Map.of(
                    "primaryColor", "#E9F5EE",
                    "primaryBorderColor", "#2E7D32",
                    "backgroundColor", "#f0f9f0",
                    "textColor", "#0d4a2d"
            );
            case "dark" -> Map.of(
                    "primaryColor", "#2D2D2D",
                    "primaryBorderColor", "#404040",
                    "backgroundColor", "#1a1a1a",
                    "textColor", "#ffffff"
            );
            case "neutral" -> Map.of(
                    "primaryColor", "#F5F5F5",
                    "primaryBorderColor", "#9E9E9E",
                    "backgroundColor", "#fafafa",
                    "textColor", "#424242"
            );
            case "base" -> Map.of(
                    "primaryColor", "#FFFFFF",
                    "primaryBorderColor", "#D1D5DB",
                    "backgroundColor", "#ffffff",
                    "textColor", "#374151"
            );
            default -> Map.of( // default
                    "primaryColor", "#E3F2FD",
                    "primaryBorderColor", "#1976D2",
                    "backgroundColor", "#f8fafc",
                    "textColor", "#1e293b"
            );
        };
    }

    /**
     * Cytoscape.js 스타일 생성
     */
    private String generateCytoscapeStyles(String theme, Map<String, Object> themeVariables, Map<String, Object> classes) {
        Map<String, String> defaults = getThemeDefaults(theme != null ? theme : "default");
        StringBuilder styles = new StringBuilder("[\n");

        // 기본 노드 스타일
        styles.append(String.format("""
                {
                  "selector": "node",
                  "style": {
                    "background-color": "%s",
                    "border-color": "%s",
                    "border-width": "2px",
                    "label": "data(label)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "color": "%s",
                    "font-size": "12px",
                    "font-weight": "500",
                    "text-wrap": "wrap",
                    "text-max-width": "120px",
                    "width": "120px",
                    "height": "60px",
                    "shape": "roundrectangle"
                  }
                },""",
                defaults.get("primaryColor"),
                defaults.get("primaryBorderColor"),
                defaults.get("textColor")));

        // 서비스 노드 스타일
        styles.append(String.format("""
                {
                  "selector": "node[type = 'service']",
                  "style": {
                    "background-color": "%s",
                    "border-color": "%s",
                    "shape": "roundrectangle"
                  }
                },""", defaults.get("primaryColor"), defaults.get("primaryBorderColor")));

        // DB 노드 스타일
        styles.append(String.format("""
                {
                  "selector": "node[type = 'db']",
                  "style": {
                    "background-color": "#FFF3E0",
                    "border-color": "#F57C00",
                    "shape": "barrel"
                  }
                },"""));

        // 외부 노드 스타일
        styles.append(String.format("""
                {
                  "selector": "node[type = 'external']",
                  "style": {
                    "background-color": "#F3E5F5",
                    "border-color": "#7B1FA2",
                    "shape": "hexagon"
                  }
                },"""));

        // 기본 엣지 스타일
        styles.append(String.format("""
                {
                  "selector": "edge",
                  "style": {
                    "width": "2px",
                    "line-color": "%s",
                    "target-arrow-color": "%s",
                    "target-arrow-shape": "triangle",
                    "label": "data(label)",
                    "font-size": "10px",
                    "text-rotation": "autorotate",
                    "text-margin-y": "-10px",
                    "color": "%s",
                    "curve-style": "bezier"
                  }
                },""",
                defaults.get("primaryBorderColor"),
                defaults.get("primaryBorderColor"),
                defaults.get("textColor")));

        // thick 스타일 엣지
        styles.append(String.format("""
                {
                  "selector": "edge[styleType = 'thick']",
                  "style": {
                    "width": "4px",
                    "line-color": "%s",
                    "target-arrow-color": "%s"
                  }
                },""", defaults.get("primaryBorderColor"), defaults.get("primaryBorderColor")));

        // dotted 스타일 엣지
        styles.append(String.format("""
                {
                  "selector": "edge[styleType = 'dotted']",
                  "style": {
                    "line-style": "dotted",
                    "line-color": "%s",
                    "target-arrow-color": "%s"
                  }
                }""", "#9E9E9E", "#9E9E9E"));

        styles.append("\n]");
        return styles.toString();
    }

    // ... existing code ...

    private String getThemeVar(Map<String, Object> themeVariables, String key, String defaultValue) {
        if (themeVariables == null) return defaultValue;
        return String.valueOf(themeVariables.getOrDefault(key, defaultValue));
    }

    private String getFontFamily(Map<String, Object> themeVariables) {
        return getThemeVar(themeVariables, "fontFamily", "Inter, Pretendard, sans-serif");
    }

    private String getRankDir(String layout) {
        return switch (layout != null ? layout.toUpperCase() : "LR") {
            case "TB", "TD" -> "TB";
            case "BT" -> "BT";
            case "RL" -> "RL";
            default -> "LR";
        };
    }

    /**
     * HTML escape 처리
     */
    private String escapeHtml(String str) {
        if (str == null) return "";
        return str.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    /**
     * JSON escape 처리
     */
    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String toMermaid(FlowChartRequest req) {
        StringBuilder m = new StringBuilder();
        m.append("flowchart ").append(req.getLayout()).append("\n");
        m.append("%% ").append(req.getTitle()).append("\n");

        for (Map<String, Object> n : req.getNodes()) {
            String id = (String) n.get("id");
            String label = String.valueOf(n.getOrDefault("label", id)).replace("\"", "'");
            String shape = String.valueOf(n.getOrDefault("shape", "process"));
            String box = switch (shape) {
                case "db" -> "([%s])";
                case "external" -> "[\"%s\"]";
                case "service" -> "[%s]";
                default -> "[%s]";
            };
            m.append(String.format("%s" + box + "\n", id, label));
        }

        for (Map<String, Object> e : req.getEdges()) {
            String from = (String) e.get("from");
            String to = (String) e.get("to");
            String label = String.valueOf(e.getOrDefault("label", ""));
            String pipe = label.isBlank() ? "" : "|%s| ".formatted(label.replace("\"", "'"));
            m.append("%s --> %s%s\n".formatted(from, pipe, to));
        }
        return m.toString();
    }

    private static String sha256Hex(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] d = md.digest(data);
        return HexFormat.of().formatHex(d);
    }


}