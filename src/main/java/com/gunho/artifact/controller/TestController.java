package com.gunho.artifact.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@RequiredArgsConstructor
@Controller
public class TestController {

    @GetMapping("/test")
    public String test() {
        return "project-list";
    }

    @GetMapping("/api-docs")
    public String apiDocs() {
        return "api-docs-editor";
    }
}
