package com.gunho.artifact.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

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

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String flowData;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
