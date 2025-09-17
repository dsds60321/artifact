package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.ArtifactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Description;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("artifact")
public class ArtifactController {

    private final ArtifactService artifactService;

    @GetMapping("/new/{idx}")
    public String newProject(@PathVariable Long idx) {
        return "modal/artifact-add";
    }


    @Description("아티팩트 컨테이너 데이터 생성")
    @PostMapping("/")
    public @ResponseBody ApiResponse<?> createArtifact(@Valid @RequestBody ArtifactDto.Request req, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        return artifactService.createArtifact(userDetails.getUser(), req);
    }

}
