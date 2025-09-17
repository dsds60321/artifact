package com.gunho.artifact.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gunho.artifact.enums.ResponseCode;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private final boolean success;
    private final String message;
    private final String code;
    private final T data;
    private final Object error;
    private final long timestamp;

    private ApiResponse(boolean success, String code, String message, T data, Object error) {
        this.success = success;
        this.message = message;
        this.code = code;
        this.data = data;
        this.error = error;
        this.timestamp = System.currentTimeMillis();
    }

    private ApiResponse(boolean success, ResponseCode responseCode, T data, Object error) {
        this.success = success;
        this.message = responseCode.getMessage();
        this.code = responseCode.getCode();
        this.data = data;
        this.error = error;
        this.timestamp = System.currentTimeMillis();
    }

    // 성공 응답
    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, ResponseCode.SUCCESS.getCode(), message , null, null);
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, ResponseCode.SUCCESS , data, null);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, ResponseCode.SUCCESS.getCode(), message, data, null);
    }

    // 실패 응답
    public static <T> ApiResponse<T> failure(String message) {
        return new ApiResponse<>(false, ResponseCode.BAD_REQUEST.getCode() , message, null, null);
    }

    public static <T> ApiResponse<T> failure(T data) {
        return new ApiResponse<>(false, ResponseCode.BAD_REQUEST , data, null);
    }

    public static <T> ApiResponse<T> failure(T data, String message) {
        return new ApiResponse<>(false, ResponseCode.BAD_REQUEST.getCode(), message , data, null);
    }


    // 검증 오류 응답
    public static <T> ApiResponse<T> validationError(Object validationErrors) {
        return new ApiResponse<>(false, "VALIDATION_ERROR", "올바르지 않은 입력값이 있습니다.", null, validationErrors);
    }

    public static <T> ApiResponse<T> validationError(String message, Object validationErrors) {
        return new ApiResponse<>(false, "VALIDATION_ERROR", message, null, validationErrors);
    }

    // 시스템 오류 응답
    public static <T> ApiResponse<T> systemError(String message) {
        return new ApiResponse<>(false, "SYSTEM_ERROR", message, null, null);
    }
}
