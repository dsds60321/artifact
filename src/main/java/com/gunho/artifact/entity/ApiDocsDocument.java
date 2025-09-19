package com.gunho.artifact.entity;

import com.gunho.artifact.dto.ArtifactDto;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "api_docs_document")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiDocsDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    @Column(nullable = false)
    private String title;

    @Builder.Default
    @Column(name = "request_json", columnDefinition = "TEXT")
    private String requestJson = "{}";

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "updated_by", length = 64)
    private String updatedBy = "";

    @Column(name = "created_by", length = 64)
    private String createdBy = "";

    public static ApiDocsDocument toEntity(ArtifactDto.Request req, User user) {
        return ApiDocsDocument.builder()
                .title(req.title())
                .createdBy(user.getId())
                .build();
    }
}
