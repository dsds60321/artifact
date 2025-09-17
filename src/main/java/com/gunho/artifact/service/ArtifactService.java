package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.entity.Artifact;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.repository.ArtifactRepository;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtifactService {

    private final ArtifactRepository artifactRepository;

    public ApiResponse<?> createArtifact(User user,ArtifactDto.Request req) {
        Artifact artifact = Artifact.toEntity(req);
        Artifact savedArtifact = artifactRepository.save(artifact);

        if (Utils.isEmpty(savedArtifact)) {
            return ApiResponse.failure("프로젝트 생성에 실패했습니다.");
        }
        return ApiResponse.success("프로젝트 생성에 성공했습니다.");
    }
}
