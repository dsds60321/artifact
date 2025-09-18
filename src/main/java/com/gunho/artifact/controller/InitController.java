package com.gunho.artifact.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class InitController {

    @GetMapping("/welcome")
    public String welcome() {
        return "index";
    }
}
