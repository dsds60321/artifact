package com.gunho.artifact.config;

import com.gunho.artifact.entity.BillingPlan;
import com.gunho.artifact.entity.Code;
import com.gunho.artifact.repository.BillingPlanRepository;
import com.gunho.artifact.repository.CodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import static com.gunho.artifact.enums.CodeEnums.*;

@Component
@Profile({ "local", "dev"})
@RequiredArgsConstructor
@Slf4j
@Transactional
public class Seeder implements CommandLineRunner {

    private final CodeRepository codeRepository;
    private final BillingPlanRepository billingPlanRepository;

    // 기본 데이터 코드성 , billing_plan
    @Override
    public void run(String... args) throws Exception {
        log.info("Seeder Start");

        log.info("Code Insert Start");

        Code code = codeRepository.findByCodeAndCodeType(BillingCode.FREE.getCode(), BillingCode.FREE.getCodeType())
                .orElseGet(() -> {
                    log.info("FREE Code Insert");
                    return codeRepository.save(Code.builder()
                            .codeType(BillingCode.FREE.getCodeType())
                            .code(BillingCode.FREE.getCode())
                            .name(BillingCode.FREE.getName())
                            .description("무료 구독 타입")
                            .active(true)
                            .build());
                });
        log.info("Code Insert End");


        log.info("Billing_plan Insert Start");
        BillingPlan plan = BillingPlan.builder()
                .name(BillingCode.FREE.getName())
                .billingCycle(BillingPlan.BillingCycle.WEEKLY)
                .code(code)
                .projectLimit(3)
                .artifactLimit(9)
                .downloadLimit(40)
                .price(java.math.BigDecimal.ZERO)
                .build();

        billingPlanRepository.findByCodeIdx(code.getIdx())
                .ifPresentOrElse(existPlan -> log.info("FREE Plan Exist"), () -> {
                    log.info("FREE Plan Insert");
                    billingPlanRepository.save(plan);
                });
        log.info("Billing_plan Insert End");
    }

}
