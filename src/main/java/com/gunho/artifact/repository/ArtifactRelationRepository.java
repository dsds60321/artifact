package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ArtifactRelation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtifactRelationRepository extends JpaRepository<ArtifactRelation, Long> {

}
