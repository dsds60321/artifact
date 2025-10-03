package com.gunho.artifact.service;

import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.ArtifactDto;
import com.gunho.artifact.dto.ProjectDto;
import com.gunho.artifact.entity.*;
import com.gunho.artifact.repository.ApiDocsDocumentRepository;
import com.gunho.artifact.repository.ApiDocsFlowRepository;
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

    private final QuotaService quotaService;
    private final ProjectRepository projectRepository;
    private final ApiDocsFlowRepository apiDocsFlowRepository;
    private final ApiDocsDocumentRepository apiDocsDocumentRepository;

    public void getDetails(Model model, User user, long idx) {
        Project project = projectRepository.findByUser_IdxAndIdx(user.getIdx(), idx);
        if (Utils.isEmpty(project)) {
            throw new RuntimeException("프로젝트가 없음 오류 페이지 만들어야해");
        }

        List<ApiDocsFlow> apiDocsFlows = apiDocsFlowRepository.findAllByProjectIdx(idx);
        List<ApiDocsDocument> apiDocsDocuments = apiDocsDocumentRepository.findAllByProjectIdx(idx);

        ProjectDto.Response projectResponse = ProjectDto.Response.from(project);

        List<ArtifactDto.DetailResponse> flows = apiDocsFlows.stream().map(ArtifactDto.DetailResponse::from).toList();
        List<ArtifactDto.DetailResponse> docs = apiDocsDocuments.stream().map(ArtifactDto.DetailResponse::from).toList();

        List<ArtifactDto.DetailResponse> fullArtifacts = new ArrayList<>(flows);
        fullArtifacts.addAll(docs);

        List<ArtifactDto.DetailResponse> recentArtifacts = fullArtifacts.stream()
                .sorted(Comparator.comparing(ArtifactDto.DetailResponse::createdAt).reversed())
                .limit(3)
                .collect(Collectors.toList());


        // 모델에 데이터 추가
        model.addAttribute("project", projectResponse);
        model.addAttribute("docs", docs);
        model.addAttribute("flows", flows);

        model.addAttribute("recentArtifacts", recentArtifacts);
        model.addAttribute("totalArtifacts", docs.size() + flows.size());

        model.addAttribute("docsCount", docs.size());
        model.addAttribute("flowsCount", flows.size());

        // 추가 정보
        model.addAttribute("currentUser", user);
        model.addAttribute("projectId", idx);
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

        // 유저 사용량 추가
        quotaService.consumeByArtifact(user.getIdx());

        // docs
        if (subType.equalsIgnoreCase("docs")) {
            ApiDocsDocument docs = ApiDocsDocument.toEntity(request, projectOpt.get(), user);
            ApiDocsDocument saved = apiDocsDocumentRepository.save(docs);
        // flow
        } else {
            ApiDocsFlow flow = ApiDocsFlow.toEntity(request, projectOpt.get(), user);
            ApiDocsFlow saved = apiDocsFlowRepository.save(flow);
        }

        return ApiResponse.success("산출물 등록에 성공했습니다.");
    }
}
