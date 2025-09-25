package com.gunho.artifact.dto;

import com.gunho.artifact.entity.Project;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public class ProjectDto {

    public record Request(
            @NotBlank(message = "프로젝트 제목은 필수 값 입니다.")
            @Size(max = 128, message = "제목은 200자를 초과할 수 없습니다.")
            String title,
            @NotBlank(message = "버전은 필수값입니다.")
            @Size(max = 5, message = "버전은 5자를 초과할 수 없습니다.")
            String version,
            String description
    ){};

    public record Response(Long idx,
                           String title,
                           String version,
                           String description,
                           String updatedBy,
                           String createdBy,
                           LocalDateTime createdAt,
                           LocalDateTime updatedAt) {
        public static Response from(Project project) {
            return new Response(project.getIdx(), project.getTitle(), project.getVersion(), project.getDescription(), project.getUpdatedBy(), project.getCreatedBy(), project.getCreatedAt(), project.getUpdatedAt());
        }
    }

}