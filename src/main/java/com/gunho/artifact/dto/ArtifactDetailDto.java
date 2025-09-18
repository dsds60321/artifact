package com.gunho.artifact.dto;

import java.time.LocalDateTime;

public class ArtifactDetailDto {

    public record Response(
            Long idx,
            Long projectIdx,
            String subType,
            Long artifactSubIdx,
            LocalDateTime createdAt
    ){}
}
