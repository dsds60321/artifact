package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.entity.Artifact;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.repository.ArtifactRepository;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtifactService {

    private final ArtifactRepository artifactRepository;

    public ApiResponse<?> createArtifact(User user,ArtifactDto.Request req) {
        Artifact artifact = Artifact.toEntity(req);
        Artifact savedArtifact = artifactRepository.save(artifact);

        if (Utils.isEmpty(savedArtifact)) {
            return ApiResponse.failure("프로젝트 생성에 실패했습니다.");
        }
        return ApiResponse.success("프로젝트 생성에 성공했습니다.");
    }

    public void getDetails(Model model, User user, long idx) {
        List<Artifact> artifacts = artifactRepository.findAllByIdx(idx);

        // 프로젝트 정보 (테스트 데이터)
        Map<String, Object> project = new HashMap<>();
        project.put("id", idx);
        project.put("title", "주문 관리 시스템");
        project.put("version", "1.2.0");
        project.put("description", "전자상거래 주문 처리를 위한 API 시스템");
        project.put("createdAt", LocalDateTime.now().minusDays(30));
        project.put("updatedAt", LocalDateTime.now().minusDays(1));

        // API 문서 산출물 (테스트 데이터)
        List<Map<String, Object>> docs = Arrays.asList(
                createArtifactMap(1L, "주문 API 명세서", "DOCS", "주문 생성, 조회, 수정, 삭제 API"),
                createArtifactMap(2L, "결제 API 명세서", "DOCS", "결제 처리 관련 API"),
                createArtifactMap(3L, "사용자 인증 API", "DOCS", "로그인, 회원가입, 토큰 관리 API"),
                createArtifactMap(4L, "상품 관리 API", "DOCS", "상품 등록, 조회, 재고 관리 API")
        );

        // API Flow 산출물 (테스트 데이터)
        List<Map<String, Object>> flows = Arrays.asList(
                createArtifactMap(5L, "주문 처리 플로우", "FLOW", "고객 주문부터 배송까지의 전체 프로세스"),
                createArtifactMap(6L, "결제 승인 플로우", "FLOW", "결제 요청부터 승인까지의 프로세스"),
                createArtifactMap(7L, "회원 가입 플로우", "FLOW", "신규 사용자 등록 프로세스")
        );

        // 기타 산출물 (테스트 데이터)
        List<Map<String, Object>> others = Arrays.asList(
                createArtifactMap(8L, "데이터베이스 스키마", "SCHEMA", "전체 데이터베이스 테이블 구조"),
                createArtifactMap(9L, "배포 가이드", "GUIDE", "운영 환경 배포 절차")
        );

        // 최근 수정된 산출물 (테스트 데이터)
        List<Map<String, Object>> recentArtifacts = Arrays.asList(
                createRecentArtifactMap(2L, "결제 API 명세서", "DOCS", LocalDateTime.now().minusDays(1)),
                createRecentArtifactMap(5L, "주문 처리 플로우", "FLOW", LocalDateTime.now().minusDays(2)),
                createRecentArtifactMap(1L, "주문 API 명세서", "DOCS", LocalDateTime.now().minusDays(3))
        );

        // 통계 정보 계산
        int totalArtifacts = docs.size() + flows.size() + others.size();
        int docsCount = docs.size();
        int flowsCount = flows.size();
        int othersCount = others.size();

        // 모델에 데이터 추가
        model.addAttribute("project", project);
        model.addAttribute("docs", docs);
        model.addAttribute("flows", flows);
        model.addAttribute("others", others);
        model.addAttribute("recentArtifacts", recentArtifacts);
        model.addAttribute("totalArtifacts", totalArtifacts);
        model.addAttribute("docsCount", docsCount);
        model.addAttribute("flowsCount", flowsCount);
        model.addAttribute("othersCount", othersCount);

        // 추가 정보
        model.addAttribute("currentUser", user);
        model.addAttribute("projectId", idx);

        log.info("프로젝트 상세 정보 조회 완료 - projectId: {}, totalArtifacts: {}", idx, totalArtifacts);
    }

    // 산출물 맵 생성 헬퍼 메서드
    private Map<String, Object> createArtifactMap(Long id, String title, String subType, String description) {
        Map<String, Object> artifact = new HashMap<>();
        artifact.put("id", id);
        artifact.put("title", title);
        artifact.put("subType", subType);
        artifact.put("description", description);
        artifact.put("createdAt", LocalDateTime.now().minusDays((int)(Math.random() * 30)));
        artifact.put("updatedAt", LocalDateTime.now().minusDays((int)(Math.random() * 7)));
        artifact.put("status", "ACTIVE");
        return artifact;
    }

    // 최근 수정된 산출물 맵 생성 헬퍼 메서드
    private Map<String, Object> createRecentArtifactMap(Long id, String title, String subType, LocalDateTime updatedAt) {
        Map<String, Object> artifact = new HashMap<>();
        artifact.put("id", id);
        artifact.put("title", title);
        artifact.put("subType", subType);
        artifact.put("updatedAt", updatedAt);

        // 타입별 아이콘 설정
        switch (subType) {
            case "DOCS":
                artifact.put("icon", "fas fa-file-code");
                artifact.put("color", "#10b981");
                break;
            case "FLOW":
                artifact.put("icon", "fas fa-project-diagram");
                artifact.put("color", "#3b82f6");
                break;
            case "SCHEMA":
                artifact.put("icon", "fas fa-database");
                artifact.put("color", "#8b5cf6");
                break;
            case "GUIDE":
                artifact.put("icon", "fas fa-book");
                artifact.put("color", "#f59e0b");
                break;
            default:
                artifact.put("icon", "fas fa-file");
                artifact.put("color", "#6b7280");
        }

        return artifact;
    }

}
