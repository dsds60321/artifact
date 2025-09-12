package com.gunho.artifact.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ApiDocsController {

    @GetMapping("/")
    public String index() {
        return "api";
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
