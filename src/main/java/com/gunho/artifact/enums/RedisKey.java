package com.gunho.artifact.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RedisKey {
    SIGN_VERIFY("signVerify:"),
    SIGN_VERIFIED("signVerified:");
    private final String key;

    public String getFormatKey(String replace) {
        return this.key + replace;
    }
}
