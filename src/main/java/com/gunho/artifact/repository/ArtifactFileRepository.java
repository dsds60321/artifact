package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ArtifactFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArtifactFileRepository extends JpaRepository<ArtifactFile, Long> {
}
