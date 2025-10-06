package com.gunho.artifact.repository;

import com.gunho.artifact.entity.Guide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GuideRepository extends JpaRepository<Guide, Long> {
    List<Guide> findByTypeOrderByOrderNoAsc(String type);
}
