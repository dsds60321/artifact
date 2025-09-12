package com.gunho.artifact.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.sl.usermodel.PictureData;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFPictureData;
import org.apache.poi.xslf.usermodel.XSLFPictureShape;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import com.gunho.artifact.dto.PptDeckRequest;
import com.gunho.artifact.model.FileArtifact;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class PptDeckGenerator {

    public FileArtifact generate(PptDeckRequest req) throws Exception {
        try (XMLSlideShow ppt = new XMLSlideShow()) {
            // Title slide
            var titleSlide = ppt.createSlide();
            XSLFTextBox tb = titleSlide.createTextBox();
            tb.setAnchor(new Rectangle(40, 40, 640, 80));
            tb.addNewTextParagraph().addNewTextRun().setText(req.getTitle());

            if (req.getSections() != null) {
                for (var s : req.getSections()) {
                    var slide = ppt.createSlide();

                    XSLFTextBox head = slide.createTextBox();
                    head.setAnchor(new Rectangle(40, 20, 640, 50));
                    head.addNewTextParagraph().addNewTextRun().setText(s.getH1() == null ? "" : s.getH1());

                    if (s.getMarkdown() != null && !s.getMarkdown().isBlank()) {
                        XSLFTextBox body = slide.createTextBox();
                        body.setAnchor(new Rectangle(40, 80, 640, 360));
                        body.addNewTextParagraph().addNewTextRun().setText(s.getMarkdown());
                    }

                    if (s.getImages() != null) {
                        for (String url : s.getImages()) {
                            try (InputStream is = new URL(url).openStream()) {
                                byte[] data = is.readAllBytes();
                                XSLFPictureData pd = ppt.addPicture(data, PictureData.PictureType.PNG);
                                XSLFPictureShape pic = slide.createPicture(pd);
                                pic.setAnchor(new Rectangle(60, 120, 600, 320));
                            } catch (Exception ignore) {
                                // 이미지 로드 실패 시 건너뜀
                            }
                        }
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ppt.write(out);
            String base64 = Base64.getEncoder().encodeToString(out.toByteArray());
            return new FileArtifact("deck.pptx",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    base64);
        }
    }
}
