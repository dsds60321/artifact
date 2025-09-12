package com.gunho.artifact.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class Base64FileWriter {

    private static final Map<String, String> MIME_EXT = new HashMap<>();

    static {
        MIME_EXT.put("image/png", "png");
        MIME_EXT.put("image/jpeg", "jpg");
        MIME_EXT.put("image/jpg", "jpg");
        MIME_EXT.put("image/gif", "gif");
        MIME_EXT.put("application/pdf", "pdf");
        MIME_EXT.put("application/zip", "zip");
        MIME_EXT.put("text/plain", "txt");
        MIME_EXT.put("application/octet-stream", "bin");
    }

    private Base64FileWriter() {}

    public static Path saveBase64ToFile(String base64, Path outputPath) throws IOException {
        byte[] bytes = decodeBase64Payload(base64);
        createParentDirectories(outputPath);
        return Files.write(outputPath, bytes);
    }

    public static Path saveBase64ToFile(String base64, Path outputDir, String fileNameWithoutExtOrNull) throws IOException {
        Base64Payload payload = parseIfDataUrl(base64);
        byte[] bytes = decodeBase64Payload(base64);

        String ext = payload != null
                ? guessExtension(payload.mimeType())
                : "bin";

        String fileName = (fileNameWithoutExtOrNull == null || fileNameWithoutExtOrNull.isBlank())
                ? UUID.randomUUID().toString()
                : fileNameWithoutExtOrNull;

        Path target = outputDir.resolve(fileName + "." + ext);
        createParentDirectories(target);
        return Files.write(target, bytes);
    }

    private static void createParentDirectories(Path path) throws IOException {
        Path parent = path.getParent();
        if (parent != null && Files.notExists(parent)) {
            Files.createDirectories(parent);
        }
    }

    private record Base64Payload(String mimeType, String payload) {}

    private static Base64Payload parseIfDataUrl(String input) {
        // data:[<mediatype>][;base64],<data>
        if (input == null) return null;
        int commaIdx = input.indexOf(',');
        if (input.startsWith("data:") && commaIdx > 0) {
            String header = input.substring(5, commaIdx); // after "data:"
            String payload = input.substring(commaIdx + 1);
            String mime = "application/octet-stream";
            int semi = header.indexOf(';');
            if (semi >= 0) {
                String mt = header.substring(0, semi).trim();
                if (!mt.isBlank()) mime = mt;
            } else if (!header.isBlank()) {
                mime = header.trim();
            }
            return new Base64Payload(mime, payload);
        }
        return null;
    }

    private static byte[] decodeBase64Payload(String input) {
        if (input == null) {
            throw new IllegalArgumentException("Base64 입력이 null 입니다.");
        }

        Base64Payload dataUrl = parseIfDataUrl(input);
        String payload = (dataUrl != null) ? dataUrl.payload() : input;

        // 1) 공백/개행 제거
        payload = removeAllWhitespace(payload);

        // 2) 패딩 보정
        payload = addMissingPaddingIfNeeded(payload);

        // 3) URL-safe 여부 판별
        boolean looksUrlSafe = payload.indexOf('-') >= 0 || payload.indexOf('_') >= 0;

        // 4) 디코딩 시도 (판별된 종류 우선)
        try {
            return (looksUrlSafe ? Base64.getUrlDecoder() : Base64.getDecoder()).decode(payload);
        } catch (IllegalArgumentException first) {
            try {
                // 반대쪽 디코더로 재시도
                return (looksUrlSafe ? Base64.getDecoder() : Base64.getUrlDecoder()).decode(payload);
            } catch (IllegalArgumentException second) {
                String preview = payload.length() > 32 ? payload.substring(0, 32) + "..." : payload;
                throw new IllegalArgumentException("Base64 디코딩 실패: 입력이 올바른 Base64가 아닙니다. preview=" + preview, second);
            }
        }
    }

    private static String addMissingPaddingIfNeeded(String s) {
        int mod = s.length() % 4;
        if (mod == 0) return s;
        // URL-safe/일반 모두 '=' 패딩을 허용
        StringBuilder sb = new StringBuilder(s);
        for (int i = 0; i < 4 - mod; i++) sb.append('=');
        return sb.toString();
    }

    private static String removeAllWhitespace(String s) {
        // 모든 공백/개행/탭 제거
        return s == null ? null : s.replaceAll("\\s+", "");
    }

    private static String guessExtension(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) return "bin";
        return MIME_EXT.getOrDefault(mimeType.toLowerCase(), "bin");
    }
}

