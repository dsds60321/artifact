package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.UserProfileDto;
import com.gunho.artifact.security.ArtifactUserDetails;
import com.gunho.artifact.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public String profile(Model model, @AuthenticationPrincipal ArtifactUserDetails userDetails) {
        UserProfileDto.ProfileView profileView = userService.getProfileView(userDetails.getUser());
        model.addAttribute("PROFILE", profileView);
        model.addAttribute("USER_INFO", profileView.user());
        model.addAttribute("SUBSCRIPTION", profileView.subscription());
        model.addAttribute("PLANS", profileView.plans());
        return "user/profile";
    }

    @PostMapping("/profile/info")
    public @ResponseBody ApiResponse<UserProfileDto.UserInfo> updateProfile(
            @Valid @RequestBody UserProfileDto.UpdateRequest request,
            @AuthenticationPrincipal ArtifactUserDetails userDetails
    ) {
        UserProfileDto.UserInfo updatedProfile = userService.updateProfile(userDetails.getUser(), request);
        return ApiResponse.success(updatedProfile, "프로필 정보가 업데이트되었습니다.");
    }

    @PostMapping("/profile/plan")
    public @ResponseBody ApiResponse<UserProfileDto.SubscriptionInfo> changePlan(
            @Valid @RequestBody UserProfileDto.PlanChangeRequest request,
            @AuthenticationPrincipal ArtifactUserDetails userDetails
    ) {
        UserProfileDto.SubscriptionInfo subscriptionInfo = userService.changePlan(userDetails.getUser(), request);
        return ApiResponse.success(subscriptionInfo, "플랜이 변경되었습니다.");
    }
}
