package com.gunho.artifact.service;

import com.gunho.artifact.entity.BillingPlan;
import com.gunho.artifact.entity.UserSubscription;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.exception.LimitException;
import com.gunho.artifact.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
@Slf4j
public class QuotaService {

    private final UserSubscriptionRepository userSubscriptionRepository;

    @Transactional
    public void consumeByProject(Long userIdx) {
        UserSubscription userSubscription = getUserSubscription(userIdx);
        BillingPlan plan = userSubscription.getBillingPlan();
        if (userSubscription.getProjectUsage() + 1 > plan.getProjectLimit()) {
            throw new LimitException("플랜 한도를 초과했습니다.");
        }
        userSubscription.usageProject();
    }

    @Transactional
    public void deleteByProject(Long userIdx) {
        UserSubscription userSubscription = getUserSubscription(userIdx);
        userSubscription.deleteProject();
    }

    @Transactional
    public void consumeByArtifact(Long userIdx) {
        UserSubscription userSubscription = getUserSubscription(userIdx);
        BillingPlan plan = userSubscription.getBillingPlan();
        if (userSubscription.getArtifactUsage() + 1 > plan.getArtifactLimit()) {
            throw new LimitException("플랜 한도를 초과했습니다.");
        }
        userSubscription.usageArtifact();
    }

    @Transactional
    public void deleteByArtifact(Long userIdx) {
        UserSubscription userSubscription = getUserSubscription(userIdx);
        userSubscription.deleteArtifact();
    }

    @Transactional
    public void consumeByDownload(Long userIdx) {
        UserSubscription userSubscription = getUserSubscription(userIdx);
        BillingPlan plan = userSubscription.getBillingPlan();
        if (userSubscription.getDownloadUsage() + 1 > plan.getDownloadLimit()) {
            throw new LimitException("플랜 한도를 초과했습니다.");
        }
        userSubscription.usageDownload();
    }

    public UserSubscription getUserSubscription(Long userIdx) {
        UserSubscription userSubscription = userSubscriptionRepository.findByUserIdx(userIdx)
                .orElseThrow(() -> new ArtifactException("플랜이 등록되어있지 않습니다. 관리자에게 문의해주시기 바랍니다."));

        if (!userSubscription.getStatus().equals(UserSubscription.SubscriptionStatus.ACTIVE)) {
            throw new ArtifactException("현재 산출물을 생성할 상태가 아닙니다. 관리자에게 문의해주시기 바랍니다.");
        }

        return userSubscription;
    }
}
