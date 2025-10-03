package com.gunho.artifact.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder.Default;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_subscription", indexes = {
        @Index(name = "idx_user_subscription_user_status", columnList = "user_idx,status"),
        @Index(name = "idx_user_subscription_period", columnList = "user_idx,current_period_end")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_idx", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id")
    private BillingPlan billingPlan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(name = "current_period_start")
    @Builder.Default
    private LocalDateTime currentPeriodStart = LocalDateTime.now();

    @Column(name = "current_period_end")
    private LocalDateTime currentPeriodEnd;

    @Column(name = "next_billing_at")
    private LocalDateTime nextBillingAt;

    @Column(name = "canceled_at")
    @Builder.Default
    private LocalDateTime canceledAt = null;

    @Builder.Default
    @Column(name = "project_usage")
    private Integer projectUsage = 0;

    @Builder.Default
    @Column(name = "artifact_usage")
    private Integer artifactUsage = 0;

    @Builder.Default
    @Column(name = "download_usage")
    private Integer downloadUsage = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void updateStatus(SubscriptionStatus status) {
        this.status = status;
    }

    public void usageProject() {
        ++this.projectUsage;
    }

    public void usageArtifact() {
        ++this.artifactUsage;
    }

    public void deleteProject() {
        if (this.projectUsage > 0) {
            --this.projectUsage;
        }
    }

    public void deleteArtifact() {
        if (this.artifactUsage > 0) {
            --this.artifactUsage;
        }
    }

    public void usageDownload() {
        ++this.downloadUsage;
    }

    public void updatePeriod(LocalDateTime start, LocalDateTime end) {
        this.currentPeriodStart = start;
        this.currentPeriodEnd = end;
    }

    public enum SubscriptionStatus {
        ACTIVE,
        PAUSED,
        CANCELED,
        EXPIRED
    }
}
