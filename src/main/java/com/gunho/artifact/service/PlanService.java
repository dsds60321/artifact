package com.gunho.artifact.service;

import com.gunho.artifact.entity.BillingPlan;
import com.gunho.artifact.entity.Code;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.entity.UserSubscription;
import com.gunho.artifact.enums.CodeEnums;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.repository.BillingPlanRepository;
import com.gunho.artifact.repository.CodeRepository;
import com.gunho.artifact.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PlanService {

    private final CodeRepository codeRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final BillingPlanRepository billingPlanRepository;

    public void initFreePlan(User user) {
        if (user == null) {
            throw new ArtifactException("유저를 찾을 수 없습니다.");
        }

        boolean alreadySubscribed = userSubscriptionRepository.findByUserIdx(user.getIdx()).isPresent();
        if (!alreadySubscribed) {
            Code code = codeRepository.findByCodeAndCodeType(CodeEnums.BillingCode.FREE.getCode(), CodeEnums.BillingCode.FREE.getCodeType())
                    .orElseThrow(() -> new ArtifactException("플랜 생성에 실패했습니다."));

            BillingPlan billingPlan = billingPlanRepository.findByCodeIdx(code.getIdx())
                    .orElseThrow(() -> new ArtifactException("플랜 생성에 실패했습니다."));

            // 현재일시 기준 plan + 기간 생성
            LocalDateTime nextPeriod = calculateNextPeriod(billingPlan.getBillingCycle());

            UserSubscription userSubscription = UserSubscription.builder()
                    .user(user)
                    .billingPlan(billingPlan)
                    .currentPeriodEnd(nextPeriod)
                    .nextBillingAt(nextPeriod)
                    .build();

            userSubscriptionRepository.save(userSubscription);
        }
    }

    private LocalDateTime calculateNextPeriod(BillingPlan.BillingCycle cycle) {
        switch (cycle) {
            case DAILY -> {
                return LocalDateTime.now().plusDays(1);
            }
            case WEEKLY -> {
                return LocalDateTime.now().plusWeeks(1);
            }
            case MONTHLY -> {
                return LocalDateTime.now().plusMonths(1);
            }
            case YEARLY -> {
                return LocalDateTime.now().plusYears(1);
            }
            default -> {
                return LocalDateTime.now();
            }
        }
    }
}
