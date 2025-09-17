package com.gunho.artifact.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 성공 응답 0000 ~ 0100
 * 클라이언트 오류 0400 ~ 00499
 * 서버 오류 0500 ~ 0599
 */
@Getter
@RequiredArgsConstructor
public enum ResponseCode {

    // 성공
    SUCCESS("200", "요청이 성공적으로 처리되었습니다."),
    CREATED("201", "리소스가 성공적으로 생성되었습니다."),

    // 클라이언트 오류
    BAD_REQUEST("400", "잘못된 요청입니다."),
    UNAUTHORIZED("401", "인증이 필요합니다."),
    FORBIDDEN("403", "접근이 거부되었습니다."),
    NOT_FOUND( "404", "요청한 리소스를 찾을 수 없습니다."),
    VALIDATION_ERROR( "406", "입력값 검증에 실패했습니다."),

    // 비즈니스 오류 (인증 관련)
    DUPLICATE_ID("DUPLICATE_ID", "이미 존재하는 아이디입니다."),
    INVALID_CODE("INVALID_CODE", "잘못된 인증 코드입니다."),
    CODE_EXPIRED( "CODE_EXPIRED", "인증 코드가 만료되었습니다."),
    REDIS_ERROR("REDIS_ERROR", "Redis 저장소 오류가 발생했습니다."),

    // 서버 오류
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다."),
    EMAIL_SEND_FAILED("EMAIL_SEND_FAILED", "이메일 전송에 실패했습니다."),
    DATABASE_ERROR("DATABASE_ERROR", "데이터베이스 오류가 발생했습니다."),

    // 세션 관련 오류
    SESSION_EXPIRED( "SESSION_EXPIRED", "세션이 만료되었습니다."),
    INVALID_SESSION( "INVALID_SESSION", "유효하지 않은 세션입니다."),
    SESSION_CREATE_FAILED("SESSION_CREATE_FAILED", "세션 생성에 실패했습니다.");

    private final String code;
    private final String message;


}
