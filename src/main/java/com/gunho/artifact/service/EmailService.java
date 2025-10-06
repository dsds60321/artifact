package com.gunho.artifact.service;

import com.gunho.artifact.dto.EmailDto;
import com.gunho.artifact.entity.Template;
import com.gunho.artifact.entity.User;
import com.gunho.artifact.enums.CodeEnums;
import com.gunho.artifact.exception.ArtifactException;
import com.gunho.artifact.repository.TemplateRepository;
import com.gunho.artifact.util.Utils;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.mail.MailProperties;
import org.springframework.core.io.InputStreamSource;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final TemplateRepository templateRepository;
    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    public void sendPlan(EmailDto.RequestPlan request, User user) {
        try {
            Template template = templateRepository.findByName(CodeEnums.EmailType.PLAN_UPDATE_REQUEST.name());
            String subject = template.getSubject().formatted(user.getId(), request.plan());
            String content = template.getContent();
            content = content.replace("{{requestor}}", user.getId())
                    .replace("{{requestorName}}", user.getNickname())
                    .replace("{{plan}}", request.plan())
                    .replace("{{price}}", request.price())
                    .replace("{{from}}", request.from())
                    .replace("{{createdAt}}", LocalDateTime.now().toString())
                    .replace("{{content}}", request.content());
            sendHtml(resolveFromAddress(), subject, content);
        } catch (Exception e) {
            log.error("Email send error", e);
            throw new ArtifactException("이메일 전송에 실패 했습니다.");
        }
    }

    public void sendVerifyCode(EmailDto.RequestVerify request, String randomCode) {
        try {
            Template template = templateRepository.findByName(CodeEnums.EmailType.SIGN_VERIFY.name());
            String subject = template.getSubject();
            String content = template.getContent();
            content = Utils.MsgUtil.getMessage(content, List.of(request.nickName(), randomCode));
            sendHtml(request.email(), subject, content);
        } catch (Exception e) {
            log.error("Email send error", e);
            throw new ArtifactException("이메일 발송에 실패 했습니다.");
        }
    }

    public void sendText(String to, String subject, String textBody) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(resolveFromAddress());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(textBody);

        mailSender.send(message);
        log.debug("텍스트 이메일 전송 완료: recipient={}", to);
    }

    public void sendHtml(String to, String subject, String htmlBody) {
        sendHtml(to, subject, htmlBody, Collections.emptyMap());
    }

    public void sendHtml(String to, String subject, String htmlBody, Map<String, InputStreamSource> attachments) {
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        boolean multipart = attachments != null && !attachments.isEmpty();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, multipart, determineEncoding());
            helper.setFrom(resolveFromAddress());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            if (multipart) {
                for (Map.Entry<String, InputStreamSource> entry : attachments.entrySet()) {
                    helper.addAttachment(entry.getKey(), entry.getValue());
                }
            }

            mailSender.send(mimeMessage);
            log.debug("HTML 이메일 전송 완료: recipient={}, attachments={}", to, attachments == null ? 0 : attachments.size());
        } catch (MessagingException ex) {
            throw new MailPreparationException("이메일 메시지를 구성하는 과정에서 오류가 발생했습니다.", ex);
        }
    }

    private String resolveFromAddress() {
        String configuredFrom = mailProperties.getProperties().get("mail.from");
        if (StringUtils.hasText(configuredFrom)) {
            return configuredFrom;
        }

        if (StringUtils.hasText(mailProperties.getUsername())) {
            return mailProperties.getUsername();
        }

        return "no-reply@artifact.local";
    }

    private String determineEncoding() {
        Charset defaultEncoding = mailProperties.getDefaultEncoding();
        return defaultEncoding != null ? defaultEncoding.name() : StandardCharsets.UTF_8.name();
    }
}
