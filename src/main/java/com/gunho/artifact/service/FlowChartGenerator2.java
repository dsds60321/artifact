package com.gunho.artifact.service;

import com.gunho.artifact.dto.FlowChartRequest;
import com.gunho.artifact.model.FileArtifact;
import com.gunho.artifact.model.UrlArtifact;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FlowChartGenerator2 {

    public List<FileArtifact> generate(FlowChartRequest req) throws Exception {
        String visJsHtml = toJsHtml(req);
        String mermaid = toMermaid(req);

        String htmlBase64 = Base64.getEncoder().encodeToString(visJsHtml.getBytes(StandardCharsets.UTF_8));
        String mmdBase64 = Base64.getEncoder().encodeToString(mermaid.getBytes(StandardCharsets.UTF_8));

        List<FileArtifact> out = new ArrayList<>();
        out.add(new FileArtifact("api-flow.html", "text/html", htmlBase64));
        out.add(new FileArtifact("api-flow.mmd", "text/plain", mmdBase64));
        return out;
    }

    public List<UrlArtifact> generateAsFiles(FlowChartRequest req) throws Exception {
        String visJsHtml = toJsHtml(req);
        String mermaid = toMermaid(req);

        byte[] htmlBytes = visJsHtml.getBytes(StandardCharsets.UTF_8);
        byte[] mmdBytes = mermaid.getBytes(StandardCharsets.UTF_8);

        String batchId = UUID.randomUUID().toString();
        Path dir = Path.of("generated", "flowcharts", batchId);
        Files.createDirectories(dir);

        Path htmlPath = dir.resolve("api-flow.html");
        Path mmdPath = dir.resolve("api-flow.mmd");
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
                "api-flow.mmd",
                "text/plain",
                Files.size(mmdPath),
                mmdSha,
                "/files/flowcharts/" + batchId + "/api-flow.mmd"
        ));
        return out;
    }

    /**
     * vis.js를 사용한 API Flow 시각화 HTML 생성
     */
    private String toJsHtml(FlowChartRequest req) {
        // JSON에서 테마 정보 추출
        Map<String, Object> themeVariables = req.getThemeVariables();
        Map<String, Object> classes = req.getClasses();
        String theme = req.getTheme();
        String layout = req.getLayout();

        // 노드 데이터 생성 (Cytoscape.js 형식)
        StringBuilder elementsJson = new StringBuilder("[\n");

        // 노드 추가
        for (int i = 0; i < req.getNodes().size(); i++) {
            Map<String, Object> node = req.getNodes().get(i);
            String id = (String) node.get("id");
            String label = String.valueOf(node.getOrDefault("label", id));
            String shape = String.valueOf(node.getOrDefault("shape", "process"));
            String nodeClass = String.valueOf(node.getOrDefault("class", ""));
            String method = String.valueOf(node.getOrDefault("method", ""));
            String endpoint = String.valueOf(node.getOrDefault("endpoint", ""));

            String displayLabel = method.isEmpty() ? label : String.format("%s\\n%s %s", label, method, endpoint);

            elementsJson.append(String.format("""
                    {
                      "data": {
                        "id": "%s",
                        "label": "%s",
                        "type": "%s",
                        "nodeClass": "%s",
                        "method": "%s",
                        "endpoint": "%s"
                      }
                    }""", id, displayLabel.replace("\"", "\\\""), shape, nodeClass, method, endpoint));

            if (i < req.getNodes().size() - 1 || !req.getEdges().isEmpty()) {
                elementsJson.append(",");
            }
            elementsJson.append("\n");
        }

        // 엣지 추가
        for (int i = 0; i < req.getEdges().size(); i++) {
            Map<String, Object> edge = req.getEdges().get(i);
            String from = (String) edge.get("from");
            String to = (String) edge.get("to");
            String label = String.valueOf(edge.getOrDefault("label", ""));

            // 스타일 처리
            Map<String, Object> style = (Map<String, Object>) edge.get("style");
            String styleType = "";
            if (style != null && style.get("type") != null) {
                styleType = String.valueOf(style.get("type"));
            }

            elementsJson.append(String.format("""
                    {
                      "data": {
                        "id": "%s-%s",
                        "source": "%s",
                        "target": "%s",
                        "label": "%s",
                        "styleType": "%s"
                      }
                    }""", from, to, from, to, label.replace("\"", "\\\""), styleType));

            if (i < req.getEdges().size() - 1) {
                elementsJson.append(",");
            }
            elementsJson.append("\n");
        }

        elementsJson.append("]");

        // 테마별 CSS 변수 생성
        String themeCSS = generateThemeCSS(theme, themeVariables, classes);

        // 레이아웃 방향 설정
        String rankDir = getRankDir(layout);

        return String.format("""
                        <!DOCTYPE html>
                        <html lang="ko">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>%s - API Flow</title>
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=%s&display=swap" rel="stylesheet">
                            <script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js"></script>
                            <script src="https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
                            <script src="https://unpkg.com/cytoscape-dagre@2.4.0/cytoscape-dagre.js"></script>
                            <style>
                                %s
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h1>
                                    <div class="header-icon">FL</div>
                                    %s
                                </h1>
                                <div class="header-actions">
                                    <button class="btn" onclick="fitGraph()">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/>
                                        </svg>
                                        전체 보기
                                    </button>
                                </div>
                            </div>
                        
                            <div class="main">
                                <div id="loading" class="loading">플로우차트 생성 중...</div>
                                <div id="cy" style="display: none;"></div>
                        
                                <div class="controls">
                                    <button class="btn active" onclick="changeLayout('dagre')">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3 3h18v4H3V3zm0 6h18v4H3V9zm0 6h18v4H3v-4z"/>
                                        </svg>
                                        다이어그램
                                    </button>
                                    <button class="btn" onclick="changeLayout('hierarchy')">계층형</button>
                                    <button class="btn" onclick="changeLayout('breadthfirst')">방사형</button>
                                    <button class="btn" onclick="changeLayout('circle')">원형</button>
                                </div>
                            </div>
                        
                            <script>
                                if (typeof cytoscape !== 'undefined' && typeof dagre !== 'undefined') {
                                    cytoscape.use(cytoscapeDagre);
                                }
                        
                                let cy = null;
                        
                                document.addEventListener('DOMContentLoaded', function() {
                                    initializeCytoscape();
                                });
                        
                                function initializeCytoscape() {
                                    try {
                                        cy = cytoscape({
                                            container: document.getElementById('cy'),
                                            elements: %s,
                                            style: %s,
                                            layout: {
                                                name: 'dagre',
                                                directed: true,
                                                padding: 50,
                                                spacingFactor: 1.3,
                                                animate: true,
                                                animationDuration: 500,
                                                rankDir: '%s'
                                            }
                                        });
                        
                                        // 이벤트 핸들러
                                        cy.on('tap', 'node', function(evt) {
                                            console.log('Node clicked:', evt.target.data());
                                        });
                        
                                        // 로딩 완료
                                        document.getElementById('loading').style.display = 'none';
                                        document.getElementById('cy').style.display = 'block';
                        
                                        setTimeout(() => cy.fit(null, 40), 100);
                        
                                    } catch (error) {
                                        console.error('Cytoscape 초기화 오류:', error);
                                        document.getElementById('loading').textContent = '로드 중 오류가 발생했습니다';
                                    }
                                }
                        
                                function fitGraph() {
                                    if (cy) cy.fit(null, 50);
                                }
                        
                                function changeLayout(layoutName) {
                                    if (!cy) return;
                        
                                    const layouts = {
                                        'dagre': {
                                            name: 'dagre',
                                            directed: true,
                                            padding: 50,
                                            spacingFactor: 1.3,
                                            animate: true,
                                            animationDuration: 500,
                                            rankDir: '%s'
                                        },
                                        'hierarchy': {
                                            name: 'breadthfirst',
                                            directed: true,
                                            padding: 50,
                                            spacingFactor: 1.4,
                                            animate: true,
                                            animationDuration: 500
                                        },
                                        'breadthfirst': {
                                            name: 'breadthfirst',
                                            directed: true,
                                            padding: 50,
                                            spacingFactor: 1.6,
                                            animate: true,
                                            animationDuration: 500
                                        },
                                        'circle': {
                                            name: 'circle',
                                            padding: 60,
                                            animate: true,
                                            animationDuration: 500
                                        }
                                    };
                        
                                    cy.layout(layouts[layoutName]).run();
                        
                                    document.querySelectorAll('.controls .btn').forEach(btn => btn.classList.remove('active'));
                                    event.target.classList.add('active');
                                }
                            </script>
                        </body>
                        </html>
                        """,
                req.getTitle(),
                getFontFamily(themeVariables),
                themeCSS,
                req.getTitle(),
                elementsJson.toString(),
                generateCytoscapeStyles(theme, themeVariables, classes),
                rankDir,
                rankDir);
    }


    private String generateThemeCSS(String theme, Map<String, Object> themeVariables, Map<String, Object> classes) {
        // 테마별 기본 색상 정의
        Map<String, String> themeDefaults = getThemeDefaults(theme);

        String primaryColor = getThemeVar(themeVariables, "primaryColor", themeDefaults.get("primaryColor"));
        String primaryBorderColor = getThemeVar(themeVariables, "primaryBorderColor", themeDefaults.get("primaryBorderColor"));
        String lineColor = getThemeVar(themeVariables, "lineColor", themeDefaults.get("lineColor"));
        String fontFamily = getThemeVar(themeVariables, "fontFamily", themeDefaults.get("fontFamily"));

        return String.format("""
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: '%s';
                            background: %s;
                            color: %s;
                            height: 100vh;
                            overflow: hidden;
                            font-weight: 400;
                        }
                        
                        .header {
                            background: rgba(255, 255, 255, 0.95);
                            border-bottom: 1px solid %s;
                            padding: 20px 32px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            box-shadow: 0 1px 0 rgba(0,0,0,0.05);
                            z-index: 100;
                            position: relative;
                        }
                        
                        .header h1 {
                            font-size: 18px;
                            font-weight: 600;
                            color: %s;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            letter-spacing: -0.01em;
                        }
                        
                        .header-icon {
                            width: 24px;
                            height: 24px;
                            background: %s;
                            border-radius: 4px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 12px;
                            font-weight: 600;
                        }
                        
                        .main {
                            height: calc(100vh - 81px);
                            position: relative;
                            background: rgba(255, 255, 255, 0.9);
                            margin: 20px;
                            border: 1px solid %s;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                            border-radius: 12px;
                            overflow: hidden;
                        }
                        
                        #cy {
                            width: 100%%;
                            height: 100%%;
                            background: %s;
                        }
                        
                        .controls {
                            position: absolute;
                            top: 24px;
                            left: 24px;
                            z-index: 1000;
                            background: rgba(255, 255, 255, 0.9);
                            border: 1px solid %s;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                            border-radius: 12px;
                            display: flex;
                            padding: 4px;
                            gap: 2px;
                        }
                        
                        .btn {
                            padding: 10px 16px;
                            border: none;
                            background: transparent;
                            font-family: '%s', sans-serif;
                            font-size: 13px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.15s ease;
                            color: #525252;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            white-space: nowrap;
                            border-radius: 8px;
                        }
                        
                        .btn:hover {
                            background: rgba(255,255,255,0.8);
                            color: #1a1a1a;
                        }
                        
                        .btn.active {
                            background: %s;
                            color: #ffffff;
                        }
                        
                        .loading {
                            position: absolute;
                            top: 50%%;
                            left: 50%%;
                            transform: translate(-50%%, -50%%);
                            color: %s;
                            font-size: 14px;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            background: rgba(255,255,255,0.9);
                            padding: 24px 32px;
                            border-radius: 12px;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                        }
                        
                        .loading::before {
                            content: '';
                            width: 18px;
                            height: 18px;
                            border: 2px solid rgba(0,0,0,0.1);
                            border-top: 2px solid %s;
                            border-radius: 50%%;
                            animation: spin 1s linear infinite;
                        }
                        
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                        """,
                fontFamily.replace(",", "', '"),
                primaryColor,
                primaryBorderColor,
                primaryBorderColor,
                primaryBorderColor,
                primaryBorderColor,
                primaryBorderColor,
                primaryColor,
                primaryBorderColor,
                fontFamily.replace(",", "', '"),
                primaryBorderColor,
                primaryBorderColor,
                primaryBorderColor);
    }

    private Map<String, String> getThemeDefaults(String theme) {
        Map<String, String> defaults = new HashMap<>();

        if (theme != null) {
            switch (theme.toLowerCase()) {
                case "dark":
                    defaults.put("primaryColor", "#1a1a1a");
                    defaults.put("primaryBorderColor", "#404040");
                    defaults.put("lineColor", "#666666");
                    defaults.put("fontFamily", "Inter, Pretendard, sans-serif");
                    break;
                case "light":
                    defaults.put("primaryColor", "#ffffff");
                    defaults.put("primaryBorderColor", "#e5e5e5");
                    defaults.put("lineColor", "#9ca3af");
                    defaults.put("fontFamily", "Inter, Pretendard, sans-serif");
                    break;
                case "blue":
                    defaults.put("primaryColor", "#eff6ff");
                    defaults.put("primaryBorderColor", "#3b82f6");
                    defaults.put("lineColor", "#60a5fa");
                    defaults.put("fontFamily", "Inter, Pretendard, sans-serif");
                    break;
                case "green":
                    defaults.put("primaryColor", "#ecfdf5");
                    defaults.put("primaryBorderColor", "#10b981");
                    defaults.put("lineColor", "#34d399");
                    defaults.put("fontFamily", "Inter, Pretendard, sans-serif");
                    break;
                case "purple":
                    defaults.put("primaryColor", "#faf5ff");
                    defaults.put("primaryBorderColor", "#8b5cf6");
                    defaults.put("lineColor", "#a78bfa");
                    defaults.put("fontFamily", "Inter, Pretendard, sans-serif");
                    break;
                default:
                    // 기본 테마
                    defaults.put("primaryColor", "#f8fafc");
                    defaults.put("primaryBorderColor", "#1a202c");
                    defaults.put("lineColor", "#64748b");
                    defaults.put("fontFamily", "Inter, sans-serif");
                    break;
            }
        } else {
            // theme이 null인 경우 기본값
            defaults.put("primaryColor", "#f8fafc");
            defaults.put("primaryBorderColor", "#1a202c");
            defaults.put("lineColor", "#64748b");
            defaults.put("fontFamily", "Inter, sans-serif");
        }

        return defaults;
    }



    private String generateCytoscapeStyles(String theme, Map<String, Object> themeVariables, Map<String, Object> classes) {
        // 테마별 기본 색상 정의
        Map<String, String> themeDefaults = getThemeDefaults(theme);
        Map<String, Map<String, String>> classDefaults = getClassDefaults(theme);

        String primaryColor = getThemeVar(themeVariables, "primaryColor", themeDefaults.get("primaryColor"));
        String primaryBorderColor = getThemeVar(themeVariables, "lineColor", themeDefaults.get("lineColor"));
        String lineColor = getThemeVar(themeVariables, "lineColor", themeDefaults.get("lineColor"));
        String fontFamily = getFontFamily(themeVariables);

        StringBuilder styles = new StringBuilder();

        // 기본 노드 스타일
        styles.append("""
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-family': '%s',
                    'font-size': '12px',
                    'font-weight': '600',
                    'color': '%s',
                    'text-wrap': 'wrap',
                    'text-max-width': '120px',
                    'width': '110px',
                    'height': '65px',
                    'border-width': 2,
                    'transition-duration': '0.2s',
                    'overlay-opacity': 0.05
                }
            },
            """.formatted(fontFamily, primaryBorderColor));

        // 노드 타입별 스타일
        styles.append("""
            {
                selector: 'node[type = "external"]',
                style: {
                    'background-color': '%s',
                    'border-color': '%s',
                    'shape': 'ellipse',
                    'width': '120px',
                    'height': '70px'
                }
            },
            {
                selector: 'node[type = "service"]',
                style: {
                    'background-color': '%s',
                    'border-color': '%s',
                    'shape': 'rectangle',
                    'width': '110px',
                    'height': '65px'
                }
            },
            {
                selector: 'node[type = "db"]',
                style: {
                    'background-color': '%s',
                    'border-color': '%s',
                    'shape': 'round-rectangle',
                    'width': '105px',
                    'height': '70px'
                }
            },
            """.formatted(
                primaryColor, primaryBorderColor,
                primaryColor, primaryBorderColor,
                primaryColor, primaryBorderColor));

        // 클래스별 스타일 (사용자 정의 또는 테마 기본값)
        for (Map.Entry<String, Map<String, String>> entry : classDefaults.entrySet()) {
            String className = entry.getKey();
            Map<String, String> classColors = entry.getValue();

            // 사용자 정의 classes가 있는 경우 우선 적용
            if (classes != null && classes.containsKey(className)) {
                Map<String, Object> userClass = (Map<String, Object>) classes.get(className);
                String fill = (String) userClass.getOrDefault("fill", classColors.get("fill"));
                String stroke = (String) userClass.getOrDefault("stroke", classColors.get("stroke"));

                styles.append("""
                    {
                        selector: 'node[nodeClass = "%s"]',
                        style: {
                            'background-color': '%s',
                            'border-color': '%s'
                        }
                    },
                    """.formatted(className, fill, stroke));
            } else {
                // 테마 기본값 적용
                styles.append("""
                    {
                        selector: 'node[nodeClass = "%s"]',
                        style: {
                            'background-color': '%s',
                            'border-color': '%s'
                        }
                    },
                    """.formatted(className, classColors.get("fill"), classColors.get("stroke")));
            }
        }

        // 엣지 스타일
        styles.append("""
            {
                selector: 'edge',
                style: {
                    'curve-style': 'straight',
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '%s',
                    'line-color': '%s',
                    'width': 2,
                    'label': 'data(label)',
                    'font-size': '11px',
                    'font-weight': '500',
                    'font-family': '%s',
                    'color': '%s',
                    'text-background-color': 'rgba(255,255,255,0.9)',
                    'text-background-opacity': 1,
                    'text-background-padding': '4px',
                    'source-distance-from-node': 5,
                    'target-distance-from-node': 5
                }
            },
            {
                selector: 'edge[styleType = "thick"]',
                style: {
                    'width': 4,
                    'line-color': '%s',
                    'target-arrow-color': '%s'
                }
            },
            {
                selector: 'edge[styleType = "dotted"]',
                style: {
                    'line-style': 'dotted',
                    'width': 2
                }
            }
            """.formatted(lineColor, lineColor, fontFamily, primaryBorderColor, primaryBorderColor, primaryBorderColor));

        return "[" + styles.toString() + "]";
    }

    private Map<String, Map<String, String>> getClassDefaults(String theme) {
        Map<String, Map<String, String>> classDefaults = new HashMap<>();

        if (theme != null) {
            switch (theme.toLowerCase()) {
                case "dark":
                    classDefaults.put("primary", Map.of("fill", "#374151", "stroke", "#6b7280"));
                    classDefaults.put("accent", Map.of("fill", "#451a03", "stroke", "#ea580c"));
                    classDefaults.put("muted", Map.of("fill", "#1f2937", "stroke", "#4b5563"));
                    break;
                case "light":
                    classDefaults.put("primary", Map.of("fill", "#f8fafc", "stroke", "#64748b"));
                    classDefaults.put("accent", Map.of("fill", "#fef3c7", "stroke", "#f59e0b"));
                    classDefaults.put("muted", Map.of("fill", "#f1f5f9", "stroke", "#94a3b8"));
                    break;
                case "blue":
                    classDefaults.put("primary", Map.of("fill", "#dbeafe", "stroke", "#2563eb"));
                    classDefaults.put("accent", Map.of("fill", "#fef3c7", "stroke", "#f59e0b"));
                    classDefaults.put("muted", Map.of("fill", "#f1f5f9", "stroke", "#94a3b8"));
                    break;
                case "green":
                    classDefaults.put("primary", Map.of("fill", "#dcfce7", "stroke", "#16a34a"));
                    classDefaults.put("accent", Map.of("fill", "#fef3c7", "stroke", "#f59e0b"));
                    classDefaults.put("muted", Map.of("fill", "#f1f5f9", "stroke", "#94a3b8"));
                    break;
                case "purple":
                    classDefaults.put("primary", Map.of("fill", "#ede9fe", "stroke", "#7c3aed"));
                    classDefaults.put("accent", Map.of("fill", "#fef3c7", "stroke", "#f59e0b"));
                    classDefaults.put("muted", Map.of("fill", "#f1f5f9", "stroke", "#94a3b8"));
                    break;
                default:
                    classDefaults.put("primary", Map.of("fill", "#E3F2FD", "stroke", "#1976D2"));
                    classDefaults.put("accent", Map.of("fill", "#FFF3E0", "stroke", "#F57C00"));
                    classDefaults.put("muted", Map.of("fill", "#F5F5F5", "stroke", "#9E9E9E"));
                    break;
            }
        } else {
            classDefaults.put("primary", Map.of("fill", "#E3F2FD", "stroke", "#1976D2"));
            classDefaults.put("accent", Map.of("fill", "#FFF3E0", "stroke", "#F57C00"));
            classDefaults.put("muted", Map.of("fill", "#F5F5F5", "stroke", "#9E9E9E"));
        }

        return classDefaults;
    }


    private String getThemeVar(Map<String, Object> themeVariables, String key, String defaultValue) {
        if (themeVariables == null) return defaultValue;
        Object value = themeVariables.get(key);
        return value != null ? String.valueOf(value) : defaultValue;
    }

    private String getFontFamily(Map<String, Object> themeVariables) {
        String fontFamily = getThemeVar(themeVariables, "fontFamily", "Inter, sans-serif");
        return fontFamily.replace(" ", "+");
    }

    private String getRankDir(String layout) {
        return switch (layout.toUpperCase()) {
            case "LR" -> "LR";
            case "RL" -> "RL";
            case "BT" -> "BT";
            default -> "TB";
        };
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
                case "db", "database" -> "([%s])";
                case "external", "client" -> "[\"%s\"]";
                case "service", "process" -> "{%s}";
                case "api", "endpoint" -> "[%s]";
                default -> "[%s]";
            };
            m.append(String.format("%s" + box + "\n", id, label));
        }

        for (Map<String, Object> e : req.getEdges()) {
            String from = (String) e.get("from");
            String to = (String) e.get("to");
            String label = String.valueOf(e.getOrDefault("label", ""));
            String pipe = label.isEmpty() ? "" : "|%s| ".formatted(label.replace("\"", "'"));
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
