package com.gunho.artifact.service;

import com.gunho.artifact.dto.EmailDto;
import com.gunho.artifact.dto.sign.EmailVerificationDto;
import com.gunho.artifact.dto.sign.SignUpDto;
import com.gunho.artifact.enums.RedisKey;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.repository.UserRepository;
import com.gunho.artifact.repository.UserSubscriptionRepository;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignService {

    private final RedisService redisService;
    private final EmailService emailService;
    private final PlanService planService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void sendVerificationCodeEmail(EmailDto.RequestVerify requestVerify) {
        String email = requestVerify.email().trim();
        String userId = requestVerify.id().trim();

        if (userRepository.existsByEmail(email)) {
            throw new ArtifactException("이미 등록된 이메일 입니다.");
        }

        if (userRepository.findById(userId).isPresent()) {
            throw new ArtifactException("이미 사용 중인 아이디입니다.");
        }

        try {
            String randomCode = Utils.generateRandomCode(6);
            String redisKey = RedisKey.SIGN_VERIFY.getFormatKey(email);
            redisService.set(redisKey, randomCode, Duration.ofMinutes(5));
            redisService.delete(RedisKey.SIGN_VERIFIED.getFormatKey(email));
            emailService.sendVerifyCode(new EmailDto.RequestVerify(userId, requestVerify.nickName(), email), randomCode);
        } catch (Exception e) {
            log.error("Exception occurred while sending verification code email", e);
            throw new ArtifactException("이메일 인증 전송에 실패 했습니다.");
        }
    }

    public boolean checkVerificationCode(EmailVerificationDto.Request request) {
        String email = request.email().trim();
        String redisKey = RedisKey.SIGN_VERIFY.getFormatKey(email);
        if (!redisService.hasKey(redisKey)) {
            throw new ArtifactException("인증시간을 초과했습니다. 다시 시도 해주세요.");
        }

        String code = redisService.get(redisKey, String.class)
                .orElseThrow(() -> new ArtifactException("인증시간을 초과했습니다. 다시 시도 해주세요."));

        boolean matched = request.code().trim().equals(code);
        if (matched) {
            redisService.delete(redisKey);
            redisService.set(RedisKey.SIGN_VERIFIED.getFormatKey(email), Boolean.TRUE, Duration.ofMinutes(10));
        }
        return matched;
    }

    @Transactional
    public void register(SignUpDto.Request request) {
        validateAgreements(request);
        validatePasswords(request);

        String userId = request.getUserId().trim();
        String email = request.getEmail().trim();
        String verifiedKey = RedisKey.SIGN_VERIFIED.getFormatKey(email);
        if (!redisService.hasKey(verifiedKey)) {
            throw new ArtifactException("이메일 인증을 먼저 완료해 주세요.");
        }

        ensureUniqueAccount(userId, email);

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        String firstName = request.getFirstName().trim();
        String lastName = request.getLastName().trim();
        String nickname = lastName + firstName;

        User user = User.builder()
                .id(userId)
                .email(email)
                .phone(normalizePhone(request.getPhone()))
                .passwordHash(encodedPassword)
                .nickname(nickname)
                .gender(User.Gender.OTHER)
                .bio(null)
                .provider(null)
                .providerId(null)
                .profileImageUrl(null)
                .authType(User.AuthType.LOCAL)
                .build();

        user.setEmailVerified(true);
        userRepository.save(user);
        planService.initFreePlan(user);
        redisService.delete(verifiedKey);
    }

    private void validateAgreements(SignUpDto.Request request) {
        if (!request.isAgreeTerms() || !request.isAgreePrivacy()) {
            throw new ArtifactException("필수 약관에 동의해야 회원가입을 진행할 수 있습니다.");
        }
    }

    private void validatePasswords(SignUpDto.Request request) {
        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new ArtifactException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }
    }

    private void ensureUniqueAccount(String userId, String email) {
        Optional<User> duplicatedById = userRepository.findById(userId);
        if (duplicatedById.isPresent()) {
            throw new ArtifactException("이미 사용 중인 아이디입니다.");
        }

        Optional<User> duplicatedByEmail = userRepository.findByEmail(email);
        if (duplicatedByEmail.isPresent()) {
            throw new ArtifactException("이미 등록된 이메일입니다.");
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return phone.replaceAll("\\s", "");
    }
}
