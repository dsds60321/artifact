package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.ArtifactService;
import com.gunho.artifact.service.DashboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Description;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/artifact")
public class ArtifactController {

    private final DashboardService dashboardService;
    private final ArtifactService artifactService;

    @GetMapping
    public String index(Model model, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        dashboardService.getUserDatas(model ,userDetails.getUser());
        return "artifact/index";
    }

    @GetMapping("/{idx}")
    public String getDetails(@PathVariable long idx, Model model, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        artifactService.getDetails(model, userDetails.getUser(), idx);
        return "artifact/detail";
    }

    @GetMapping("/new/{idx}")
    public String newProject(@PathVariable Long idx) {
        return "modal/artifact-add";
    }


    @Description("아티팩트 컨테이너 데이터 생성")
    @PostMapping("/create")
    public @ResponseBody ApiResponse<?> createArtifact(@Valid @RequestBody ArtifactDto.Request req, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        return artifactService.createArtifact(userDetails.getUser(), req);
    }

}
