package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.ArtifactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Description;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/artifact")
public class ArtifactController {

    private final ArtifactService artifactService;

    @Description("아티팩트 컨테이너 데이터 생성")
    @PostMapping("/")
    public ApiResponse<?> createArtifact(@Valid @RequestBody ArtifactDto.Request req, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        return artifactService.createArtifact(userDetails.getUser(), req);
    }
}
