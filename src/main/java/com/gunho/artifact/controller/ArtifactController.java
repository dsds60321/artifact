package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.ArtifactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/project/artifact")
public class ArtifactController {

    private final ArtifactService artifactService;

    @PostMapping("/new")
    public @ResponseBody ApiResponse<?> createArtifact(@Valid @RequestBody ArtifactDto.Request request, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        return artifactService.create(request, userDetails.getUser());
    }

    @GetMapping("/new/{idx}")
    public String newArtifact(Model model,  @PathVariable Long idx) {
        model.addAttribute("projectIdx", idx);
        return "docs-add";
    }

    @GetMapping("/docs")
    public String docsAdd() {
        return "project/artifact/docs/index";
    }

    @GetMapping("/docs/{idx}")
    public String docsEdit(@PathVariable Long idx) {
        return "project/artifact/docs/index";
    }

    @GetMapping("/flows")
    public String flowsAdd() {
        return "project/artifact/flows/index";
    }

    @GetMapping("/flows/{idx}")
    public String flowsEdit(@PathVariable Long idx) {
        return "project/artifact/flows/index";
    }

}
