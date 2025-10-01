package com.gunho.artifact.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "artifact_file")
public class ArtifactFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", referencedColumnName = "idx")
    private User user;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "stored_name", nullable = false, length = 255)
    private String storedName;

    @Column(name = "relative_path", nullable = false, length = 255)
    private String relativePath;

    @Column(name = "content_type", length = 128)
    private String contentType;

    @Column(name = "size")
    private Long size;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public static ArtifactFile toEntity(User user, String originalName, String storedName, String path, String contentType, Long size) {
        return ArtifactFile.builder().
                user(user)
                .originalName(originalName)
                .storedName(storedName)
                .relativePath(path)
                .contentType(contentType)
                .size(size)
                .build();

    }

    public void updateMetadata(String originalName, String storedName, String path, String contentType, Long size) {
        this.originalName = originalName;
        this.storedName = storedName;
        this.relativePath = path;
        this.contentType = contentType;
        this.size = size;
    }

}
