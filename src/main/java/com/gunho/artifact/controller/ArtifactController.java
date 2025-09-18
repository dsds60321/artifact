package com.gunho.artifact.controller;

import com.gunho.artifact.service.ArtifactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequiredArgsConstructor
@RequestMapping("/artifact")
public class ArtifactController {

    private final ArtifactService artifactService;


    @GetMapping("/new/{idx}")
    public String newProject(@PathVariable Long idx) {
        return "modal/artifact-add";
    }


}
