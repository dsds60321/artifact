package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ApiDocsDocument;
import com.gunho.artifact.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiDocsDocumentRepository extends JpaRepository<ApiDocsDocument, Long> {
    List<ApiDocsDocument> findAllByProjectIdx(long idx);
}
