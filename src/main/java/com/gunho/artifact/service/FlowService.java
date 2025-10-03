package com.gunho.artifact.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gunho.artifact.dto.ApiResponse;
import com.gunho.artifact.dto.FlowChartDto;
import com.gunho.artifact.entity.ApiDocsFlow;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.repository.ApiDocsFlowRepository;
import com.gunho.artifact.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FlowService {

    private final ProjectRepository projectRepository;
    private final ApiDocsFlowRepository apiDocsFlowRepository;
    private final ObjectMapper objectMapper;
    private final QuotaService quotaService;

    @Transactional
    public ApiResponse<?> saveFlow(FlowChartDto.Request request, User user) {

        try {
            projectRepository.findById(request.projectIdx())
                    .orElseThrow(() -> new ArtifactException("프로젝트를 찾을 수 없습니다."));

            String flowDataJson = objectMapper.writeValueAsString(request);

            ApiDocsFlow flow = apiDocsFlowRepository.findById(request.flowIdx())
                    .orElseThrow(() -> new ArtifactException("플로우를 찾을 수 없습니다."));

            flow.updateFlowData(request, flowDataJson, user.getId());
            return ApiResponse.success("플로우가 성공적으로 수정되었습니다.");
        } catch (Exception e) {
            log.error("플로우 저장 중 오류 발생 : {} ", e.getMessage());
            return ApiResponse.failure("플로우 저장 중 오류가 발생했습니다: ");
        }

    }

    // flow 상세 view
    public void getDetailView(Model model, Long flowIdx, User user) {
        // 권한 검증과 함께 플로우 조회
        ApiDocsFlow flow = apiDocsFlowRepository.findByIdxAndUserIdx(flowIdx, user.getIdx())
                .orElseThrow(() -> new ArtifactException("프로젝트를 찾을 수 없습니다."));

        model.addAttribute("idx", flowIdx);
        model.addAttribute("projectIdx", flow.getProject().getIdx());
        model.addAttribute("title", flow.getTitle());
        model.addAttribute("theme", flow.getTheme());
        model.addAttribute("layout", flow.getLayout());
        model.addAttribute("flowData", flow.getFlowData());
    }

    @Transactional
    public ApiResponse<?> deleteFlow(Long idx, User user) {
        ApiDocsFlow flow = apiDocsFlowRepository.findByIdxAndUserIdx(idx, user.getIdx())
                .orElseThrow(() -> {
                    log.warn("다른 유저 삭제 요청발생함 userId : {} , flowIdx : {} ", user.getId(), idx);
                    return new ArtifactException("해당 플로우에 삭제 권한이 없습니다.");
                });


        apiDocsFlowRepository.delete(flow);
        quotaService.deleteByArtifact(user.getIdx());
        return ApiResponse.success("해당 플로우 삭제에 성공했습니다.");
    }
}
