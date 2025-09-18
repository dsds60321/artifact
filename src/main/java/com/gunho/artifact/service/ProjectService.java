package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ProjectDto;
import com.gunho.artifact.entity.Project;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.repository.ProjectRepository;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;

    /**
     * 프로젝트 생성
     * @param request
     * @param user
     * @return
     */
    public ApiResponse<?> create(ProjectDto.Request request, User user) {
        Project project = Project.toEntity(request, user);
        Project savedProject = projectRepository.save(project);
        if (Utils.isEmpty(savedProject)) {
            return ApiResponse.failure("프로젝트 생성에 실패했습니다.");
        }

        return ApiResponse.success("프로젝트 생성에 성공했습니다.");
    }

    /**
     * 프로젝트 삭제
     * @param idx
     * @param user
     * @return
     */
    public ApiResponse<?> delete(long idx, User user) {
        try {

            if (!projectRepository.existsByIdxAndUser_Idx(idx, user.getIdx())) {
                log.warn("USER: {} | 권한 없는 프로젝트 삭제 시도: {}", user.getId(), idx);
                return ApiResponse.failure("삭제 권한이 없거나 존재하지 않는 프로젝트입니다.");
            }

            log.info("USER : {} | 프로젝트 삭제 : {} ", user.getId(), idx);
            projectRepository.deleteById(idx);
        } catch (Exception e) {
            log.error("프로젝트 삭제에 실패했습니다." + e.getMessage());
            return ApiResponse.failure("프로젝트 삭제에 실패했습니다");
        }

        return ApiResponse.success("해당 프로젝트가 삭제 되었습니다.");
    }
}
