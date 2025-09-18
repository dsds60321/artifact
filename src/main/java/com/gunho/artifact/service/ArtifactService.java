package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDetailDto;
import com.gunho.artifact.dto.ArtifactRelationDto;
import com.gunho.artifact.dto.ProjectDto;
import com.gunho.artifact.entity.ArtifactRelation;
import com.gunho.artifact.entity.Project;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.repository.ArtifactRelationRepository;
import com.gunho.artifact.repository.ProjectRepository;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtifactService {

    private final ArtifactRelationRepository artifactRelationRepository;

    public void getDetails(Model model, User user, long idx) {
        List<ArtifactRelation> artifactRelations = artifactRelationRepository.findAllByProjectIdx(idx);
        if (Utils.isEmpty(artifactRelations)) {
            return;
        }

        // 프로젝트 응답
        ProjectDto.Response project = ProjectDto.Response.from(artifactRelations.get(0).getProject());

        // 산출물 리스트 응답
        Map<ArtifactRelation.SubType, List<ArtifactRelationDto.Response>> groupedArtifacts =
                artifactRelations.stream()
                        .collect(Collectors.groupingBy(
                                ArtifactRelation::getSubType,
                                Collectors.mapping(
                                        ArtifactRelationDto.Response::from,
                                        Collectors.toList()
                                )
                        ));


        List<ArtifactRelationDto.Response> docs = groupedArtifacts
                .getOrDefault(ArtifactRelation.SubType.DOCS, Collections.emptyList());

        List<ArtifactRelationDto.Response> flows = groupedArtifacts
                .getOrDefault(ArtifactRelation.SubType.FLOW, Collections.emptyList());

        List<ArtifactRelationDto.Response> ppts = groupedArtifacts
                .getOrDefault(ArtifactRelation.SubType.PPT, Collections.emptyList());

        List<ArtifactRelationDto.Response> jsons = groupedArtifacts
                .getOrDefault(ArtifactRelation.SubType.JSON, Collections.emptyList());

        // 사이즈 계산
        int docsCount = docs.size();
        int flowsCount = flows.size();
        int pptsCount = ppts.size();
        int jsonsCount = jsons.size();
        int totalArtifacts = docsCount + flowsCount + pptsCount + jsonsCount;

        // 최근 수정된 산출물 (전체에서 최근 3개)
        List<ArtifactRelationDto.Response> recentArtifacts = artifactRelations.stream()
                .map(ArtifactRelationDto.Response::from)
                .sorted(Comparator.comparing(ArtifactRelationDto.Response::createdAt).reversed())
                .limit(3)
                .collect(Collectors.toList());


        // 모델에 데이터 추가
        model.addAttribute("project", project);
        model.addAttribute("docs", docs);
        model.addAttribute("flows", flows);
        model.addAttribute("recentArtifacts", recentArtifacts);
        model.addAttribute("totalArtifacts", totalArtifacts);
        model.addAttribute("docsCount", docsCount);
        model.addAttribute("flowsCount", flowsCount);

        // 추가 정보
        model.addAttribute("currentUser", user);
        model.addAttribute("projectId", idx);

        log.info("프로젝트 상세 정보 조회 완료 - projectId: {}, totalArtifacts: {}", idx, totalArtifacts);
    }


}
