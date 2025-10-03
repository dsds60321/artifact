package com.gunho.artifact.repository;

import com.gunho.artifact.entity.BillingPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BillingPlanRepository extends JpaRepository<BillingPlan, Long> {
    Optional<BillingPlan> findByCodeIdx(Long codeIdx);
}
