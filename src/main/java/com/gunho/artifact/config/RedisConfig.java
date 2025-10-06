package com.gunho.artifact.config;

import io.lettuce.core.api.StatefulConnection;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettucePoolingClientConfiguration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.util.StringUtils;

import java.time.Duration;

@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String host;

    @Value("${spring.data.redis.port:6379}")
    private int port;

    @Value("${spring.data.redis.password:}")
    private String password;

    @Value("${spring.data.redis.database:0}")
    private int database;

    @Value("${spring.data.redis.timeout:60000}")
    private long timeoutMillis;

    @Value("${spring.data.redis.ssl:false}")
    private boolean useSsl;

    @Value("${spring.data.redis.lettuce.shutdown-timeout:100ms}")
    private Duration shutdownTimeout;

    @Value("${spring.data.redis.lettuce.pool.max-active:8}")
    private int poolMaxActive;

    @Value("${spring.data.redis.lettuce.pool.max-idle:8}")
    private int poolMaxIdle;

    @Value("${spring.data.redis.lettuce.pool.min-idle:0}")
    private int poolMinIdle;

    @Value("${spring.data.redis.lettuce.pool.max-wait:-1ms}")
    private Duration poolMaxWait;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration standaloneConfiguration = new RedisStandaloneConfiguration();
        standaloneConfiguration.setHostName(host);
        standaloneConfiguration.setPort(port);
        standaloneConfiguration.setDatabase(database);

        if (StringUtils.hasText(password)) {
            standaloneConfiguration.setPassword(password);
        }

        LettucePoolingClientConfiguration.LettucePoolingClientConfigurationBuilder builder = LettucePoolingClientConfiguration.builder()
                .commandTimeout(Duration.ofMillis(timeoutMillis))
                .shutdownTimeout(shutdownTimeout)
                .poolConfig(createPoolConfig());

        if (useSsl) {
            builder.useSsl();
        }

        return new LettuceConnectionFactory(standaloneConfiguration, builder.build());
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);

        GenericJackson2JsonRedisSerializer valueSerializer = new GenericJackson2JsonRedisSerializer();
        redisTemplate.setKeySerializer(RedisSerializer.string());
        redisTemplate.setValueSerializer(valueSerializer);
        redisTemplate.setHashKeySerializer(RedisSerializer.string());
        redisTemplate.setHashValueSerializer(valueSerializer);

        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }

    private GenericObjectPoolConfig<StatefulConnection<?, ?>> createPoolConfig() {
        GenericObjectPoolConfig<StatefulConnection<?, ?>> poolConfig = new GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(poolMaxActive);
        poolConfig.setMaxIdle(poolMaxIdle);
        poolConfig.setMinIdle(poolMinIdle);
        if (poolMaxWait.isNegative()) {
            poolConfig.setMaxWait(Duration.ofMillis(-1));
        } else {
            poolConfig.setMaxWait(poolMaxWait);
        }
        return poolConfig;
    }
}
