package com.gunho.artifact.dto;

import com.gunho.artifact.entity.Artifact;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class ArtifactDto {

    public record Request(
            @NotBlank(message = "산출물 제목은 필수 값 입니다.")
            @Size(max = 128, message = "제목은 200자를 초과할 수 없습니다.")
            String title,
            @NotBlank(message = "버전은 필수값입니다.")
            @Size(max = 5, message = "버전은 5자를 초과할 수 없습니다.")
            String version){};

    public record DashboardResponse(
            Long idx,
            String title,
            String version,
            String updatedBy,
            String createdBy,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<ArtifactRelationDto.Response> artifacts
    ){

        public static ArtifactDto.DashboardResponse from(Artifact artifact) {
            return new ArtifactDto.DashboardResponse(artifact.getIdx(), artifact.getTitle(), artifact.getVersion(), artifact.getUpdatedBy(), artifact.getCreatedBy(),
                    artifact.getCreatedAt(), artifact.getUpdatedAt(),
                    artifact.getRelations().stream().map(ArtifactRelationDto.Response::from).collect(Collectors.toList()));
        }
    }


}