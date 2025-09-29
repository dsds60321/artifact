package com.gunho.artifact.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.DocsDto;
import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.repository.ApiDocsDocumentRepository;
import com.gunho.artifact.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocsService {

    private final ProjectRepository projectRepository;
    private final ApiDocsDocumentRepository apiDocsDocumentRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ApiResponse<?> saveDocs(DocsDto.Request request, User user) {
        try {
            projectRepository.findById(request.projectIdx())
                    .orElseThrow(() -> new ArtifactException("프로젝트를 찾을 수 없습니다."));

            ApiDocsDocument docs = apiDocsDocumentRepository.findById(request.docsIdx())
                    .orElseThrow(() -> new ArtifactException("문서를 찾을 수 없습니다."));

            String endPoints = objectMapper.writeValueAsString(request.endpoints());

            docs.updateEndPoints(request, endPoints, user.getId());
            return ApiResponse.success("문서가 성공적으로 수정되었습니다.");
        } catch (Exception e) {
            log.error("Docs save error", e);
            return ApiResponse.failure(e.getMessage());
        }
    }

    public void getDetailView(Model model, Long idx, User user) {

        ApiDocsDocument docs = apiDocsDocumentRepository.findByIdxAndUserIdx(idx, user.getIdx())
                .orElseThrow(() -> new ArtifactException("프로젝트를 찾을 수 없습니다."));

        model.addAttribute("idx", idx);
        model.addAttribute("projectIdx", docs.getProject().getIdx());
        model.addAttribute("docs", docs);
    }
}
