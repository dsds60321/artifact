package com.gunho.artifact.dto;

import com.gunho.artifact.entity.BillingPlan;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.entity.UserSubscription;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public class UserProfileDto {

    public record ProfileView(
            UserInfo user,
            SubscriptionInfo subscription,
            List<PlanOption> plans
    ) {
        public static ProfileView of(User user, Optional<UserSubscription> subscription, List<BillingPlan> plans) {
            return new ProfileView(
                    UserInfo.from(user),
                    subscription.map(SubscriptionInfo::from).orElse(null),
                    plans.stream().map(PlanOption::from).toList()
            );
        }
    }

    public record UserInfo(
            Long idx,
            String userId,
            String email,
            String nickname,
            String phone,
            String bio,
            User.Gender gender,
            User.Status status,
            Boolean emailVerified,
            Boolean phoneVerified,
            User.AuthType authType,
            String provider,
            LocalDateTime createdAt,
            LocalDateTime lastLoginAt
    ) {
        public static UserInfo from(User user) {
            return new UserInfo(
                    user.getIdx(),
                    user.getId(),
                    user.getEmail(),
                    user.getNickname(),
                    user.getPhone(),
                    user.getBio(),
                    user.getGender(),
                    user.getStatus(),
                    user.getEmailVerified(),
                    user.getPhoneVerified(),
                    user.getAuthType(),
                    user.getProvider(),
                    user.getCreatedAt(),
                    user.getLastLoginAt()
            );
        }
    }

    public record SubscriptionInfo(
            Long subscriptionId,
            Long planId,
            String planName,
            BillingPlan.BillingCycle billingCycle,
            BigDecimal price,
            Integer projectLimit,
            Integer artifactLimit,
            Integer downloadLimit,
            Integer projectUsage,
            Integer artifactUsage,
            Integer downloadUsage,
            UserSubscription.SubscriptionStatus status,
            LocalDateTime currentPeriodStart,
            LocalDateTime currentPeriodEnd,
            LocalDateTime nextBillingAt
    ) {
        public static SubscriptionInfo from(UserSubscription subscription) {
            BillingPlan plan = subscription.getBillingPlan();
            return new SubscriptionInfo(
                    subscription.getIdx(),
                    plan != null ? plan.getIdx() : null,
                    plan != null ? plan.getName() : null,
                    plan != null ? plan.getBillingCycle() : null,
                    plan != null ? plan.getPrice() : null,
                    plan != null ? plan.getProjectLimit() : null,
                    plan != null ? plan.getArtifactLimit() : null,
                    plan != null ? plan.getDownloadLimit() : null,
                    subscription.getProjectUsage(),
                    subscription.getArtifactUsage(),
                    subscription.getDownloadUsage(),
                    subscription.getStatus(),
                    subscription.getCurrentPeriodStart(),
                    subscription.getCurrentPeriodEnd(),
                    subscription.getNextBillingAt()
            );
        }
    }

    public record PlanOption(
            Long planId,
            String name,
            BillingPlan.BillingCycle billingCycle,
            BigDecimal price,
            Integer projectLimit,
            Integer artifactLimit,
            Integer downloadLimit,
            Boolean active
    ) {
        public static PlanOption from(BillingPlan plan) {
            return new PlanOption(
                    plan.getIdx(),
                    plan.getName(),
                    plan.getBillingCycle(),
                    plan.getPrice(),
                    plan.getProjectLimit(),
                    plan.getArtifactLimit(),
                    plan.getDownloadLimit(),
                    plan.getActive()
            );
        }
    }

    public record UpdateRequest(
            @Email(message = "올바른 이메일 형식이 아닙니다.")
            @NotBlank(message = "이메일을 입력해주세요.")
            String email,

            @NotBlank(message = "닉네임을 입력해주세요.")
            @Size(max = 32, message = "닉네임은 32자 이하로 입력해주세요.")
            String nickname,

            @Pattern(regexp = "^[0-9\\-+() ]{0,20}$", message = "전화번호 형식이 올바르지 않습니다.")
            @Size(max = 20, message = "전화번호는 20자 이하로 입력해주세요.")
            String phone,

            @Size(max = 255, message = "소개는 255자 이하로 입력해주세요.")
            String bio
    ) {
    }

    public record PlanChangeRequest(
            @NotNull(message = "변경할 플랜을 선택해주세요.")
            Long planId
    ) {
    }
}
