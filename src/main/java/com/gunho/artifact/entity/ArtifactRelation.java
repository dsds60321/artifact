package com.gunho.artifact.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

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

    @Column(name = "artifact_idx", nullable = false)
    private Long artifactIdx;

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

    // Artifact와의 연관관계 (Many-to-One)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artifact_idx", referencedColumnName = "idx", insertable = false, updatable = false)
    private Artifact artifact;

    public enum SubType {
        DOCS, PPT, JSON, FLOW
    }

}
