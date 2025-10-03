package com.gunho.artifact.repository;

import com.gunho.artifact.entity.Code;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CodeRepository extends JpaRepository<Code, Long> {
    Optional<Code> findByCodeAndCodeType(String code, String codeType);
}
