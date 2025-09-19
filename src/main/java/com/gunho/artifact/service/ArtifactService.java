package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.dto.ArtifactRelationDto;
import com.gunho.artifact.dto.ProjectDto;
import com.gunho.artifact.entity.*;
import com.gunho.artifact.repository.ApiDocsDocumentRepository;
import com.gunho.artifact.repository.ApiDocsFlowRepository;
import com.gunho.artifact.repository.ArtifactRelationRepository;
import com.gunho.artifact.repository.ProjectRepository;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtifactService {

    private final ProjectRepository projectRepository;
    private final ArtifactRelationRepository artifactRelationRepository;
    private final ApiDocsFlowRepository apiDocsFlowRepository;
    private final ApiDocsDocumentRepository apiDocsDocumentRepository;

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


    @Transactional
    public ApiResponse<?> create(ArtifactDto.Request request, User user) {
        String subType = request.subType();
        if (!List.of("docs", "flow").contains(subType.toLowerCase())) {
            return ApiResponse.failure("지원하지 않은 산출물 타입입니다.");
        }

        Optional<Project> projectOpt = projectRepository.findById(request.projectIdx());
        if (projectOpt.isEmpty()) {
            return ApiResponse.failure("존재하지 않는 프로젝트입니다.");
        }

        long artifactSubIdx = 0L;

        // docs
        if (subType.equalsIgnoreCase("docs")) {
            ApiDocsDocument docs = ApiDocsDocument.toEntity(request, user);
            ApiDocsDocument saved = apiDocsDocumentRepository.save(docs);
            artifactSubIdx = saved.getIdx();
            // flow
        } else {
            ApiDocsFlow flow = ApiDocsFlow.toEntity(request, user);
            ApiDocsFlow saved = apiDocsFlowRepository.save(flow);
            artifactSubIdx = saved.getIdx();
        }


        ArtifactDto.Request requestWithIdx = ArtifactDto.Request.withIdx(request, artifactSubIdx);
        ArtifactRelation relation = ArtifactRelation.toEntity(requestWithIdx,  projectOpt.get(), user);
        ArtifactRelation saved = artifactRelationRepository.save(relation);
        return ApiResponse.success("산출물 등록에 성공했습니다.");
    }
}
