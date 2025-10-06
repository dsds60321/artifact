package com.gunho.artifact.enums;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CodeEnums {

    @Getter
    @AllArgsConstructor
    public enum BillingCode {

        FREE("PLAN_TYPE", "FREE","무료 플랜"),
        PREMIUM("PLAN_TYPE", "PREMIUM","프리미엄 플랜");

        private final String codeType;
        private final String code;
        private final String name;
    }

    @Getter
    @AllArgsConstructor
    public enum EmailType {
        PLAN_UPDATE_REQUEST,
        SIGN_VERIFY
    }
}
