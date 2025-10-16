package com.gunho.artifact.service;

import com.gunho.artifact.dto.GuideDto;
import com.gunho.artifact.entity.Guide;
import com.gunho.artifact.enums.CodeEnums;
import com.gunho.artifact.repository.GuideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GuideService {

    private final GuideRepository guideRepository;

    public GuideDto.Response getGuideListByType(CodeEnums.GuideType type) {
        List<Guide> guides = guideRepository.findByTypeOrderByOrderNoAsc(type.name());
        return GuideDto.Response.to(guides);
    }
}
