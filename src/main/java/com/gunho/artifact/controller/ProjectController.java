package com.gunho.artifact.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("project")
public class ProjectController {

    @GetMapping("/new")
    public String newProject() {
        return "modal/project-add";
    }
}
