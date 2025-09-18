package com.gunho.artifact.dto;

import com.gunho.artifact.entity.ArtifactRelation;

import java.time.LocalDateTime;

public class ArtifactRelationDto {

    public record Response(
            Long projectIdx,
            Long artifactSubIdx,
            String title,
            String subType,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static ArtifactRelationDto.Response from(ArtifactRelation artifactRelation) {
            return new ArtifactRelationDto.Response(artifactRelation.getProjectIdx(), artifactRelation.getArtifactSubIdx(), artifactRelation.getTitle(), artifactRelation.getSubType().name(), artifactRelation.getCreatedAt(), artifactRelation.getUpdatedAt());
        }
    }

}
