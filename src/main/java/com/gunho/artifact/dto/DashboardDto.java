package com.gunho.artifact.dto;

import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.ApiDocsFlow;
import com.gunho.artifact.entity.Project;

import java.time.LocalDateTime;
import java.util.List;

public class DashboardDto {

    public record Response(
            Long idx,
            String title,
            String version,
            String description,
            String updatedBy,
            String createdBy,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            long docsCount,
            long flowsCount
    ) {

        public static DashboardDto.Response from(Project project, List<ApiDocsDocument> docs, List<ApiDocsFlow> flows) {
            return new DashboardDto.Response(project.getIdx(), project.getTitle(), project.getVersion(), project.getDescription(), project.getUpdatedBy(), project.getCreatedBy(), project.getCreatedAt(), project.getUpdatedAt(), docs.size(), flows.size());
        }
    }
}
