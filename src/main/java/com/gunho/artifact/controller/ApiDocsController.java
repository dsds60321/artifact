package com.gunho.artifact.controller;

import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Description;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@RequiredArgsConstructor
@Controller
public class ApiDocsController {

    private final DashboardService dashboardService;

    @Description("홈")
    @GetMapping("/")
    public String index(Model model, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        dashboardService.getUserDatas(model ,userDetails.getUser());
        return "home";
    }

    @GetMapping("/test")
    public String test() {
        return "project-list";
    }

    @GetMapping("/api-docs")
    public String apiDocs() {
        return "api-docs-editor";
    }
}
