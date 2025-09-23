package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ApiDocsFlow;
import com.gunho.artifact.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public interface ApiDocsFlowRepository extends JpaRepository<ApiDocsFlow, Long> {
    List<ApiDocsFlow> findAllByProjectIdx(long idx);

    @Query("SELECT f FROM ApiDocsFlow f JOIN f.project p WHERE f.idx = :flowIdx AND p.user.idx = :userIdx")
    Optional<ApiDocsFlow> findByIdxAndUserIdx(@Param("flowIdx") Long flowIdx, @Param("userIdx") Long userIdx);

}
