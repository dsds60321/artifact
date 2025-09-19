package com.gunho.artifact.dto;

import jakarta.validation.constraints.NotNull;

public class ArtifactDto {

    public record Request(long idx,
                          @NotNull(message = "프로젝트를 찾을 수 없습니다.")
                          long projectIdx,
                          @NotNull(message = "제목은 필수 값 입니다.")
                          String title,
                          @NotNull(message = "산출물 종류는 필수 값 입니다.")
                          String subType){


        public static Request withIdx(ArtifactDto.Request req, long idx) {
            return new Request(idx, req.projectIdx, req.title, req.subType());
        }


    }
}
