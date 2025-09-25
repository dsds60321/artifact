package com.gunho.artifact.service;

import com.gunho.artifact.dto.DashboardDto;
import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.ApiDocsFlow;
import com.gunho.artifact.entity.Project;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.repository.ApiDocsDocumentRepository;
import com.gunho.artifact.repository.ApiDocsFlowRepository;
import com.gunho.artifact.repository.ProjectRepository;
import com.gunho.artifact.util.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final ApiDocsFlowRepository apiDocsFlowRepository;
    private final ApiDocsDocumentRepository apiDocsDocumentRepository;
    private final ProjectRepository projectRepository;

    // 데이터 응답
    public void getUserDatas(Model model, User user) {
        List<Project> projects = projectRepository.findAllByUserIdx(user.getIdx());
        List<DashboardDto.Response> dashboardResponses = new ArrayList<>();
        if (Utils.isNotEmpty(projects)) {
            projects.forEach(project -> {
                List<ApiDocsDocument> docs = apiDocsDocumentRepository.findAllByProjectIdx(project.getIdx());
                List<ApiDocsFlow> flows = apiDocsFlowRepository.findAllByProjectIdx(project.getIdx());
                DashboardDto.Response dashboardResponse = DashboardDto.Response.from(project, docs, flows);
                dashboardResponses.add(dashboardResponse);
            });

            model.addAttribute("PROJECTS", dashboardResponses);
        } else {
            model.addAttribute("PROJECTS", Collections.emptyList());
        }

    }
}
