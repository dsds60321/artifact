package com.gunho.artifact.service;

import com.gunho.artifact.entity.User;
import com.gunho.artifact.repository.UserRepository;
import com.gunho.artifact.security.ArtifactUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArtifactOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        // 디버그를 위해 모든 속성 출력
        log.info("OAuth2 User attributes: {}", oauth2User.getAttributes());

        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        // Google의 경우 'sub' 대신 'id'를 사용할 수도 있음
        String providerId = oauth2User.getAttribute("sub");
        if (providerId == null) {
            providerId = oauth2User.getAttribute("id");
        }

        // providerId가 여전히 null인 경우 에러 처리
        if (providerId == null) {
            throw new OAuth2AuthenticationException("Provider ID를 찾을 수 없습니다. 사용 가능한 속성: " + oauth2User.getAttributes().keySet());
        }

        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String picture = oauth2User.getAttribute("picture");

        log.info("Provider: {}, ProviderId: {}, Email: {}, Name: {}",
                registrationId, providerId, email, name);

        String finalProviderId = providerId;
        User user = userRepository.findByProviderAndProviderId(registrationId, providerId)
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .id(UUID.randomUUID().toString())
                            .email(email)
                            .nickname(name)
                            .provider(registrationId)
                            .providerId(finalProviderId)
                            .profileImageUrl(picture)
                            .authType(User.AuthType.OAUTH2)
                            .build();
                    newUser.setEmailVerified(true);
                    return userRepository.save(newUser);
                });

        return new ArtifactUserDetails(user, oauth2User.getAttributes());
    }

}
