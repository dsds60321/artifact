package com.gunho.artifact.dto;

import com.gunho.artifact.entity.Guide;

import java.util.Collections;
import java.util.List;

public class GuideDto {

    public record Response(List<GuideDto.ResponseOne> guides){

        public static GuideDto.Response to(List<Guide> guides) {
            List<GuideDto.ResponseOne> responseList = guides == null
                    ? Collections.emptyList()
                    : guides.stream()
                            .map(ResponseOne::to)
                            .toList();

            return new Response(responseList);
        }
    }

    public record ResponseOne(String title, String content, int order, String imageUrl){
        public static ResponseOne to(Guide guide) {
            return new ResponseOne(guide.getTitle(), guide.getContent(), guide.getOrderNo(), guide.getAttachmentPath());
        }
    }
}
