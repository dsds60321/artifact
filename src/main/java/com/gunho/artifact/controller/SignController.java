package com.gunho.artifact.controller;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.EmailDto;
import com.gunho.artifact.dto.sign.EmailVerificationDto;
import com.gunho.artifact.dto.sign.SignUpDto;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.service.SignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/sign")
@RequiredArgsConstructor
public class SignController {

    private final SignService signService;

    @GetMapping("/in")
    public String signIn(@RequestParam(value = "error", required = false) String error, Model model) {
        if (error != null) {
            model.addAttribute("errorMessage", "아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        return "sign/in";
    }

    @GetMapping("/up")
    public String signUp(Model model) {
        if (!model.containsAttribute("signUpRequest")) {
            model.addAttribute("signUpRequest", new SignUpDto.Request());
        }
        return "sign/up";
    }

    @PostMapping("/up")
    public String register(
            @Valid @ModelAttribute("signUpRequest") SignUpDto.Request request,
            BindingResult bindingResult,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("errorMessage", bindingResult.getAllErrors().get(0).getDefaultMessage());
            return "sign/up";
        }

        try {
            signService.register(request);
        } catch (ArtifactException e) {
            model.addAttribute("errorMessage", e.getMessage());
            return "sign/up";
        }

        redirectAttributes.addFlashAttribute("signUpSuccess", true);
        return "redirect:/sign/in";
    }

    @PostMapping("/email/verification-code")
    public @ResponseBody ApiResponse<?> sendVerificationCode(@RequestBody @Valid EmailDto.RequestVerify request) {
        try {
            signService.sendVerificationCodeEmail(request);
            return ApiResponse.success("인증코드 발송에 성공했습니다.");
        } catch (ArtifactException e) {
            return ApiResponse.failure(e.getMessage());
        }
    }


    @PostMapping("/email/verification")
    public @ResponseBody ApiResponse<?> verifyCode(@RequestBody @Valid EmailVerificationDto.Request request) {
        boolean isSuccess = signService.checkVerificationCode(request);
        if (isSuccess) {
            return ApiResponse.success("인증에 성공했습니다.");
        }
        return ApiResponse.failure("인증번호가 올바르지 않습니다. 확인 후 다시 입력해주세요.");
    }

}
