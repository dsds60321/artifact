package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ProjectDto;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.ArtifactService;
import com.gunho.artifact.service.DashboardService;
import com.gunho.artifact.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/project")
public class ProjectController {

    private final DashboardService dashboardService;
    private final ProjectService projectService;
    private final ArtifactService artifactService;

    @GetMapping
    public String index(Model model, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        dashboardService.getUserDatas(model ,userDetails.getUser());
        model.addAttribute("PROJECT_USAGE_GUIDE", buildUsageGuideSteps());
        return "project/index";
    }

    // 프로젝트 신규 모달
    @GetMapping("/new")
    public String newProject() {
        return "project/modal/project-add";
    }

    // 프로젝트 생성
    @PostMapping
    public @ResponseBody ApiResponse<?> createProject(@Valid @RequestBody ProjectDto.Request request, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        return projectService.create(request, userDetails.getUser());
    }

    // 프로젝트 삭제
    @DeleteMapping("{idx}")
    public @ResponseBody ApiResponse<?> deleteProject(@PathVariable long idx, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        return projectService.delete(idx, userDetails.getUser());
    }

    // 프로젝트 상세
    @GetMapping("/{idx}")
    public String getDetails(@PathVariable long idx, Model model, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        artifactService.getDetails(model, userDetails.getUser(), idx);
        return "project/detail";
    }

    private List<ProjectUsageGuideStep> buildUsageGuideSteps() {
        return List.of(
                new ProjectUsageGuideStep(
                        1,
                        "프로젝트 개요 확인",
                        "좌측 목록에서 프로젝트를 선택하면 상세 페이지로 이동하며, 우측 카드에서 API 문서와 Flow 현황을 확인할 수 있습니다.",
                        "/images/tutorial/project-overview.png"
                ),
                new ProjectUsageGuideStep(
                        2,
                        "새 프로젝트 생성",
                        "상단의 \"새 프로젝트\" 버튼을 클릭한 뒤 기본 정보(제목, 버전, 설명)를 입력해 프로젝트를 추가하세요.",
                        "/images/tutorial/project-create.png"
                ),
                new ProjectUsageGuideStep(
                        3,
                        "API 문서 작성",
                        "프로젝트 상세 화면에서 API 문서를 생성하면 Scalar 기반 편집기가 열립니다. 경로, 쿼리, 바디 파라미터를 순서대로 입력하세요.",
                        "/images/tutorial/project-docs.png"
                ),
                new ProjectUsageGuideStep(
                        4,
                        "API Flow 관리",
                        "Flow 탭에서 엔드포인트 호출 순서를 설계하고 메모를 남길 수 있습니다. 팀과 공유할 시나리오를 시각화하세요.",
                        "/images/tutorial/project-flow.png"
                ),
                new ProjectUsageGuideStep(
                        5,
                        "산출물 정리",
                        "생성된 산출물은 프로젝트 카드의 통계에서 확인할 수 있습니다. 부족한 자료가 있다면 바로가기 버튼으로 이동해 추가하세요.",
                        "/images/tutorial/project-summary.png"
                )
        );
    }

    private record ProjectUsageGuideStep(int order, String title, String description, String imageUrl) {
    }
}
