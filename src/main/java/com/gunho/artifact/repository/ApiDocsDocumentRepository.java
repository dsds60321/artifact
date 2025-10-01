package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApiDocsDocumentRepository extends JpaRepository<ApiDocsDocument, Long> {
    List<ApiDocsDocument> findAllByProjectIdx(long idx);

    @Query("SELECT f FROM ApiDocsDocument f JOIN f.project p WHERE f.idx = :docsIdx AND p.user.idx = :userIdx")
    Optional<ApiDocsDocument> findByIdxAndUserIdx(@Param("docsIdx") Long docsIdx, @Param("userIdx") Long userIdx);
}
