package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ApiDocsDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiDocsDocumentRepository extends JpaRepository<ApiDocsDocument, Long> {
}
