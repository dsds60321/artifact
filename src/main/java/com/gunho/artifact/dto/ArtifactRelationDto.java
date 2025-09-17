package com.gunho.artifact.dto;

import com.gunho.artifact.entity.ArtifactRelation;

import java.time.LocalDateTime;

public class ArtifactRelationDto {

    public record Response(
            Long artifactIdx,
            Long artifactSubIdx,
            String title,
            String subType,
            LocalDateTime createdAt
    ) {
        public static ArtifactRelationDto.Response from(ArtifactRelation artifactRelation) {
            return new ArtifactRelationDto.Response(artifactRelation.getArtifactIdx(), artifactRelation.getArtifactSubIdx(), artifactRelation.getTitle(), artifactRelation.getSubType().name(), artifactRelation.getCreatedAt());
        }
    }

}
