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
        String visJsHtml = toVisJsHtml(req);
        String mermaid = toMermaid(req);

        String htmlBase64 = Base64.getEncoder().encodeToString(visJsHtml.getBytes(StandardCharsets.UTF_8));
        String mmdBase64 = Base64.getEncoder().encodeToString(mermaid.getBytes(StandardCharsets.UTF_8));

        List<FileArtifact> out = new ArrayList<>();
        out.add(new FileArtifact("api-flow.html", "text/html", htmlBase64));
        out.add(new FileArtifact("api-flow.mmd", "text/plain", mmdBase64));
        return out;
    }

    public List<UrlArtifact> generateAsFiles(FlowChartRequest req) throws Exception {
        String visJsHtml = toVisJsHtml(req);
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
    private String toVisJsHtml(FlowChartRequest req) {
        // 노드 데이터 생성 (Cytoscape.js 형식)
        StringBuilder elementsJson = new StringBuilder("[\n");

        // 노드 추가
        for (int i = 0; i < req.getNodes().size(); i++) {
            Map<String, Object> node = req.getNodes().get(i);
            String id = (String) node.get("id");
            String label = String.valueOf(node.getOrDefault("label", id));
            String shape = String.valueOf(node.getOrDefault("shape", "process"));
            String method = String.valueOf(node.getOrDefault("method", ""));
            String endpoint = String.valueOf(node.getOrDefault("endpoint", ""));

            String displayLabel = method.isEmpty() ? label : String.format("%s\\n%s %s", label, method, endpoint);

            elementsJson.append(String.format("""
    {
      "data": {
        "id": "%s",
        "label": "%s",
        "type": "%s",
        "method": "%s",
        "endpoint": "%s"
      }
    }""", id, displayLabel.replace("\"", "\\\""), shape, method, endpoint));

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
            String type = String.valueOf(edge.getOrDefault("type", "success"));

            elementsJson.append(String.format("""
    {
      "data": {
        "id": "%s-%s",
        "source": "%s",
        "target": "%s",
        "label": "%s",
        "type": "%s"
      }
    }""", from, to, from, to, label.replace("\"", "\\\""), type));

            if (i < req.getEdges().size() - 1) {
                elementsJson.append(",");
            }
            elementsJson.append("\n");
        }

        elementsJson.append("]");

        return String.format("""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>%s - API Flow</title>
        <script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js"></script>
        <script src="https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
        <script src="https://unpkg.com/cytoscape-dagre@2.4.0/cytoscape-dagre.js"></script>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1e293b 0%%, #64748b 50%%, #2563eb 100%%);
                color: white;
                height: 100vh;
                overflow: hidden;
                position: relative;
            }

            /* 배경 패턴 */
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%%;
                height: 100%%;
                background-image: 
                    linear-gradient(45deg, rgba(255,255,255,0.05) 25%%, transparent 25%%),
                    linear-gradient(-45deg, rgba(255,255,255,0.05) 25%%, transparent 25%%),
                    linear-gradient(45deg, transparent 75%%, rgba(255,255,255,0.05) 75%%),
                    linear-gradient(-45deg, transparent 75%%, rgba(255,255,255,0.05) 75%%);
                background-size: 30px 30px;
                background-position: 0 0, 0 15px, 15px -15px, -15px 0px;
                pointer-events: none;
                opacity: 0.3;
            }

            /* 플로팅 파티클 */
            body::after {
                content: '✦ ❋ ✧ ⟡ ◆ ❖';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%%;
                height: 100%%;
                font-size: 20px;
                color: rgba(255,255,255,0.1);
                word-spacing: 80px;
                line-height: 120px;
                animation: float 20s infinite linear;
                pointer-events: none;
            }

            @keyframes float {
                0%% { transform: translateY(100vh) rotate(0deg); }
                100%% { transform: translateY(-100px) rotate(360deg); }
            }

            .header {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid rgba(255,255,255,0.2);
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 2px 20px rgba(0,0,0,0.1);
                z-index: 100;
                position: relative;
            }

            .header h1 {
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .header-actions {
                display: flex;
                gap: 8px;
            }

            .main {
                height: calc(100vh - 65px);
                position: relative;
                background: rgba(255, 255, 255, 0.85);
                backdrop-filter: blur(10px);
                margin: 16px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            #cy {
                width: 100%%;
                height: 100%%;
            }

            .controls {
                position: absolute;
                top: 20px;
                left: 20px;
                z-index: 1000;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 12px;
                padding: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                display: flex;
                gap: 6px;
            }

            .btn {
                padding: 8px 14px;
                border: 1px solid rgba(255,255,255,0.3);
                background: rgba(255,255,255,0.8);
                backdrop-filter: blur(5px);
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .btn:hover {
                background: rgba(255,255,255,0.95);
                border-color: rgba(37, 99, 235, 0.3);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .btn.active {
                background: linear-gradient(135deg, #1e293b 0%%, #64748b 50%%, #2563eb 100%%);
                color: white;
                border-color: transparent;
                box-shadow: 0 4px 15px rgba(30, 41, 59, 0.4);
            }

            .legend {
                position: absolute;
                bottom: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                font-size: 12px;
                min-width: 160px;
            }

            .legend-title {
                font-weight: 600;
                margin-bottom: 12px;
                color: #1e293b;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                text-align: center;
                border-bottom: 1px solid rgba(0,0,0,0.1);
                padding-bottom: 8px;
            }

            .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                gap: 10px;
                padding: 4px 0;
            }

            .legend-item:last-child {
                margin-bottom: 0;
            }

            .legend-shape {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
                border: 2px solid;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
            }

            .legend-shape.circle {
                border-radius: 50%%;
            }

            .legend-shape.square {
                border-radius: 3px;
            }

            .legend-shape.diamond {
                transform: rotate(45deg);
                border-radius: 2px;
            }

            .legend-shape.triangle {
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 14px solid;
                border-top: none;
                background: none !important;
            }

            .legend-label {
                color: #64748b;
                font-size: 11px;
                font-weight: 500;
            }

            .info-panel {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 240px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                display: none;
                font-size: 12px;
                z-index: 999;
            }

            .info-title {
                font-weight: 600;
                margin-bottom: 10px;
                color: #1e293b;
                font-size: 14px;
                border-bottom: 1px solid rgba(0,0,0,0.1);
                padding-bottom: 6px;
            }

            .info-detail {
                margin-bottom: 6px;
                color: #64748b;
                font-size: 11px;
            }

            .info-detail strong {
                color: #374151;
                font-weight: 600;
            }

            .loading {
                position: absolute;
                top: 50%%;
                left: 50%%;
                transform: translate(-50%%, -50%%);
                color: white;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(255,255,255,0.1);
                padding: 20px 30px;
                border-radius: 12px;
                backdrop-filter: blur(10px);
            }

            .loading::before {
                content: '';
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            @media (max-width: 768px) {
                .main {
                    margin: 8px;
                }
                .header {
                    padding: 12px 16px;
                }
                .header h1 {
                    font-size: 16px;
                }
                .controls {
                    flex-direction: column;
                    top: 16px;
                    left: 16px;
                }
                .legend {
                    bottom: 16px;
                    right: 16px;
                    min-width: 140px;
                }
                .info-panel {
                    width: 220px;
                    right: 16px;
                    top: 16px;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>
                <span style="font-size: 16px;">🔄</span>
                %s
            </h1>
            <div class="header-actions">
                <button class="btn" onclick="fitGraph()">🎯 전체 보기</button>
            </div>
        </div>
        
        <div class="main">
            <div id="loading" class="loading">Loading</div>
            <div id="cy" style="display: none;"></div>
            
            <div class="controls">
                <button class="btn active" onclick="changeLayout('hierarchy')">📊 플로우</button>
                <button class="btn" onclick="changeLayout('breadthfirst')">🌐 방사형</button>
                <button class="btn" onclick="changeLayout('circle')">⭕ 원형</button>
            </div>
            
            <div class="legend">
                <div class="legend-title">노드 타입</div>
                <div class="legend-item">
                    <div class="legend-shape circle" style="background: #dbeafe; border-color: #3b82f6;">👤</div>
                    <span class="legend-label">Client</span>
                </div>
                <div class="legend-item">
                    <div class="legend-shape square" style="background: #dcfce7; border-color: #16a34a;">🔧</div>
                    <span class="legend-label">API</span>
                </div>
                <div class="legend-item">
                    <div class="legend-shape diamond" style="background: #fef3c7; border-color: #d97706;">⚙️</div>
                    <span class="legend-label">Service</span>
                </div>
                <div class="legend-item">
                    <div class="legend-shape square" style="background: #e0e7ff; border-color: #7c3aed;">🗄️</div>
                    <span class="legend-label">Database</span>
                </div>
                <div class="legend-item">
                    <div class="legend-shape triangle" style="border-bottom-color: #dc2626;">⚠️</div>
                    <span class="legend-label">Error</span>
                </div>
            </div>
            
            <div id="info-panel" class="info-panel">
                <div id="info-title" class="info-title">Node Details</div>
                <div id="info-details"></div>
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
                        
                        style: [
                            {
                                selector: 'node',
                                style: {
                                    'label': 'data(label)',
                                    'text-valign': 'center',
                                    'text-halign': 'center',
                                    'font-size': '11px',
                                    'font-weight': '600',
                                    'color': '#374151',
                                    'text-wrap': 'wrap',
                                    'text-max-width': '90px',
                                    'width': '80px',
                                    'height': '50px',
                                    'border-width': 2,
                                    'transition-duration': '0.3s',
                                    'box-shadow': '0 2px 10px rgba(0,0,0,0.1)'
                                }
                            },
                            
                            // Client/External - 원형 (심플)
                            {
                                selector: 'node[type = "client"], node[type = "external"]',
                                style: {
                                    'background-color': '#dbeafe',
                                    'border-color': '#3b82f6',
                                    'shape': 'ellipse',
                                    'width': '90px',
                                    'height': '60px'
                                }
                            },
                            
                            // API/Endpoint - 사각형 (심플)
                            {
                                selector: 'node[type = "api"], node[type = "endpoint"]',
                                style: {
                                    'background-color': '#dcfce7',
                                    'border-color': '#16a34a',
                                    'shape': 'rectangle',
                                    'width': '90px',
                                    'height': '50px'
                                }
                            },
                            
                            // Service/Process - 다이아몬드 (심플)
                            {
                                selector: 'node[type = "service"], node[type = "process"]',
                                style: {
                                    'background-color': '#fef3c7',
                                    'border-color': '#d97706',
                                    'shape': 'diamond',
                                    'width': '70px',
                                    'height': '70px'
                                }
                            },
                            
                            // Database - 둥근 사각형 (심플)
                            {
                                selector: 'node[type = "db"], node[type = "database"]',
                                style: {
                                    'background-color': '#e0e7ff',
                                    'border-color': '#7c3aed',
                                    'shape': 'round-rectangle',
                                    'width': '85px',
                                    'height': '55px'
                                }
                            },
                            
                            // Error - 삼각형 (심플)
                            {
                                selector: 'node[type = "error"], node[type = "end"]',
                                style: {
                                    'background-color': '#fee2e2',
                                    'border-color': '#dc2626',
                                    'shape': 'triangle',
                                    'width': '60px',
                                    'height': '60px'
                                }
                            },
                            
                            // 엣지 스타일
                            {
                                selector: 'edge',
                                style: {
                                    'curve-style': 'bezier',
                                    'target-arrow-shape': 'triangle',
                                    'target-arrow-color': '#64748b',
                                    'line-color': '#64748b',
                                    'width': 2,
                                    'label': 'data(label)',
                                    'font-size': '10px',
                                    'color': '#64748b',
                                    'text-background-color': 'rgba(255,255,255,0.9)',
                                    'text-background-opacity': 1,
                                    'text-background-padding': '3px',
                                    'text-background-shape': 'roundrectangle'
                                }
                            },

                            {
                                selector: 'edge[type = "success"]',
                                style: {
                                    'line-color': '#16a34a',
                                    'target-arrow-color': '#16a34a'
                                }
                            },
                            {
                                selector: 'edge[type = "error"]',
                                style: {
                                    'line-color': '#dc2626',
                                    'target-arrow-color': '#dc2626',
                                    'line-style': 'dashed'
                                }
                            },

                            {
                                selector: 'node:hover',
                                style: {
                                    'border-width': 3,
                                    'transform': 'scale(1.05)',
                                    'box-shadow': '0 4px 20px rgba(0,0,0,0.2)'
                                }
                            }
                        ],

                        layout: {
                            name: 'breadthfirst',
                            directed: true,
                            roots: '#' + findRootNode(),
                            padding: 35,
                            spacingFactor: 1.4,
                            animate: true,
                            animationDuration: 500,
                            animationEasing: 'ease-out'
                        }
                    });

                    // 이벤트 핸들러
                    cy.on('tap', 'node', function(evt) {
                        showNodeInfo(evt.target);
                    });

                    cy.on('tap', function(evt) {
                        if (evt.target === cy) {
                            hideNodeInfo();
                        }
                    });

                    // 로딩 완료
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('cy').style.display = 'block';

                    setTimeout(() => cy.fit(null, 50), 600);

                } catch (error) {
                    console.error('Error:', error);
                    document.getElementById('loading').textContent = 'Error loading';
                }
            }

            function findRootNode() {
                const elements = %s;
                const sources = new Set();
                const targets = new Set();

                elements.forEach(el => {
                    if (el.data.source) {
                        sources.add(el.data.source);
                        targets.add(el.data.target);
                    }
                });

                for (let source of sources) {
                    if (!targets.has(source)) {
                        return source;
                    }
                }

                return sources.values().next().value || 'A';
            }

            function fitGraph() {
                if (cy) cy.fit(null, 50);
            }

            function changeLayout(layoutName) {
                if (!cy) return;

                const layouts = {
                    'hierarchy': {
                        name: 'breadthfirst',
                        directed: true,
                        roots: '#' + findRootNode(),
                        padding: 35,
                        spacingFactor: 1.4,
                        animate: true,
                        animationDuration: 500
                    },
                    'breadthfirst': {
                        name: 'breadthfirst',
                        directed: true,
                        padding: 35,
                        spacingFactor: 1.6,
                        animate: true,
                        animationDuration: 500
                    },
                    'circle': {
                        name: 'circle',
                        padding: 35,
                        animate: true,
                        animationDuration: 500
                    }
                };

                cy.layout(layouts[layoutName]).run();

                document.querySelectorAll('.controls .btn').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
            }

            function showNodeInfo(node) {
                const panel = document.getElementById('info-panel');
                const title = document.getElementById('info-title');
                const details = document.getElementById('info-details');

                title.textContent = node.data('label').split('\\n')[0];

                let html = '';
                if (node.data('method')) html += `<div class="info-detail"><strong>Method:</strong> $${node.data('method')}</div>`;
                if (node.data('endpoint')) html += `<div class="info-detail"><strong>Path:</strong> $${node.data('endpoint')}</div>`;
                html += `<div class="info-detail"><strong>Type:</strong> $${node.data('type')}</div>`;
                html += `<div class="info-detail"><strong>ID:</strong> $${node.data('id')}</div>`;

                details.innerHTML = html;
                panel.style.display = 'block';
            }

            function hideNodeInfo() {
                document.getElementById('info-panel').style.display = 'none';
            }
        </script>
    </body>
    </html>
    """, req.getTitle() != null ? req.getTitle() : "API Flow", req.getTitle() != null ? req.getTitle() : "API Flow", elementsJson.toString(), elementsJson.toString());
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
