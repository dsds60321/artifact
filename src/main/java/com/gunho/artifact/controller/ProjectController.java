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
}
