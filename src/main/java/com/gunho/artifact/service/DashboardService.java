package com.gunho.artifact.service;

import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.entity.Artifact;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.repository.ArtifactRepository;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {


    private final ArtifactRepository artifactRepository;
    // 데이터 응답
    public void getUserDatas(Model model, User user) {
        List<Artifact> artifacts = artifactRepository.findAllByUserIdx(user.getIdx());
        if (Utils.isNotEmpty(artifacts)) {
            List<ArtifactDto.DashboardResponse> dashboardResponses = artifacts.stream()
                    .map(ArtifactDto.DashboardResponse::from)
                    .toList(); // Java 16+ 불변 List 생성

            model.addAttribute("PROJECTS", dashboardResponses);
            log.info("사용자 {}의 프로젝트 {}개 로드", user.getNickname(), dashboardResponses.size()); // 변수명 수정
        } else {
            model.addAttribute("PROJECTS", Collections.emptyList()); // emptyList()가 더 적절
        }

    }

}
