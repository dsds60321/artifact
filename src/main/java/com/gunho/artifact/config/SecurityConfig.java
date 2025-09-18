package com.gunho.artifact.config;

import com.gunho.artifact.service.ArtifactOAuth2UserService;
import com.gunho.artifact.service.ArtifactUserDetailService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final ArtifactOAuth2UserService artifactOAuth2UserService;
    private final ArtifactUserDetailService artifactUserDetailService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/welcome/**", "/sign/**", "/css/**", "/js/**", "/images/**").permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((req, res, authException) -> {
                            // AJAX 요청인지 확인
                            String contentType = req.getContentType();
                            String requestedWith = req.getHeader("X-Requested-With");

                            if ("XMLHttpRequest".equals(requestedWith) ||
                                    (contentType != null && contentType.contains("application/json"))) {
                                // AJAX 요청이면 401 상태 코드 반환
                                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                res.setContentType("application/json");
                                res.getWriter().write("{\"message\":\"Authentication required\"}");
                            } else {
                                // 일반 요청이면 로그인 페이지로 리다이렉트
                                res.sendRedirect("/welcome");
                            }
                        }))
                .formLogin(form -> form
                        .loginPage("/sign/in")
                        .loginProcessingUrl("sign/in")
                        .usernameParameter("id")
                        .passwordParameter("password")
                        .defaultSuccessUrl("/project", true)
                        .failureUrl("/login?error=true")
                        .permitAll()
                )
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/sign/in")
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(artifactOAuth2UserService)
                        )
                        .defaultSuccessUrl("/project", true)
                        .failureUrl("/login?error=true")
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/welcome")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                )
                .userDetailsService(artifactUserDetailService);

        return http.build();
    }

}
