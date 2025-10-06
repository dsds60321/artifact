package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.EmailDto;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/email")
public class EmailController {

    private final EmailService emailService;

    @PostMapping("/plan")
    public ApiResponse<?> sendMail(@RequestBody EmailDto.RequestPlan request, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        emailService.sendPlan(request, userDetails.getUser());
        return ApiResponse.success("이메일 발송에 성공했습니다.");
    }
}
