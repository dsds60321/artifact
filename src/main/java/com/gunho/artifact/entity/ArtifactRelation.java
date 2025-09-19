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
@Table(name = "artifact_relation")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArtifactRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    // Artifact와의 연관관계 (Many-to-One)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", referencedColumnName = "idx")
    private Project project;

    @Column(nullable = false)
    String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "sub_type", nullable = false)
    private SubType subType;

    @Column(name = "artifact_sub_idx", nullable = false)
    private Long artifactSubIdx;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;



    public enum SubType {
        DOCS, PPT, JSON, FLOW
    }

    public static ArtifactRelation toEntity(ArtifactDto.Request request, Project project , User user) {
        return ArtifactRelation.builder()
                .project(project)
                .title(request.title())
                .subType(SubType.valueOf(request.subType().toUpperCase()))
                .artifactSubIdx(request.idx())
                .build();
    }

}
