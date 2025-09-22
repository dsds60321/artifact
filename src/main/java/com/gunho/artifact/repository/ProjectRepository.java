package com.gunho.artifact.repository;

import com.gunho.artifact.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    Project findByUser_IdxAndIdx(Long userIdx, Long idx);

    List<Project> findAllByUserIdx(Long userIdx);

    List<Project> findAllByIdx(Long idx);

    boolean existsByUser_Idx(Long idx);

    boolean existsByIdxAndUser_Idx(Long idx, Long userIdx);
}
