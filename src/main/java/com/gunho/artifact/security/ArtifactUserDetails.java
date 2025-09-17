package com.gunho.artifact.security;

import com.gunho.artifact.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;

public class ArtifactUserDetails implements UserDetails, OAuth2User {

    private User user;
    private Map<String, Object> attributes;

    public ArtifactUserDetails(User user) {
        this.user = user;
    }

    public ArtifactUserDetails(User user, Map<String, Object> attributes) {
        this.user = user;
        this.attributes = attributes;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.emptyList();
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getId();
    }

    @Override
    public boolean isAccountNonExpired() {
        return user.getStatus() != User.Status.DELETED;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getStatus() != User.Status.SUSPENDED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.getStatus() == User.Status.ACTIVE;
    }

    // OAuth2User 구현
    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public String getName() {
        return user.getId();
    }

    public User getUser() {
        return user;
    }

}
