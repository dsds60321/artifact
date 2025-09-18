package com.gunho.artifact.dto;

import java.time.LocalDateTime;

public class ApiFlowDto {

    public record Response(long idx, String title, String requestJson, String createdBy, String updatedBy, LocalDateTime createdAt, LocalDateTime updatedAt){}
}
