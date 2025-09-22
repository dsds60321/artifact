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
@Table(name = "api_docs_flow")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiDocsFlow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", referencedColumnName = "idx")
    private Project project;

    @Column(nullable = false)
    private String title;

    @Column(name = "layout")
    private String layout;

    @Column(columnDefinition = "TEXT")
    private String flowData;

    @Builder.Default
    @Column(name = "updated_by",  length = 64)
    private String updatedBy = "";

    @Column(name = "created_by",  length = 64)
    private String createdBy = "";

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public static ApiDocsFlow toEntity(ArtifactDto.Request req, Project project, User user) {
        return ApiDocsFlow.builder()
                .project(project)
                .title(req.title())
                .createdBy(user.getId())
                .build();
    }
}
