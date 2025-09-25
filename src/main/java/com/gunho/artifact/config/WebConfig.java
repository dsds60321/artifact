package com.gunho.artifact.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 정적 리소스 핸들러 설정
        registry.addResourceHandler("/css/**")
                .addResourceLocations("classpath:/static/css/");

        registry.addResourceHandler("/js/**")
                .addResourceLocations("classpath:/static/js/");

        registry.addResourceHandler("/flowcharts/**")
                .addResourceLocations("file:src/main/resources/static/flowcharts/")
                .setCachePeriod(0)  // 캐시 비활성화로 빠른 접근
                .resourceChain(false);  // 리소스 체인 비활성화

    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 홈페이지 기본 리다이렉트
        registry.addRedirectViewController("/", "/welcome");
    }
}
