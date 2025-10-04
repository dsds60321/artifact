package com.gunho.artifact.service;

import com.gunho.artifact.dto.UserProfileDto;
import com.gunho.artifact.entity.BillingPlan;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.entity.UserSubscription;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.repository.BillingPlanRepository;
import com.gunho.artifact.repository.UserRepository;
import com.gunho.artifact.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final BillingPlanRepository billingPlanRepository;

    @Transactional(readOnly = true)
    public UserProfileDto.ProfileView getProfileView(User user) {
        User persistedUser = findUser(user.getIdx());
        Optional<UserSubscription> subscription = userSubscriptionRepository.findByUserIdx(persistedUser.getIdx());
        List<BillingPlan> plans = billingPlanRepository.findByActiveTrueOrderByPriceAsc();
        return UserProfileDto.ProfileView.of(persistedUser, subscription, plans);
    }

    @Transactional
    public UserProfileDto.UserInfo updateProfile(User user, UserProfileDto.UpdateRequest request) {
        User persistedUser = findUser(user.getIdx());
        persistedUser.updateProfile(request.email(), request.nickname(), request.phone(), request.bio());
        userRepository.save(persistedUser);
        return UserProfileDto.UserInfo.from(persistedUser);
    }

    @Transactional
    public UserProfileDto.SubscriptionInfo changePlan(User user, UserProfileDto.PlanChangeRequest request) {
        User persistedUser = findUser(user.getIdx());
        UserSubscription subscription = userSubscriptionRepository.findByUserIdx(persistedUser.getIdx())
                .orElseThrow(() -> new ArtifactException("사용자 구독 정보를 찾을 수 없습니다."));

        BillingPlan billingPlan = billingPlanRepository.findById(request.planId())
                .orElseThrow(() -> new ArtifactException("선택한 플랜을 찾을 수 없습니다."));

        if (!Boolean.TRUE.equals(billingPlan.getActive())) {
            throw new ArtifactException("비활성화된 플랜은 선택할 수 없습니다.");
        }

        if (subscription.getBillingPlan() != null && billingPlan.getIdx().equals(subscription.getBillingPlan().getIdx())) {
            throw new ArtifactException("이미 해당 플랜을 사용 중입니다.");
        }

        LocalDateTime periodStart = LocalDateTime.now();
        LocalDateTime periodEnd = calculateNextPeriod(billingPlan.getBillingCycle(), periodStart);
        subscription.changePlan(billingPlan, periodStart, periodEnd);
        userSubscriptionRepository.save(subscription);

        return UserProfileDto.SubscriptionInfo.from(subscription);
    }

    private User findUser(Long userIdx) {
        return userRepository.findById(userIdx)
                .orElseThrow(() -> new ArtifactException("사용자 정보를 찾을 수 없습니다."));
    }

    private LocalDateTime calculateNextPeriod(BillingPlan.BillingCycle cycle, LocalDateTime base) {
        return switch (cycle) {
            case DAILY -> base.plusDays(1);
            case WEEKLY -> base.plusWeeks(1);
            case MONTHLY -> base.plusMonths(1);
            case YEARLY -> base.plusYears(1);
        };
    }
}
