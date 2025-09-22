package com.gunho.artifact.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gunho.artifact.dto.FlowChartRequest;
import com.gunho.artifact.model.FileArtifact;
import com.gunho.artifact.model.UrlArtifact;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FlowChartGenerator3 {

    private final SpringTemplateEngine templateEngine;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<FileArtifact> generate(FlowChartRequest req) throws Exception {
        String visJsHtml = renderTemplate(req);
        String mermaid = toMermaid(req);

        String htmlBase64 = Base64.getEncoder().encodeToString(visJsHtml.getBytes(StandardCharsets.UTF_8));
        String mmdBase64 = Base64.getEncoder().encodeToString(mermaid.getBytes(StandardCharsets.UTF_8));

        List<FileArtifact> out = new ArrayList<>();
        out.add(new FileArtifact("api-flow.html", "text/html", htmlBase64));
        out.add(new FileArtifact("flowchart.mmd", "text/plain", mmdBase64));
        return out;
    }

    public List<UrlArtifact> generateAsFiles(FlowChartRequest req) throws Exception {
        String visJsHtml = renderTemplate(req);
        String mermaid = toMermaid(req);

        byte[] htmlBytes = visJsHtml.getBytes(StandardCharsets.UTF_8);
        byte[] mmdBytes = mermaid.getBytes(StandardCharsets.UTF_8);

        String batchId = UUID.randomUUID().toString();
        Path dir = Path.of("generated", "flowcharts", batchId);
        Files.createDirectories(dir);

        Path htmlPath = dir.resolve("api-flow.html");
        Path mmdPath = dir.resolve("flowchart.mmd");
        Files.write(htmlPath, htmlBytes);
        Files.write(mmdPath, mmdBytes);

        String htmlSha = sha256Hex(htmlBytes);
        String mmdSha = sha256Hex(mmdBytes);

        List<UrlArtifact> out = new ArrayList<>();
        out.add(new UrlArtifact(
                "api-flow.html",
                "text/html",
                Files.size(htmlPath),
                htmlSha,
                "/files/flowcharts/" + batchId + "/api-flow.html"
        ));
        out.add(new UrlArtifact(
                "flowchart.mmd",
                "text/plain",
                Files.size(mmdPath),
                mmdSha,
                "/files/flowcharts/" + batchId + "/flowchart.mmd"
        ));
        return out;
    }

    private String renderTemplate(FlowChartRequest req) {
        Context context = new Context();
        context.setVariable("title", req.getTitle());
        context.setVariable("theme", req.getTheme() != null ? req.getTheme() : "forest");
        context.setVariable("layout", getRankDir(req.getLayout()));
        context.setVariable("elementsJson", generateElementsJson(req));
        context.setVariable("cytoscapeStyles", generateCytoscapeStylesForTemplate(req));
        context.setVariable("themeStyles", generateThemeCSS(req));

        return templateEngine.process("common/flowchart-template", context);
    }

    private String generateElementsJson(FlowChartRequest req) {
        try {
            List<Map<String, Object>> elements = new ArrayList<>();

            // 노드 추가
            for (Map<String, Object> node : req.getNodes()) {
                Map<String, Object> element = new HashMap<>();
                Map<String, Object> data = new HashMap<>();

                data.put("id", node.get("id"));
                data.put("label", node.getOrDefault("label", node.get("id")));
                data.put("type", node.getOrDefault("shape", "service"));
                data.put("nodeClass", node.getOrDefault("class", ""));

                element.put("data", data);
                elements.add(element);
            }

            // 엣지 추가
            for (Map<String, Object> edge : req.getEdges()) {
                Map<String, Object> element = new HashMap<>();
                Map<String, Object> data = new HashMap<>();

                data.put("id", edge.get("from") + "-" + edge.get("to"));
                data.put("source", edge.get("from"));
                data.put("target", edge.get("to"));
                data.put("label", edge.getOrDefault("label", ""));

                // 스타일 정보 추가
                if (edge.containsKey("style")) {
                    Map<String, Object> style = (Map<String, Object>) edge.get("style");
                    data.put("styleType", style.getOrDefault("type", ""));
                } else {
                    data.put("styleType", "");
                }

                element.put("data", data);
                elements.add(element);
            }

            return objectMapper.writeValueAsString(elements);
        } catch (Exception e) {
            e.printStackTrace();
            return "[]";
        }
    }

    private String generateCytoscapeStylesForTemplate(FlowChartRequest req) {
        String theme = req.getTheme() != null ? req.getTheme() : "forest";

        // 테마별 색상 정의
        Map<String, String> themeColors = getThemeColors(theme);

        try {
            List<Map<String, Object>> styleArray = new ArrayList<>();

            // 기본 노드 스타일
            Map<String, Object> nodeStyle = new HashMap<>();
            nodeStyle.put("selector", "node");
            Map<String, Object> nodeCSS = new HashMap<>();
            nodeCSS.put("content", "data(label)");
            nodeCSS.put("text-valign", "center");
            nodeCSS.put("text-halign", "center");
            nodeCSS.put("background-color", themeColors.get("nodeBackground"));
            nodeCSS.put("color", themeColors.get("nodeText"));
            nodeCSS.put("border-width", 2);
            nodeCSS.put("border-color", themeColors.get("nodeBorder"));
            nodeCSS.put("font-size", "12px");
            nodeCSS.put("font-family", "Inter, sans-serif");
            nodeCSS.put("font-weight", "500");
            nodeCSS.put("text-wrap", "wrap");
            nodeCSS.put("text-max-width", "120px");
            nodeCSS.put("width", "120px");
            nodeCSS.put("height", "60px");
            nodeCSS.put("shape", "roundrectangle");
            nodeCSS.put("padding", "8px");
            nodeStyle.put("style", nodeCSS);
            styleArray.add(nodeStyle);

            // DB 노드 스타일
            Map<String, Object> dbNodeStyle = new HashMap<>();
            dbNodeStyle.put("selector", "node[type=\"db\"]");
            Map<String, Object> dbCSS = new HashMap<>();
            dbCSS.put("shape", "barrel");
            dbCSS.put("background-color", themeColors.get("dbBackground"));
            dbCSS.put("width", "100px");
            dbCSS.put("height", "70px");
            dbNodeStyle.put("style", dbCSS);
            styleArray.add(dbNodeStyle);

            // External 노드 스타일
            Map<String, Object> externalNodeStyle = new HashMap<>();
            externalNodeStyle.put("selector", "node[type=\"external\"]");
            Map<String, Object> externalCSS = new HashMap<>();
            externalCSS.put("shape", "ellipse");
            externalCSS.put("background-color", themeColors.get("externalBackground"));
            externalCSS.put("width", "130px");
            externalCSS.put("height", "70px");
            externalNodeStyle.put("style", externalCSS);
            styleArray.add(externalNodeStyle);

            // Primary 클래스 노드 스타일
            Map<String, Object> primaryNodeStyle = new HashMap<>();
            primaryNodeStyle.put("selector", "node[nodeClass=\"primary\"]");
            Map<String, Object> primaryCSS = new HashMap<>();
            primaryCSS.put("background-color", themeColors.get("primaryBackground"));
            primaryCSS.put("border-color", themeColors.get("primaryBorder"));
            primaryCSS.put("border-width", 3);
            primaryNodeStyle.put("style", primaryCSS);
            styleArray.add(primaryNodeStyle);

            // Accent 클래스 노드 스타일
            Map<String, Object> accentNodeStyle = new HashMap<>();
            accentNodeStyle.put("selector", "node[nodeClass=\"accent\"]");
            Map<String, Object> accentCSS = new HashMap<>();
            accentCSS.put("background-color", themeColors.get("accentBackground"));
            accentCSS.put("border-color", themeColors.get("accentBorder"));
            accentCSS.put("border-width", 3);
            accentNodeStyle.put("style", accentCSS);
            styleArray.add(accentNodeStyle);

            // 기본 엣지 스타일
            Map<String, Object> edgeStyle = new HashMap<>();
            edgeStyle.put("selector", "edge");
            Map<String, Object> edgeCSS = new HashMap<>();
            edgeCSS.put("content", "data(label)");
            edgeCSS.put("curve-style", "bezier");
            edgeCSS.put("target-arrow-shape", "triangle");
            edgeCSS.put("line-color", themeColors.get("edgeColor"));
            edgeCSS.put("target-arrow-color", themeColors.get("edgeColor"));
            edgeCSS.put("font-size", "10px");
            edgeCSS.put("font-family", "Inter, sans-serif");
            edgeCSS.put("color", themeColors.get("edgeTextColor"));
            edgeCSS.put("text-background-color", "rgba(255,255,255,0.8)");
            edgeCSS.put("text-background-opacity", 1);
            edgeCSS.put("text-background-padding", "2px");
            edgeCSS.put("width", 2);
            edgeStyle.put("style", edgeCSS);
            styleArray.add(edgeStyle);

            // Thick 엣지 스타일
            Map<String, Object> thickEdgeStyle = new HashMap<>();
            thickEdgeStyle.put("selector", "edge[styleType=\"thick\"]");
            Map<String, Object> thickCSS = new HashMap<>();
            thickCSS.put("width", 4);
            thickCSS.put("line-color", themeColors.get("thickEdgeColor"));
            thickCSS.put("target-arrow-color", themeColors.get("thickEdgeColor"));
            thickEdgeStyle.put("style", thickCSS);
            styleArray.add(thickEdgeStyle);

            // Dotted 엣지 스타일
            Map<String, Object> dottedEdgeStyle = new HashMap<>();
            dottedEdgeStyle.put("selector", "edge[styleType=\"dotted\"]");
            Map<String, Object> dottedCSS = new HashMap<>();
            dottedCSS.put("line-style", "dotted");
            dottedCSS.put("width", 2);
            dottedCSS.put("line-color", themeColors.get("dottedEdgeColor"));
            dottedCSS.put("target-arrow-color", themeColors.get("dottedEdgeColor"));
            dottedEdgeStyle.put("style", dottedCSS);
            styleArray.add(dottedEdgeStyle);

            return objectMapper.writeValueAsString(styleArray);

        } catch (Exception e) {
            e.printStackTrace();
            return "[]";
        }
    }

    private Map<String, String> getThemeColors(String theme) {
        Map<String, String> colors = new HashMap<>();

        switch (theme.toLowerCase()) {
            case "forest":
                colors.put("nodeBackground", "#d4f1d4");
                colors.put("nodeText", "#0d4a2d");
                colors.put("nodeBorder", "#2d5a2d");
                colors.put("dbBackground", "#a8e6a3");
                colors.put("externalBackground", "#c3f0c3");
                colors.put("primaryBackground", "#4ade80");
                colors.put("primaryBorder", "#16a34a");
                colors.put("accentBackground", "#86efac");
                colors.put("accentBorder", "#22c55e");
                colors.put("edgeColor", "#2d5a2d");
                colors.put("edgeTextColor", "#0d4a2d");
                colors.put("thickEdgeColor", "#16a34a");
                colors.put("dottedEdgeColor", "#6b7280");
                break;
            case "blue":
                colors.put("nodeBackground", "#dbeafe");
                colors.put("nodeText", "#1e40af");
                colors.put("nodeBorder", "#3b82f6");
                colors.put("dbBackground", "#bfdbfe");
                colors.put("externalBackground", "#eff6ff");
                colors.put("primaryBackground", "#60a5fa");
                colors.put("primaryBorder", "#2563eb");
                colors.put("accentBackground", "#93c5fd");
                colors.put("accentBorder", "#3b82f6");
                colors.put("edgeColor", "#3b82f6");
                colors.put("edgeTextColor", "#1e40af");
                colors.put("thickEdgeColor", "#2563eb");
                colors.put("dottedEdgeColor", "#6b7280");
                break;
            default: // forest
                colors.put("nodeBackground", "#d4f1d4");
                colors.put("nodeText", "#0d4a2d");
                colors.put("nodeBorder", "#2d5a2d");
                colors.put("dbBackground", "#a8e6a3");
                colors.put("externalBackground", "#c3f0c3");
                colors.put("primaryBackground", "#4ade80");
                colors.put("primaryBorder", "#16a34a");
                colors.put("accentBackground", "#86efac");
                colors.put("accentBorder", "#22c55e");
                colors.put("edgeColor", "#2d5a2d");
                colors.put("edgeTextColor", "#0d4a2d");
                colors.put("thickEdgeColor", "#16a34a");
                colors.put("dottedEdgeColor", "#6b7280");
                break;
        }

        return colors;
    }


    private String generateThemeCSS(FlowChartRequest req) {
        // 추가적인 테마 CSS가 필요한 경우 여기에 구현
        return "";
    }

    private String getRankDir(String layout) {
        return switch (layout != null ? layout.toUpperCase() : "LR") {
            case "TB", "TD" -> "TB";
            case "BT" -> "BT";
            case "RL" -> "RL";
            default -> "LR";
        };
    }

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