package com.gunho.artifact.dto;

import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.ApiDocsFlow;
import com.gunho.artifact.enums.SubType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class ArtifactDto {

    public record Request(long idx,
                          @NotNull(message = "프로젝트를 찾을 수 없습니다.")
                          long projectIdx,
                          @NotNull(message = "제목은 필수 값 입니다.")
                          String title,
                          @NotNull(message = "산출물 종류는 필수 값 입니다.")
                          String subType){}

    public record DetailResponse(Long projectIdx,
                                 Long artifactSubIdx,
                                 String title,
                                 String subType,
                                 LocalDateTime createdAt,
                                 LocalDateTime updatedAt) {
        public static DetailResponse from(ApiDocsFlow flow) {
            return new DetailResponse(flow.getProject().getIdx(), flow.getIdx(), flow.getTitle(), SubType.FLOW.name(), flow.getCreatedAt(), flow.getUpdatedAt());
        }
        public static DetailResponse from(ApiDocsDocument docsDocument) {
            return new DetailResponse(docsDocument.getProject().getIdx(), docsDocument.getIdx(), docsDocument.getTitle(), SubType.DOCS.name(), docsDocument.getCreatedAt(), docsDocument.getUpdatedAt());
        }
    }
}
