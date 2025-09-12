package com.gunho.artifact.service;

import lombok.RequiredArgsConstructor;
import com.gunho.artifact.dto.FlowChartRequest;
import com.gunho.artifact.model.FileArtifact;
import com.gunho.artifact.model.UrlArtifact;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FlowChartGenerator {

    public List<FileArtifact> generate(FlowChartRequest req) throws Exception {
        String mermaid = toMermaid(req);

        // 원본 .mmd
        String mmdBase64 = Base64.getEncoder().encodeToString(mermaid.getBytes(StandardCharsets.UTF_8));

        // PNG (Kroki)
        byte[] pngBytes = renderMermaidPng(mermaid);
        String pngBase64 = Base64.getEncoder().encodeToString(pngBytes);

        List<FileArtifact> out = new ArrayList<>();
        out.add(new FileArtifact("flowchart.mmd", "text/plain", mmdBase64));
        out.add(new FileArtifact("flowchart.png", "image/png", pngBase64));
        return out;
    }

    /**
     * 파일로 저장하고 URL만 반환하는 버전
     * - 저장 경로: generated/flowcharts/{uuid}/
     * - 정적 서빙: WebConfig /files/** → generated/
     */
    public List<UrlArtifact> generateAsFiles(FlowChartRequest req) throws Exception {
        String mermaid = toMermaid(req);
        byte[] mmdBytes = mermaid.getBytes(StandardCharsets.UTF_8);
        byte[] pngBytes = renderMermaidPng(mermaid);

        String batchId = UUID.randomUUID().toString();
        Path dir = Path.of("generated", "flowcharts", batchId);
        Files.createDirectories(dir);

        // 저장
        Path mmdPath = dir.resolve("flowchart.mmd");
        Path pngPath = dir.resolve("flowchart.png");
        Files.write(mmdPath, mmdBytes);
        Files.write(pngPath, pngBytes);

        // 메타
        String mmdSha = sha256Hex(mmdBytes);
        String pngSha = sha256Hex(pngBytes);

        List<UrlArtifact> out = new ArrayList<>();
        out.add(new UrlArtifact(
                "flowchart.mmd",
                "text/plain",
                Files.size(mmdPath),
                mmdSha,
                "/files/flowcharts/" + batchId + "/flowchart.mmd"
        ));
        out.add(new UrlArtifact(
                "flowchart.png",
                "image/png",
                Files.size(pngPath),
                pngSha,
                "/files/flowcharts/" + batchId + "/flowchart.png"
        ));
        return out;
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

    private byte[] renderMermaidPng(String mermaid) throws Exception {
        URL url = new URL("https://kroki.io/mermaid/png");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "text/plain; charset=UTF-8");
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);

        try (var os = conn.getOutputStream()) {
            os.write(mermaid.getBytes(StandardCharsets.UTF_8));
        }

        int code = conn.getResponseCode();
        if (code >= 200 && code < 300) {
            try (var is = conn.getInputStream()) {
                return is.readAllBytes();
            }
        } else {
            String err = "";
            try (var es = conn.getErrorStream()) {
                if (es != null) err = new String(es.readAllBytes(), StandardCharsets.UTF_8);
            }
            throw new IllegalStateException("Kroki render failed: HTTP " + code + " " + err);
        }
    }

    private static String sha256Hex(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] d = md.digest(data);
        return HexFormat.of().formatHex(d);
    }
}

