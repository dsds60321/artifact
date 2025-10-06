package com.gunho.artifact.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.mail.MailProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
@EnableConfigurationProperties(MailProperties.class)
@RequiredArgsConstructor
public class EmailConfig {

    private final MailProperties mailProperties;

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(mailProperties.getHost());
        mailSender.setPort(mailProperties.getPort());
        mailSender.setUsername(mailProperties.getUsername());
        mailSender.setPassword(mailProperties.getPassword());

        if (mailProperties.getProtocol() != null) {
            mailSender.setProtocol(mailProperties.getProtocol());
        }
        if (mailProperties.getDefaultEncoding() != null) {
            mailSender.setDefaultEncoding(mailProperties.getDefaultEncoding().name());
        }

        Properties javaMailProperties = mailSender.getJavaMailProperties();
        javaMailProperties.putIfAbsent("mail.transport.protocol", mailProperties.getProtocol() != null ? mailProperties.getProtocol() : "smtp");
        javaMailProperties.putIfAbsent("mail.smtp.auth", "true");
        javaMailProperties.putIfAbsent("mail.smtp.starttls.enable", "true");
        javaMailProperties.putIfAbsent("mail.debug", "false");
        mailProperties.getProperties().forEach(javaMailProperties::put);

        return mailSender;
    }
}
