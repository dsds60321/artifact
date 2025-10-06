package com.gunho.artifact.repository;

import com.gunho.artifact.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TemplateRepository extends JpaRepository<Template, Long> {
    Template findByName(String name);
}
