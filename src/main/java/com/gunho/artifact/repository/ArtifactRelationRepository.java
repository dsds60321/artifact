package com.gunho.artifact.repository;

import com.gunho.artifact.entity.ArtifactRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ArtifactRelationRepository extends JpaRepository<ArtifactRelation, Long> {

    @Query(value = """
            SELECT relation.idx,
                   relation.project_idx,
                   relation.sub_type,
                   relation.artifact_sub_idx,
                   relation.created_at,
                   relation.updated_at,
                   COALESCE(relation.title, docs.title, flow.title) as title,
                   COALESCE(docs.created_by, flow.created_by) as created_by,
                   COALESCE(docs.updated_by, flow.updated_by) as updated_by
            FROM artifact_relation relation
                     LEFT JOIN api_docs_document docs ON relation.sub_type = 'DOCS' AND relation.artifact_sub_idx = docs.idx
                     LEFT JOIN api_docs_flow flow ON relation.sub_type = 'FLOW' AND relation.artifact_sub_idx = flow.idx
                        WHERE relation.project_idx = :projectIdx;
            """, nativeQuery = true)
    List<ArtifactRelation> findAllByProjectIdx(@Param("projectIdx") Long projectIdx);
}
