package com.gunho.artifact.entity;

import com.gunho.artifact.dto.ProjectDto;
import com.gunho.artifact.util.Utils;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Builder
@Entity
@Table(name = "project")
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    // User와의 연관관계 설정 (Many-to-One)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", referencedColumnName = "idx")
    private User user;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    private Status status = Status.ACTIVE;

    @Column(length = 50)
    private String version;

    @Column(length = 1024)
    private String description;

    @Column(name = "updated_by", nullable = false, length = 64)
    private String updatedBy = "";

    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy = "";

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ArtifactRelation> relations = new ArrayList<>();


    public static Project toEntity(ProjectDto.Request req, User user) {
        return Project.builder()
                .user(user)
                .title(req.title())
                .status(Status.ACTIVE)
                .version(req.version())
                .description(Utils.ifNullDefaultValue(req.description(), ""))
                .createdBy(user.getId())
                .build();
    }

    // 상태 변경을 위한 메서드
    public void updateStatus(Status status) {
        this.status = status;
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void updateVersion(String version) {
        this.version = version;
    }

    public enum Status {
        TERMINATED, INACTIVE, ACTIVE
    }
}