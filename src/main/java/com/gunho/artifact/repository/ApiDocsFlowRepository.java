package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ApiDocsFlow;
import com.gunho.artifact.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiDocsFlowRepository extends JpaRepository<ApiDocsFlow, Long> {
    List<ApiDocsFlow> findAllByProjectIdx(long idx);
}
