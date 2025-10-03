package com.gunho.artifact.entity;

import com.gunho.artifact.enums.UserRole;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    @Column(unique = true, nullable = false)
    private String id;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.GUEST;

    private String nickname;

    @Enumerated(EnumType.STRING)
    private Gender gender = Gender.OTHER;

    private String bio;

    @Enumerated(EnumType.STRING)
    private Status status = Status.ACTIVE;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "phone_verified")
    private Boolean phoneVerified = false;

    @Column(name = "tryCnt")
    private Integer tryCnt = 0;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // OAuth2 관련 필드
    private String provider;

    @Column(name = "provider_id")
    private String providerId;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_type")
    private AuthType authType = AuthType.LOCAL;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Artifact와의 연관관계 설정 (One-to-Many)
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Project> projects = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<UserSubscription> subscriptions = new ArrayList<>();


    @Builder
    public User(String id, String email, String phone, String passwordHash,
                String nickname, Gender gender, String bio, String provider,
                String providerId, String profileImageUrl, AuthType authType) {
        this.id = id;
        this.email = email;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
        this.gender = gender;
        this.bio = bio;
        this.provider = provider;
        this.providerId = providerId;
        this.profileImageUrl = profileImageUrl;
        this.authType = authType;
    }

    public void setEmailVerified(boolean isVerified) {
        this.emailVerified = isVerified;
    }

    public enum Gender {
        MALE, FEMALE, OTHER
    }

    public enum Status {
        ACTIVE, INACTIVE, SUSPENDED, DELETED
    }

    public enum AuthType {
        LOCAL, OAUTH2
    }
}
