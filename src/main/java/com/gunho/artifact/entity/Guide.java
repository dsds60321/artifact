package com.gunho.artifact.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Getter
@Table(name = "guides")
public class Guide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    @Builder.Default
    @Column(nullable = false, length = 5)
    private String version = "1.0";

    @Column(nullable = false, length = 32)
    private String type;

    @Builder.Default
    @Column(name = "order_no", nullable = false)
    private int orderNo = 1;

    @Column(nullable = false, length = 64)
    private String title;


    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(length = 255)
    private String attachmentPath;

    @Column(length = 255)
    private String description;

    private Boolean status = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
